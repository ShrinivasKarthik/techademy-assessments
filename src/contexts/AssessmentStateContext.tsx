import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { realtimeManager } from '@/hooks/useRealtimeConnectionManager';

// Types for centralized state
interface ActiveSession {
  id: string;
  assessmentId: string;
  participantId: string;
  status: 'in_progress' | 'paused' | 'submitted';
  timeRemaining: number;
  currentQuestionIndex: number;
  lastActivity: string;
  proctoringActive: boolean;
  securityViolations: any[];
}

interface Assessment {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  duration_minutes: number;
  proctoring_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface AssessmentStateContextType {
  // State
  assessments: Assessment[];
  activeSessions: ActiveSession[];
  currentSession: ActiveSession | null;
  loading: boolean;
  
  // Assessment operations
  refreshAssessments: () => Promise<void>;
  updateAssessment: (id: string, updates: Partial<Assessment>) => Promise<void>;
  
  // Session operations
  createSession: (assessmentId: string) => Promise<ActiveSession | null>;
  updateSession: (sessionId: string, updates: Partial<ActiveSession>) => Promise<void>;
  endSession: (sessionId: string) => Promise<void>;
  
  // Real-time subscriptions
  subscribeToAssessment: (assessmentId: string) => void;
  subscribeToSession: (sessionId: string) => void;
  unsubscribeFromAll: () => void;
}

const AssessmentStateContext = createContext<AssessmentStateContextType | undefined>(undefined);

export const useAssessmentState = () => {
  const context = useContext(AssessmentStateContext);
  if (context === undefined) {
    throw new Error('useAssessmentState must be used within an AssessmentStateProvider');
  }
  return context;
};

export const AssessmentStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  // State
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ActiveSession | null>(null);
  const [loading, setLoading] = useState(false);

  // Assessment operations
  const refreshAssessments = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch all assessments publicly (no user filtering)
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      setAssessments(data || []);
      
    } catch (error) {
      console.error('Error refreshing assessments:', error);
      toast({
        title: "Error",
        description: "Failed to load assessments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]); // Remove user and profile dependencies

  const updateAssessment = useCallback(async (id: string, updates: Partial<Assessment>) => {
    try {
      const { error } = await supabase
        .from('assessments')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      
      setAssessments(prev => 
        prev.map(assessment => 
          assessment.id === id ? { ...assessment, ...updates } : assessment
        )
      );
      
    } catch (error) {
      console.error('Error updating assessment:', error);
      toast({
        title: "Error",
        description: "Failed to update assessment",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Session operations
  const createSession = useCallback(async (assessmentId: string): Promise<ActiveSession | null> => {
    if (!user) return null;
    
    try {
      // Check for existing session
      const { data: existingInstance } = await supabase
        .from('assessment_instances')
        .select('*')
        .eq('assessment_id', assessmentId)
        .eq('participant_id', user.id)
        .eq('status', 'in_progress')
        .single();
      
      if (existingInstance) {
        const session: ActiveSession = {
          id: existingInstance.id,
          assessmentId,
          participantId: user.id,
          status: existingInstance.session_state as any,
          timeRemaining: existingInstance.time_remaining_seconds || 0,
          currentQuestionIndex: existingInstance.current_question_index || 0,
          lastActivity: new Date().toISOString(),
          proctoringActive: false,
          securityViolations: Array.isArray(existingInstance.proctoring_violations) 
            ? existingInstance.proctoring_violations 
            : []
        };
        
        setCurrentSession(session);
        return session;
      }
      
      // Get assessment details
      const { data: assessment } = await supabase
        .from('assessments')
        .select('duration_minutes')
        .eq('id', assessmentId)
        .single();
      
      if (!assessment) throw new Error('Assessment not found');
      
      // Create new instance
      const { data: newInstance, error } = await supabase
        .from('assessment_instances')
        .insert({
          assessment_id: assessmentId,
          participant_id: user.id,
          session_state: 'not_started',
          time_remaining_seconds: assessment.duration_minutes * 60,
          current_question_index: 0,
          status: 'in_progress'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const session: ActiveSession = {
        id: newInstance.id,
        assessmentId,
        participantId: user.id,
        status: 'in_progress',
        timeRemaining: assessment.duration_minutes * 60,
        currentQuestionIndex: 0,
        lastActivity: new Date().toISOString(),
        proctoringActive: false,
        securityViolations: []
      };
      
      setCurrentSession(session);
      setActiveSessions(prev => [...prev, session]);
      
      return session;
      
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Error",
        description: "Failed to create assessment session",
        variant: "destructive",
      });
      return null;
    }
  }, [user, toast]);

  const updateSession = useCallback(async (sessionId: string, updates: Partial<ActiveSession>) => {
    try {
      const dbUpdates: any = {};
      
      if (updates.status) dbUpdates.session_state = updates.status;
      if (updates.timeRemaining !== undefined) dbUpdates.time_remaining_seconds = updates.timeRemaining;
      if (updates.currentQuestionIndex !== undefined) dbUpdates.current_question_index = updates.currentQuestionIndex;
      if (updates.securityViolations) dbUpdates.proctoring_violations = updates.securityViolations;
      
      const { error } = await supabase
        .from('assessment_instances')
        .update(dbUpdates)
        .eq('id', sessionId);
      
      if (error) throw error;
      
      // Update local state
      setActiveSessions(prev => 
        prev.map(session => 
          session.id === sessionId ? { ...session, ...updates } : session
        )
      );
      
      if (currentSession?.id === sessionId) {
        setCurrentSession(prev => prev ? { ...prev, ...updates } : null);
      }
      
    } catch (error) {
      console.error('Error updating session:', error);
      toast({
        title: "Error",
        description: "Failed to update session",
        variant: "destructive",
      });
    }
  }, [currentSession, toast]);

  const endSession = useCallback(async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('assessment_instances')
        .update({
          session_state: 'submitted',
          submitted_at: new Date().toISOString(),
          status: 'submitted'
        })
        .eq('id', sessionId);
      
      if (error) throw error;
      
      setActiveSessions(prev => prev.filter(session => session.id !== sessionId));
      
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
      }
      
    } catch (error) {
      console.error('Error ending session:', error);
      toast({
        title: "Error",
        description: "Failed to end session",
        variant: "destructive",
      });
    }
  }, [currentSession, toast]);

  // Simplified subscription management - no manual subscriptions needed
  const subscribeToAssessment = useCallback((assessmentId: string) => {
    console.log(`Assessment subscription for ${assessmentId} managed by components`);
  }, []);

  const subscribeToSession = useCallback((sessionId: string) => {
    console.log(`Session subscription for ${sessionId} managed by components`);
  }, []);

  const unsubscribeFromAll = useCallback(() => {
    console.log('Subscription cleanup managed by useStableRealtime');
  }, []);

  // Load initial data only once
  useEffect(() => {
    refreshAssessments();
  }, []); // Remove dependency array to prevent loops

  const value = {
    // State
    assessments,
    activeSessions,
    currentSession,
    loading,
    
    // Assessment operations
    refreshAssessments,
    updateAssessment,
    
    // Session operations
    createSession,
    updateSession,
    endSession,
    
    // Real-time subscriptions
    subscribeToAssessment,
    subscribeToSession,
    unsubscribeFromAll
  };

  return (
    <AssessmentStateContext.Provider value={value}>
      {children}
    </AssessmentStateContext.Provider>
  );
};