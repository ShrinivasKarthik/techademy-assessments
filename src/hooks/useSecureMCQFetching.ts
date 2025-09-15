import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MCQObfuscation } from '@/lib/mcq-security';

export const useSecureMCQFetching = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSecureQuestions = useCallback(async (assessmentId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch questions
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select(`
          id,
          title,
          question_text,
          question_type,
          difficulty,
          points,
          config,
          created_at
        `)
        .eq('assessment_id', assessmentId)
        .order('created_at');

      if (questionsError) throw questionsError;

      // Process MCQ questions to encode answers and remove client-accessible correct answers
      const secureQuestions = questions?.map(question => {
        if (question.question_type === 'mcq' && question.config) {
          const config = question.config as any;
          
          if (config.options && Array.isArray(config.options)) {
            // Extract correct answers
            const correctOptions = config.options
              .filter((option: any) => option.isCorrect)
              .map((option: any) => option.id);

            // Encode correct answers
            const encodedAnswers = MCQObfuscation.encode(correctOptions);
            const answerChecksum = MCQObfuscation.generateChecksum(correctOptions);

            // Remove isCorrect from options sent to client
            const secureOptions = config.options.map((option: any) => ({
              id: option.id,
              text: option.text,
              // Remove isCorrect property completely
            }));

            return {
              ...question,
              config: {
                ...config,
                options: secureOptions,
                // Add encoded answers and checksum for evaluation
                encodedAnswers,
                answerChecksum,
                // Remove any trace of correct answers
                correctAnswers: undefined,
                correctOptions: undefined
              }
            };
          }
        }

        return question;
      }) || [];

      return secureQuestions;

    } catch (err) {
      console.error('Error fetching secure questions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch questions securely');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const validateQuestionSecurity = useCallback((question: any): {
    isSecure: boolean;
    issues: string[];
  } => {
    const issues: string[] = [];
    
    if (question.question_type === 'mcq' && question.config) {
      const config = question.config as any;
      
      // Check if correct answers are exposed
      if (config.options && Array.isArray(config.options)) {
        if (config.options.some((opt: any) => opt.hasOwnProperty('isCorrect'))) {
          issues.push('Correct answers are exposed in options');
        }
      }
      
      // Check if encoded answers exist
      if (!config.encodedAnswers) {
        issues.push('Missing encoded answers');
      }
      
      // Check if checksum exists
      if (!config.answerChecksum) {
        issues.push('Missing answer checksum');
      }
    }

    return {
      isSecure: issues.length === 0,
      issues
    };
  }, []);

  return {
    fetchSecureQuestions,
    validateQuestionSecurity,
    loading,
    error
  };
};