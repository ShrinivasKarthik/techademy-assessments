import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SimpleQuestion {
  id: string;
  title: string;
  question_text: string;
  question_type: string;
  difficulty: string;
  points: number;
  created_at: string;
  tags: string[];
}

export const useSimpleQuestions = () => {
  const [questions, setQuestions] = useState<SimpleQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('questions')
        .select('id, title, question_text, question_type, difficulty, points, created_at, tags')
        .order('created_at', { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setQuestions(data || []);
      }
    } catch (err) {
      setError('Failed to fetch questions');
    } finally {
      setLoading(false);
    }
  };

  const generateBulkQuestions = async (skills: string[], difficulty: string, count: number) => {
    try {
      setLoading(true);
      const response = await supabase.functions.invoke('enhanced-ai-generator', {
        body: {
          type: 'bulk_generate',
          skills,
          difficulty,
          count,
          context: ''
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Refresh questions after generation
      await fetchQuestions();
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  return {
    questions,
    loading,
    error,
    fetchQuestions,
    generateBulkQuestions
  };
};