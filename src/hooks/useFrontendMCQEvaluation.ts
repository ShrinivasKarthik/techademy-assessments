import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MCQEvaluationResult {
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  questionResults: {
    questionId: string;
    score: number;
    maxScore: number;
    isCorrect: boolean;
    selectedOptions: string[];
    correctOptions: string[];
  }[];
}

export const useFrontendMCQEvaluation = () => {
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const evaluateMCQAssessment = useCallback(async (
    assessment: any,
    answers: Record<string, any>,
    instance: any
  ): Promise<MCQEvaluationResult | null> => {
    try {
      setEvaluating(true);
      setError(null);

      // Check if all questions are MCQ
      const isMCQOnly = assessment?.questions?.every((q: any) => q.question_type === 'mcq');
      if (!isMCQOnly) {
        throw new Error('This evaluation method is only for MCQ-only assessments');
      }

      let totalScore = 0;
      let maxPossibleScore = 0;
      const questionResults: any[] = [];

      // Evaluate each MCQ question
      for (const question of assessment.questions) {
        const questionPoints = question.points || 0;
        maxPossibleScore += questionPoints;
        
        const answer = answers[question.id];
        const selectedOptions = answer?.selectedOptions || [];
        
        // Get correct options from question config
        const correctOptions = question.config?.options
          ?.filter((option: any) => option.isCorrect)
          ?.map((option: any) => option.id) || [];

        // Check if answer is correct (exact match for both single and multiple choice)
        const isCorrect = selectedOptions.length === correctOptions.length &&
                         selectedOptions.every((selected: string) => correctOptions.includes(selected)) &&
                         correctOptions.every((correct: string) => selectedOptions.includes(correct));

        const score = isCorrect ? questionPoints : 0;
        totalScore += score;

        questionResults.push({
          questionId: question.id,
          score,
          maxScore: questionPoints,
          isCorrect,
          selectedOptions,
          correctOptions
        });
      }

      const percentage = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;

      return {
        totalScore,
        maxPossibleScore,
        percentage,
        questionResults
      };

    } catch (err) {
      console.error('Error evaluating MCQ assessment:', err);
      setError(err instanceof Error ? err.message : 'Failed to evaluate assessment');
      return null;
    } finally {
      setEvaluating(false);
    }
  }, []);

  const saveBatchResults = useCallback(async (
    evaluation: MCQEvaluationResult,
    instance: any,
    answers: Record<string, any>
  ) => {
    try {
      // Start a transaction-like approach with multiple operations
      const operations = [];

      // 1. Save all submissions first
      const submissionInserts = Object.entries(answers).map(([questionId, answer]) => ({
        instance_id: instance.id,
        question_id: questionId,
        answer: answer,
        submitted_at: new Date().toISOString()
      }));

      if (submissionInserts.length > 0) {
        operations.push(
          supabase
            .from('submissions')
            .upsert(submissionInserts, { 
              onConflict: 'instance_id,question_id',
              ignoreDuplicates: false 
            })
        );
      }

      // Execute submissions first
      const { data: submissions, error: submissionError } = await supabase
        .from('submissions')
        .upsert(submissionInserts, { 
          onConflict: 'instance_id,question_id',
          ignoreDuplicates: false 
        })
        .select();

      if (submissionError) throw submissionError;

      // 2. Create evaluations for each submission
      if (submissions) {
        const evaluationInserts = evaluation.questionResults.map((result) => {
          const submission = submissions.find((s: any) => s.question_id === result.questionId);
          return submission ? {
            submission_id: submission.id,
            score: result.score,
            max_score: result.maxScore,
            integrity_score: 100,
            evaluator_type: 'frontend_automatic',
            ai_feedback: {
              question_type: 'mcq',
              evaluation_method: 'frontend_instant',
              is_correct: result.isCorrect,
              selected_options: result.selectedOptions,
              correct_options: result.correctOptions,
              timestamp: new Date().toISOString()
            }
          } : null;
        }).filter(Boolean);

        if (evaluationInserts.length > 0) {
          const { error: evaluationError } = await supabase
            .from('evaluations')
            .insert(evaluationInserts);
          
          if (evaluationError) throw evaluationError;
        }
      }

      // 3. Update assessment instance with final results
      const { error: instanceError } = await supabase
        .from('assessment_instances')
        .update({
          total_score: evaluation.totalScore,
          max_possible_score: evaluation.maxPossibleScore,
          integrity_score: 100,
          status: 'evaluated',
          evaluation_status: 'completed',
          submitted_at: new Date().toISOString(),
          time_remaining_seconds: 0,
          duration_taken_seconds: ((instance.time_remaining_seconds || 0) - 0) // This will be set by the calling component
        })
        .eq('id', instance.id);

      if (instanceError) throw instanceError;

      return true;
    } catch (err) {
      console.error('Error saving batch results:', err);
      throw err;
    }
  }, []);

  return {
    evaluateMCQAssessment,
    saveBatchResults,
    evaluating,
    error
  };
};