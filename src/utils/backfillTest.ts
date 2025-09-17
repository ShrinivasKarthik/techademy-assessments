import { supabase } from '@/integrations/supabase/client';

export const testBackfill = async (assessmentTitle?: string, dryRun = true) => {
  try {
    console.log('Running backfill test...', { assessmentTitle, dryRun });
    
    const { data, error } = await supabase.functions.invoke('backfill-project-files', {
      body: {
        assessmentTitle: assessmentTitle || 'Health App Spring Boot',
        dryRun
      }
    });

    if (error) {
      console.error('Backfill error:', error);
      return { success: false, error };
    }

    console.log('Backfill result:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Backfill function error:', error);
    return { success: false, error };
  }
};

// Test function to run in browser console
(window as any).testBackfill = testBackfill;