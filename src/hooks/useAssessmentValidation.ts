import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ValidationError {
  field: string;
  message: string;
}

interface AssessmentValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export const useAssessmentValidation = () => {
  const [validating, setValidating] = useState(false);
  const { toast } = useToast();

  const validateAssessment = useCallback(async (assessmentId: string): Promise<AssessmentValidationResult> => {
    setValidating(true);
    const errors: ValidationError[] = [];

    try {
      // Fetch assessment details
      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();

      if (assessmentError) {
        errors.push({ field: 'assessment', message: 'Failed to fetch assessment details' });
        return { isValid: false, errors };
      }

      // Validate basic assessment info
      if (!assessment.title?.trim()) {
        errors.push({ field: 'title', message: 'Assessment title is required' });
      }

      if (!assessment.description?.trim()) {
        errors.push({ field: 'description', message: 'Assessment description is required' });
      }

      if (!assessment.duration_minutes || assessment.duration_minutes <= 0) {
        errors.push({ field: 'duration', message: 'Valid duration is required' });
      }

      // Validate questions
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('assessment_id', assessmentId)
        .eq('is_active', true);

      if (questionsError) {
        errors.push({ field: 'questions', message: 'Failed to fetch assessment questions' });
        return { isValid: false, errors };
      }

      if (!questions || questions.length === 0) {
        errors.push({ field: 'questions', message: 'Assessment must have at least one active question' });
      }

      // Validate each question
      questions?.forEach((question, index) => {
        if (!question.title?.trim()) {
          errors.push({ field: `question_${index}_title`, message: `Question ${index + 1}: Title is required` });
        }

        if (!question.question_text?.trim()) {
          errors.push({ field: `question_${index}_text`, message: `Question ${index + 1}: Question text is required` });
        }

        if (!question.points || question.points <= 0) {
          errors.push({ field: `question_${index}_points`, message: `Question ${index + 1}: Valid points value is required` });
        }

        // Validate question-specific requirements
        if (question.question_type === 'mcq') {
          const config = question.config as any;
          const options = config?.options;
          if (!options || options.length < 2) {
            errors.push({ field: `question_${index}_options`, message: `Question ${index + 1}: MCQ must have at least 2 options` });
          }

          const correctAnswers = options?.filter((opt: any) => opt.isCorrect);
          if (!correctAnswers || correctAnswers.length === 0) {
            errors.push({ field: `question_${index}_correct`, message: `Question ${index + 1}: At least one correct answer is required` });
          }
        }

        if (question.question_type === 'coding') {
          const config = question.config as any;
          if (!config?.language) {
            errors.push({ field: `question_${index}_language`, message: `Question ${index + 1}: Programming language is required` });
          }
        }
      });

      // Check total points
      const totalPoints = questions?.reduce((sum, q) => sum + (q.points || 0), 0) || 0;
      if (totalPoints === 0) {
        errors.push({ field: 'total_points', message: 'Assessment must have a total point value greater than 0' });
      }

      return {
        isValid: errors.length === 0,
        errors
      };

    } catch (error) {
      console.error('Assessment validation error:', error);
      errors.push({ field: 'general', message: 'An unexpected error occurred during validation' });
      return { isValid: false, errors };
    } finally {
      setValidating(false);
    }
  }, []);

  const publishAssessment = useCallback(async (assessmentId: string): Promise<boolean> => {
    const validation = await validateAssessment(assessmentId);

    if (!validation.isValid) {
      // Show validation errors
      validation.errors.forEach(error => {
        toast({
          title: "Validation Error",
          description: error.message,
          variant: "destructive"
        });
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('assessments')
        .update({ status: 'published' })
        .eq('id', assessmentId);

      if (error) {
        toast({
          title: "Publication Failed",
          description: error.message,
          variant: "destructive"
        });
        return false;
      }

      toast({
        title: "Assessment Published",
        description: "Your assessment has been successfully published and is now available to participants."
      });

      return true;
    } catch (error) {
      console.error('Publication error:', error);
      toast({
        title: "Publication Failed",
        description: "An unexpected error occurred while publishing the assessment.",
        variant: "destructive"
      });
      return false;
    }
  }, [validateAssessment, toast]);

  return {
    validateAssessment,
    publishAssessment,
    validating
  };
};