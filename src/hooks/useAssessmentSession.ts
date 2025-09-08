import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type SessionState = 'not_started' | 'proctoring_setup' | 'proctoring_check' | 'in_progress' | 'paused' | 'submitted' | 'evaluated';

interface UseAssessmentSessionProps {
  assessmentId: string;
  participantId: string;
}

import { useStableRealtime } from '@/hooks/useStableRealtime';

export const useAssessmentSession = ({ assessmentId, participantId }: UseAssessmentSessionProps) => {
  const { toast } = useToast();
  const [sessionState, setSessionState] = useState<SessionState>('not_started');
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [proctoringActive, setProctoringActive] = useState<boolean>(false);
  const [securityViolations, setSecurityViolations] = useState<any[]>([]);

  // Use stable realtime connections instead of multiple subscriptions
  const instanceRealtime = useStableRealtime({
    table: 'assessment_instances',
    filter: `assessment_id=eq.${assessmentId} AND participant_id=eq.${participantId}`,
    onUpdate: (payload) => {
      console.log('Assessment instance change:', payload);
      if (payload.new) {
        const instance = payload.new as any;
        setSessionState(instance.session_state as SessionState);
        setTimeRemaining(instance.time_remaining_seconds || 0);
        setCurrentQuestionIndex(instance.current_question_index || 0);
        setSecurityViolations(Array.isArray(instance.proctoring_violations) ? instance.proctoring_violations : []);
      }
    }
  });

  const proctoringRealtime = useStableRealtime({
    table: 'proctoring_sessions',
    filter: `participant_id=eq.${participantId}`,
    onUpdate: (payload) => {
      console.log('Proctoring session change:', payload);
      if (payload.new) {
        const session = payload.new as any;
        setProctoringActive(session.status === 'active');
      }
    }
  });

  // Auto-save session state periodically
  const saveSessionState = useCallback(async (updates: {
    session_state?: SessionState;
    time_remaining_seconds?: number;
    current_question_index?: number;
    proctoring_violations?: any[];
  }) => {
    try {
      const { error } = await supabase
        .from('assessment_instances')
        .update(updates)
        .eq('assessment_id', assessmentId)
        .eq('participant_id', participantId);

      if (error) {
        console.error('Error saving session state:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error saving session state:', error);
      return false;
    }
  }, [assessmentId, participantId]);

  // Update session state
  const updateSessionState = useCallback(async (newState: SessionState) => {
    const success = await saveSessionState({ session_state: newState });
    if (success) {
      setSessionState(newState);
    }
    return success;
  }, [saveSessionState]);

  // Update timer
  const updateTimeRemaining = useCallback(async (seconds: number) => {
    const success = await saveSessionState({ time_remaining_seconds: seconds });
    if (success) {
      setTimeRemaining(seconds);
    }
    return success;
  }, [saveSessionState]);

  // Navigate to question
  const navigateToQuestion = useCallback(async (questionIndex: number) => {
    const success = await saveSessionState({ current_question_index: questionIndex });
    if (success) {
      setCurrentQuestionIndex(questionIndex);
    }
    return success;
  }, [saveSessionState]);

  // Add security violation
  const addSecurityViolation = useCallback(async (violation: any) => {
    const newViolations = [...securityViolations, violation];
    const updates: any = { proctoring_violations: newViolations };
    
    // Auto-pause for critical violations
    if (violation.severity === 'critical') {
      updates.session_state = 'paused';
      toast({
        title: "Critical Security Event",
        description: violation.description,
        variant: "destructive"
      });
    }

    const success = await saveSessionState(updates);
    if (success) {
      setSecurityViolations(newViolations);
      if (violation.severity === 'critical') {
        setSessionState('paused');
      }
    }
    return success;
  }, [securityViolations, saveSessionState, toast]);

  // Create or resume session
  const createSession = useCallback(async (assessmentDuration: number) => {
    try {
      const { data: existingInstance } = await supabase
        .from('assessment_instances')
        .select('*')
        .eq('assessment_id', assessmentId)
        .eq('participant_id', participantId)
        .single();

      if (existingInstance && existingInstance.status === 'in_progress') {
        // Resume existing session
        setSessionState(existingInstance.session_state as SessionState);
        setTimeRemaining(existingInstance.time_remaining_seconds || 0);
        setCurrentQuestionIndex(existingInstance.current_question_index || 0);
        setSecurityViolations(Array.isArray(existingInstance.proctoring_violations) ? existingInstance.proctoring_violations : []);
        return existingInstance;
      } else {
        // Create new session
        const { data: newInstance, error } = await supabase
          .from('assessment_instances')
          .insert({
            assessment_id: assessmentId,
            participant_id: participantId,
            session_state: 'not_started',
            time_remaining_seconds: assessmentDuration * 60,
            current_question_index: 0,
            status: 'in_progress'
          })
          .select()
          .single();

        if (error) throw error;

        setSessionState('not_started');
        setTimeRemaining(assessmentDuration * 60);
        setCurrentQuestionIndex(0);
        setSecurityViolations([]);
        return newInstance;
      }
    } catch (error) {
      console.error('Error creating/resuming session:', error);
      toast({
        title: "Session Error",
        description: "Failed to initialize assessment session",
        variant: "destructive"
      });
      return null;
    }
  }, [assessmentId, participantId, toast]);

  // Submit assessment
  const submitAssessment = useCallback(async () => {
    try {
      const { data: instance, error } = await supabase
        .from('assessment_instances')
        .update({
          session_state: 'submitted',
          submitted_at: new Date().toISOString(),
          status: 'submitted'
        })
        .eq('assessment_id', assessmentId)
        .eq('participant_id', participantId)
        .select()
        .single();

      if (error) throw error;

      // Trigger automatic evaluation
      try {
        await supabase.functions.invoke('auto-evaluate-assessment', {
          body: { instanceId: instance.id }
        });
      } catch (evalError) {
        console.error('Error triggering evaluation:', evalError);
        // Don't fail submission if evaluation fails
      }

      setSessionState('submitted');
      toast({
        title: "Assessment Submitted",
        description: "Your assessment has been successfully submitted and is being evaluated.",
      });
      return true;
    } catch (error) {
      console.error('Error submitting assessment:', error);
      toast({
        title: "Submission Error",
        description: "Failed to submit assessment. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  }, [assessmentId, participantId, toast]);

  return {
    // State
    sessionState,
    timeRemaining,
    currentQuestionIndex,
    proctoringActive,
    securityViolations,
    isConnected: instanceRealtime.isConnected && proctoringRealtime.isConnected,
    
    // Actions
    updateSessionState,
    updateTimeRemaining,
    navigateToQuestion,
    addSecurityViolation,
    createSession,
    submitAssessment,
    saveSessionState
  };
};