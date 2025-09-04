import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type AssessmentStatus = 'draft' | 'published' | 'archived';

interface AssessmentLifecycleHook {
  updateStatus: (assessmentId: string, newStatus: AssessmentStatus) => Promise<boolean>;
  publishAssessment: (assessmentId: string) => Promise<boolean>;
  archiveAssessment: (assessmentId: string) => Promise<boolean>;
  duplicateAssessment: (assessmentId: string) => Promise<string | null>;
  loading: boolean;
}

export const useAssessmentLifecycle = (): AssessmentLifecycleHook => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const updateStatus = useCallback(async (assessmentId: string, newStatus: AssessmentStatus): Promise<boolean> => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('assessments')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', assessmentId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Assessment status changed to ${newStatus}`,
      });

      return true;
    } catch (error) {
      console.error('Error updating assessment status:', error);
      toast({
        title: "Error",
        description: "Failed to update assessment status",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const publishAssessment = useCallback(async (assessmentId: string): Promise<boolean> => {
    try {
      setLoading(true);

      // Validate assessment has questions before publishing
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('id')
        .eq('assessment_id', assessmentId);

      if (questionsError) throw questionsError;

      if (!questions || questions.length === 0) {
        toast({
          title: "Cannot Publish",
          description: "Assessment must have at least one question to be published",
          variant: "destructive",
        });
        return false;
      }

      const success = await updateStatus(assessmentId, 'published');
      
      if (success) {
        toast({
          title: "Assessment Published",
          description: "Assessment is now available for participants",
        });
      }

      return success;
    } catch (error) {
      console.error('Error publishing assessment:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [updateStatus, toast]);

  const archiveAssessment = useCallback(async (assessmentId: string): Promise<boolean> => {
    try {
      setLoading(true);

      // Check if there are active instances
      const { data: activeInstances, error: instancesError } = await supabase
        .from('assessment_instances')
        .select('id')
        .eq('assessment_id', assessmentId)
        .eq('status', 'in_progress');

      if (instancesError) throw instancesError;

      if (activeInstances && activeInstances.length > 0) {
        toast({
          title: "Cannot Archive",
          description: "Cannot archive assessment with active participants",
          variant: "destructive",
        });
        return false;
      }

      return await updateStatus(assessmentId, 'archived');
    } catch (error) {
      console.error('Error archiving assessment:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [updateStatus, toast]);

  const duplicateAssessment = useCallback(async (assessmentId: string): Promise<string | null> => {
    try {
      setLoading(true);

      // Get original assessment
      const { data: originalAssessment, error: assessmentError } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();

      if (assessmentError) throw assessmentError;

      // Create duplicate assessment
      const { data: newAssessment, error: createError } = await supabase
        .from('assessments')
        .insert({
          title: `${originalAssessment.title} (Copy)`,
          description: originalAssessment.description,
          instructions: originalAssessment.instructions,
          duration_minutes: originalAssessment.duration_minutes,
          max_attempts: originalAssessment.max_attempts,
          proctoring_enabled: originalAssessment.proctoring_enabled,
          proctoring_config: originalAssessment.proctoring_config,
          creator_id: originalAssessment.creator_id,
          status: 'draft'
        })
        .select()
        .single();

      if (createError) throw createError;

      // Get and duplicate questions
      const { data: originalQuestions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('order_index');

      if (questionsError) throw questionsError;

      if (originalQuestions && originalQuestions.length > 0) {
        const duplicatedQuestions = originalQuestions.map(q => ({
          assessment_id: newAssessment.id,
          title: q.title,
          description: q.description,
          question_type: q.question_type,
          difficulty: q.difficulty,
          points: q.points,
          order_index: q.order_index,
          config: q.config
        }));

        const { error: duplicateQuestionsError } = await supabase
          .from('questions')
          .insert(duplicatedQuestions);

        if (duplicateQuestionsError) throw duplicateQuestionsError;
      }

      toast({
        title: "Assessment Duplicated",
        description: "Assessment has been successfully duplicated",
      });

      return newAssessment.id;
    } catch (error) {
      console.error('Error duplicating assessment:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate assessment",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    updateStatus,
    publishAssessment,
    archiveAssessment,
    duplicateAssessment,
    loading
  };
};