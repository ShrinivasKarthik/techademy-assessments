import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AutoSaveOptions {
  delay?: number; // milliseconds
  enabled?: boolean;
}

export const useAutoSave = (options: AutoSaveOptions = {}) => {
  const { delay = 2000, enabled = true } = options;
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastSaveRef = useRef<string>('');
  const { toast } = useToast();

  const saveData = useCallback(async (table: string, id: string, data: any) => {
    try {
      const { error } = await supabase
        .from(table as any)
        .update(data)
        .eq('id', id);

      if (error) {
        console.error('Auto-save error:', error);
        toast({
          title: "Auto-save failed",
          description: "Your changes could not be saved automatically. Please save manually.",
          variant: "destructive"
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Auto-save error:', error);
      return false;
    }
  }, [toast]);

  const autoSave = useCallback((table: string, id: string, data: any) => {
    if (!enabled) return;

    // Create a hash of the data to avoid saving identical content
    const dataHash = JSON.stringify(data);
    if (dataHash === lastSaveRef.current) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(async () => {
      const success = await saveData(table, id, data);
      if (success) {
        lastSaveRef.current = dataHash;
      }
    }, delay);
  }, [enabled, delay, saveData]);

  const forceSave = useCallback(async (table: string, id: string, data: any) => {
    // Clear any pending auto-save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    return await saveData(table, id, data);
  }, [saveData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { autoSave, forceSave };
};

// Hook specifically for assessment instance auto-save
export const useAssessmentAutoSave = (instanceId: string, options?: AutoSaveOptions) => {
  const { autoSave, forceSave } = useAutoSave(options);

  const saveProgress = useCallback((data: {
    current_question_index?: number;
    time_remaining_seconds?: number;
    session_state?: string;
  }) => {
    autoSave('assessment_instances', instanceId, data);
  }, [autoSave, instanceId]);

  const saveAnswer = useCallback(async (submissionData: {
    question_id: string;
    answer: any;
  }) => {
    // Insert new submission record
    try {
      const { error } = await supabase
        .from('submissions')
        .insert({
          instance_id: instanceId,
          ...submissionData
        });

      if (error) {
        console.error('Answer save error:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Answer save error:', error);
      return false;
    }
  }, [instanceId]);

  return { saveProgress, saveAnswer };
};