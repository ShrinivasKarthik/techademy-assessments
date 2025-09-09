import React, { createContext, useContext, useEffect, useState, useCallback, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useStableRealtime } from '@/hooks/useStableRealtime';
import { ErrorBoundary } from '@/components/ui/error-boundary';

// Stable, memoized version of AssessmentStateProvider to prevent subscription loops

interface ActiveSession {
  id: string;
  assessment_id: string;
  participant_id: string;
  status: 'submitted' | 'in_progress' | 'evaluated';
  time_remaining_seconds: number;
  current_question_index: number;
  participant_name?: string;
  participant_email?: string;
  started_at?: string;
  submitted_at?: string;
}

interface Assessment {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  creator_id: string;
  questions?: any[];
  proctoring_enabled?: boolean;
  live_monitoring_enabled?: boolean;
}

interface StableAssessmentStateContextType {
  // State
  assessments: Assessment[];
  activeSessions: ActiveSession[];
  currentSession: ActiveSession | null;
  loading: boolean;
  error: string | null;

  // Actions
  refreshAssessments: () => Promise<void>;
  updateAssessment: (id: string, updates: Partial<Assessment>) => Promise<void>;
  createSession: (assessmentId: string, participantInfo?: any) => Promise<string>;
  updateSession: (sessionId: string, updates: Partial<ActiveSession>) => Promise<void>;
  endSession: (sessionId: string) => Promise<void>;
  clearError: () => void;

  // Real-time subscriptions (managed internally)
  isConnected: boolean;
}

const StableAssessmentStateContext = createContext<StableAssessmentStateContextType | undefined>(undefined);

export const useStableAssessmentState = () => {
  const context = useContext(StableAssessmentStateContext);
  if (context === undefined) {
    throw new Error('useStableAssessmentState must be used within a StableAssessmentStateProvider');
  }
  return context;
};

// Memoized provider component
export const StableAssessmentStateProvider = memo(({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State with error handling
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ActiveSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stable realtime connections with memoized callbacks
  const { isConnected: assessmentConnection } = useStableRealtime({
    table: 'assessments',
    onInsert: useCallback((payload) => {
      console.log('New assessment added:', payload.new);
      setAssessments(prev => [...prev, payload.new]);
    }, []),
    onUpdate: useCallback((payload) => {
      console.log('Assessment updated:', payload.new);
      setAssessments(prev => 
        prev.map(assessment => 
          assessment.id === payload.new.id ? payload.new : assessment
        )
      );
    }, []),
    onDelete: useCallback((payload) => {
      console.log('Assessment deleted:', payload.old);
      setAssessments(prev => 
        prev.filter(assessment => assessment.id !== payload.old.id)
      );
    }, [])
  });

  const { isConnected: sessionConnection } = useStableRealtime({
    table: 'assessment_instances',
    onInsert: useCallback((payload) => {
      console.log('New session created:', payload.new);
      setActiveSessions(prev => [...prev, payload.new]);
    }, []),
    onUpdate: useCallback((payload) => {
      console.log('Session updated:', payload.new);
      setActiveSessions(prev => 
        prev.map(session => 
          session.id === payload.new.id ? payload.new : session
        )
      );
      
      // Update current session if it matches
      setCurrentSession(prev => 
        prev && prev.id === payload.new.id ? payload.new : prev
      );
    }, []),
    onDelete: useCallback((payload) => {
      console.log('Session ended:', payload.old);
      setActiveSessions(prev => 
        prev.filter(session => session.id !== payload.old.id)
      );
      
      // Clear current session if it matches
      setCurrentSession(prev => 
        prev && prev.id === payload.old.id ? null : prev
      );
    }, [])
  });

  const isConnected = assessmentConnection && sessionConnection;

  // Memoized action handlers
  const refreshAssessments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAssessments(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch assessments';
      setError(errorMessage);
      console.error('Error fetching assessments:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateAssessment = useCallback(async (id: string, updates: Partial<Assessment>) => {
    try {
      setError(null);
      
      const { data, error } = await supabase
        .from('assessments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setAssessments(prev => 
        prev.map(assessment => 
          assessment.id === id ? { ...assessment, ...data } : assessment
        )
      );

      toast({
        title: "Success",
        description: "Assessment updated successfully",
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update assessment';
      setError(errorMessage);
      console.error('Error updating assessment:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [toast]);

  const createSession = useCallback(async (assessmentId: string, participantInfo?: any): Promise<string> => {
    try {
      setError(null);
      
      const sessionData = {
        assessment_id: assessmentId,
        participant_id: user?.id,
        participant_name: participantInfo?.name || user?.email,
        participant_email: participantInfo?.email || user?.email,
        status: 'in_progress' as const,
        started_at: new Date().toISOString(),
        current_question_index: 0,
        ...participantInfo
      };

      const { data, error } = await supabase
        .from('assessment_instances')
        .insert(sessionData)
        .select()
        .single();

      if (error) throw error;

      setCurrentSession(data);
      
      toast({
        title: "Session Started",
        description: "Assessment session has been created successfully",
      });

      return data.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create session';
      setError(errorMessage);
      console.error('Error creating session:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    }
  }, [user, toast]);

  const updateSession = useCallback(async (sessionId: string, updates: Partial<Omit<ActiveSession, 'id'>>) => {
    try {
      setError(null);
      
      const { data, error } = await supabase
        .from('assessment_instances')
        .update(updates)
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;

      setActiveSessions(prev => 
        prev.map(session => 
          session.id === sessionId ? { ...session, ...data } : session
        )
      );

      if (currentSession?.id === sessionId) {
        setCurrentSession(prev => prev ? { ...prev, ...data } : null);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update session';
      setError(errorMessage);
      console.error('Error updating session:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [currentSession, toast]);

  const endSession = useCallback(async (sessionId: string) => {
    try {
      setError(null);
      
      const { error } = await supabase
        .from('assessment_instances')
        .update({ 
          status: 'submitted' as const,
          submitted_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;

      setActiveSessions(prev => 
        prev.filter(session => session.id !== sessionId)
      );

      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
      }

      toast({
        title: "Session Ended",
        description: "Assessment session has been completed successfully",
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to end session';
      setError(errorMessage);
      console.error('Error ending session:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [currentSession, toast]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load initial data
  useEffect(() => {
    if (user) {
      refreshAssessments();
    }
  }, [user, refreshAssessments]);

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = React.useMemo(() => ({
    assessments,
    activeSessions,
    currentSession,
    loading,
    error,
    refreshAssessments,
    updateAssessment,
    createSession,
    updateSession,
    endSession,
    clearError,
    isConnected
  }), [
    assessments,
    activeSessions,
    currentSession,
    loading,
    error,
    refreshAssessments,
    updateAssessment,
    createSession,
    updateSession,
    endSession,
    clearError,
    isConnected
  ]);

  return (
    <ErrorBoundary>
      <StableAssessmentStateContext.Provider value={contextValue}>
        {children}
      </StableAssessmentStateContext.Provider>
    </ErrorBoundary>
  );
});

StableAssessmentStateProvider.displayName = 'StableAssessmentStateProvider';

export default StableAssessmentStateProvider;