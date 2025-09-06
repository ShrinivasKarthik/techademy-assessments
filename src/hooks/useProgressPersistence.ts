import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProgressState {
  currentQuestionIndex: number;
  timeRemainingSeconds: number;
  answers: Record<string, any>;
  sessionState: string;
  lastSaved: Date | null;
}

interface UseProgressPersistenceProps {
  instanceId: string;
  enabled?: boolean;
  autoSaveInterval?: number; // in milliseconds
}

export const useProgressPersistence = ({
  instanceId,
  enabled = true,
  autoSaveInterval = 30000 // 30 seconds
}: UseProgressPersistenceProps) => {
  const [progressState, setProgressState] = useState<ProgressState>({
    currentQuestionIndex: 0,
    timeRemainingSeconds: 0,
    answers: {},
    sessionState: 'not_started',
    lastSaved: null
  });
  
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load existing progress from database
  const loadProgress = useCallback(async () => {
    if (!enabled || !instanceId) return;

    try {
      setLoading(true);

      // Load instance progress
      const { data: instance, error: instanceError } = await supabase
        .from('assessment_instances')
        .select('current_question_index, time_remaining_seconds, session_state')
        .eq('id', instanceId)
        .single();

      if (instanceError) {
        console.error('Error loading instance progress:', instanceError);
        return;
      }

      // Load saved answers
      const { data: submissions, error: submissionsError } = await supabase
        .from('submissions')
        .select('question_id, answer')
        .eq('instance_id', instanceId);

      if (submissionsError) {
        console.error('Error loading submissions:', submissionsError);
        return;
      }

      // Convert submissions to answers object
      const answers: Record<string, any> = {};
      submissions?.forEach(submission => {
        answers[submission.question_id] = submission.answer;
      });

      setProgressState({
        currentQuestionIndex: instance.current_question_index || 0,
        timeRemainingSeconds: instance.time_remaining_seconds || 0,
        sessionState: instance.session_state || 'not_started',
        answers,
        lastSaved: new Date()
      });

    } catch (error) {
      console.error('Error loading progress:', error);
      toast({
        title: "Error",
        description: "Failed to load saved progress",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [instanceId, enabled, toast]);

  // Save progress to database
  const saveProgress = useCallback(async (updates: Partial<ProgressState>) => {
    if (!enabled || !instanceId || saving) return;

    try {
      setSaving(true);

      const newState = { ...progressState, ...updates };

      // Save instance progress
      const { error: instanceError } = await supabase
        .from('assessment_instances')
        .update({
          current_question_index: newState.currentQuestionIndex,
          time_remaining_seconds: newState.timeRemainingSeconds,
          session_state: newState.sessionState
        })
        .eq('id', instanceId);

      if (instanceError) {
        throw instanceError;
      }

      // Save individual answers if provided
      if (updates.answers) {
        const submissions = Object.entries(updates.answers).map(([questionId, answer]) => ({
          instance_id: instanceId,
          question_id: questionId,
          answer: answer
        }));

        if (submissions.length > 0) {
          const { error: submissionsError } = await supabase
            .from('submissions')
            .upsert(submissions, {
              onConflict: 'instance_id,question_id'
            });

          if (submissionsError) {
            throw submissionsError;
          }
        }
      }

      setProgressState({
        ...newState,
        lastSaved: new Date()
      });

    } catch (error) {
      console.error('Error saving progress:', error);
      toast({
        title: "Save Error",
        description: "Failed to save progress. Your work may be lost.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [instanceId, enabled, saving, progressState, toast]);

  // Auto-save effect
  useEffect(() => {
    if (!enabled || autoSaveInterval <= 0) return;

    const interval = setInterval(() => {
      if (progressState.lastSaved) {
        const timeSinceLastSave = Date.now() - progressState.lastSaved.getTime();
        if (timeSinceLastSave >= autoSaveInterval) {
          saveProgress({}); // Save current state
        }
      }
    }, autoSaveInterval);

    return () => clearInterval(interval);
  }, [enabled, autoSaveInterval, progressState.lastSaved, saveProgress]);

  // Load progress on mount
  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  // Save answer helper
  const saveAnswer = useCallback(async (questionId: string, answer: any) => {
    const newAnswers = { ...progressState.answers, [questionId]: answer };
    await saveProgress({ answers: newAnswers });
  }, [progressState.answers, saveProgress]);

  // Navigate to question helper
  const navigateToQuestion = useCallback(async (questionIndex: number) => {
    await saveProgress({ currentQuestionIndex: questionIndex });
  }, [saveProgress]);

  // Update time remaining helper
  const updateTimeRemaining = useCallback(async (timeSeconds: number) => {
    await saveProgress({ timeRemainingSeconds: timeSeconds });
  }, [saveProgress]);

  // Update session state helper
  const updateSessionState = useCallback(async (state: string) => {
    await saveProgress({ sessionState: state });
  }, [saveProgress]);

  // Force save helper
  const forceSave = useCallback(async () => {
    await saveProgress({});
  }, [saveProgress]);

  // Resume from saved state
  const resumeFromSaved = useCallback(() => {
    return {
      currentQuestionIndex: progressState.currentQuestionIndex,
      timeRemainingSeconds: progressState.timeRemainingSeconds,
      answers: progressState.answers,
      sessionState: progressState.sessionState
    };
  }, [progressState]);

  // Check if can resume
  const canResume = useCallback(() => {
    return progressState.sessionState === 'in_progress' && 
           (progressState.currentQuestionIndex > 0 || Object.keys(progressState.answers).length > 0);
  }, [progressState]);

  return {
    // State
    progressState,
    saving,
    loading,
    
    // Actions
    saveProgress,
    saveAnswer,
    navigateToQuestion,
    updateTimeRemaining,
    updateSessionState,
    forceSave,
    loadProgress,
    resumeFromSaved,
    canResume,
    
    // Computed values
    lastSaved: progressState.lastSaved,
    hasUnsavedChanges: progressState.lastSaved ? 
      Date.now() - progressState.lastSaved.getTime() > autoSaveInterval : true
  };
};