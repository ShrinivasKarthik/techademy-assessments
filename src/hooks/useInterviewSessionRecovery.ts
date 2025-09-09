import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Message {
  speaker: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type: 'text' | 'audio';
}

interface SessionRecoveryState {
  sessionId: string | null;
  messages: Message[];
  timeElapsed: number;
  canRecover: boolean;
  isRecovering: boolean;
}

export const useInterviewSessionRecovery = (questionId: string, instanceId: string) => {
  const { toast } = useToast();
  const [recoveryState, setRecoveryState] = useState<SessionRecoveryState>({
    sessionId: null,
    messages: [],
    timeElapsed: 0,
    canRecover: false,
    isRecovering: false
  });

  const checkForRecovery = useCallback(async () => {
    try {
      // Look for existing incomplete session
      const { data: existingSession, error } = await supabase
        .from('interview_sessions')
        .select('*')
        .eq('question_id', questionId)
        .eq('instance_id', instanceId)
        .neq('current_state', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        throw error;
      }

      if (existingSession) {
        // Load conversation history
        const { data: responses, error: responsesError } = await supabase
          .from('interview_responses')
          .select('*')
          .eq('session_id', existingSession.id)
          .order('timestamp', { ascending: true });

        if (responsesError) throw responsesError;

        const messages: Message[] = responses?.map(response => ({
          speaker: response.speaker as 'user' | 'assistant',
          content: response.content,
          timestamp: new Date(response.timestamp || new Date()),
          type: response.message_type as 'text' | 'audio'
        })) || [];

        // Calculate elapsed time
        const startTime = new Date(existingSession.created_at);
        const timeElapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);

        setRecoveryState({
          sessionId: existingSession.id,
          messages,
          timeElapsed,
          canRecover: true,
          isRecovering: false
        });

        return {
          canRecover: true,
          sessionData: {
            sessionId: existingSession.id,
            messages,
            timeElapsed
          }
        };
      }

      return { canRecover: false, sessionData: null };

    } catch (error) {
      console.error('Failed to check for session recovery:', error);
      return { canRecover: false, sessionData: null };
    }
  }, [questionId, instanceId]);

  const recoverSession = useCallback(async () => {
    if (!recoveryState.canRecover || !recoveryState.sessionId) {
      return null;
    }

    setRecoveryState(prev => ({ ...prev, isRecovering: true }));

    try {
      // Update session state to indicate recovery
      await supabase
        .from('interview_sessions')
        .update({
          current_state: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', recoveryState.sessionId);

      toast({
        title: "Session Recovered",
        description: "Your interview has been restored successfully",
      });

      return {
        sessionId: recoveryState.sessionId,
        messages: recoveryState.messages,
        timeElapsed: recoveryState.timeElapsed
      };

    } catch (error) {
      console.error('Failed to recover session:', error);
      toast({
        title: "Recovery Failed",
        description: "Could not restore your interview session",
        variant: "destructive",
      });
      return null;
    } finally {
      setRecoveryState(prev => ({ ...prev, isRecovering: false }));
    }
  }, [recoveryState, toast]);

  const clearRecovery = useCallback(() => {
    setRecoveryState({
      sessionId: null,
      messages: [],
      timeElapsed: 0,
      canRecover: false,
      isRecovering: false
    });
  }, []);

  // Check for recovery on mount
  useEffect(() => {
    checkForRecovery();
  }, [checkForRecovery]);

  return {
    ...recoveryState,
    recoverSession,
    clearRecovery,
    checkForRecovery
  };
};