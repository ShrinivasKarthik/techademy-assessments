import { supabase } from "@/integrations/supabase/client";

export const runCleanupAndReEvaluate = async (instanceId: string) => {
  try {
    console.log('Running cleanup function...');
    const cleanupResult = await supabase.functions.invoke('cleanup-evaluation-duplicates', {});
    console.log('Cleanup result:', cleanupResult);
    
    console.log('Re-running evaluation for instance:', instanceId);
    const evalResult = await supabase.functions.invoke('trigger-evaluation', {
      body: { instanceId }
    });
    console.log('Evaluation result:', evalResult);
    
    return { cleanupResult, evalResult };
  } catch (error) {
    console.error('Error in cleanup and re-evaluation:', error);
    throw error;
  }
};