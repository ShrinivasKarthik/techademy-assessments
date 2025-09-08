import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EvaluationProgress {
  assessmentId: string;
  instanceId: string;
  evaluationStatus: string;
  progress: number;
  evaluatedQuestions: string[];
  lastUpdated: number;
}

export const useEvaluationRecovery = () => {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const { toast } = useToast();

  const saveProgress = useCallback((progress: EvaluationProgress) => {
    const key = `evaluation_progress_${progress.instanceId}`;
    localStorage.setItem(key, JSON.stringify({
      ...progress,
      lastUpdated: Date.now()
    }));
  }, []);

  const loadProgress = useCallback((instanceId: string): EvaluationProgress | null => {
    const key = `evaluation_progress_${instanceId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const progress = JSON.parse(saved);
        // Only return progress if it's less than 1 hour old
        if (Date.now() - progress.lastUpdated < 3600000) {
          return progress;
        }
        localStorage.removeItem(key);
      } catch (error) {
        localStorage.removeItem(key);
      }
    }
    return null;
  }, []);

  const clearProgress = useCallback((instanceId: string) => {
    const key = `evaluation_progress_${instanceId}`;
    localStorage.removeItem(key);
  }, []);

  const retryEvaluation = useCallback(async (instanceId: string) => {
    if (isRetrying) return false;

    setIsRetrying(true);
    const currentRetryCount = retryCount + 1;
    setRetryCount(currentRetryCount);

    // Exponential backoff: 2s, 4s, 8s, 16s, 30s (max)
    const delay = Math.min(2000 * Math.pow(2, currentRetryCount - 1), 30000);
    
    try {
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const { data, error } = await supabase.functions.invoke('auto-evaluate-assessment', {
        body: { instanceId }
      });

      if (error) throw error;

      toast({
        title: "Evaluation Restarted",
        description: `Retry attempt ${currentRetryCount} successful`
      });

      setRetryCount(0);
      return true;
    } catch (error) {
      console.error('Retry failed:', error);
      
      if (currentRetryCount >= 5) {
        toast({
          title: "Evaluation Failed",
          description: "Maximum retry attempts reached. Please refresh and try again.",
          variant: "destructive"
        });
        setRetryCount(0);
        return false;
      }

      toast({
        title: "Retry Failed",
        description: `Attempt ${currentRetryCount} failed. Retrying in ${Math.round(delay/1000)}s...`,
        variant: "destructive"
      });

      // Auto-retry if under max attempts
      setTimeout(() => retryEvaluation(instanceId), delay);
      return false;
    } finally {
      setIsRetrying(false);
    }
  }, [isRetrying, retryCount, toast]);

  return {
    saveProgress,
    loadProgress,
    clearProgress,
    retryEvaluation,
    isRetrying,
    retryCount
  };
};