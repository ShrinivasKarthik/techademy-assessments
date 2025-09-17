import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting cleanup of duplicate evaluations...');
    
    // Find all duplicate evaluations
    const { data: duplicates, error: duplicatesError } = await supabase
      .rpc('get_duplicate_evaluations');
    
    if (duplicatesError) {
      console.log('RPC function not found, using manual query...');
      
      // Manual approach: Find duplicates by submission_id
      const { data: allEvaluations, error: allError } = await supabase
        .from('evaluations')
        .select('id, submission_id, score, evaluated_at')
        .order('submission_id, evaluated_at');
      
      if (allError) throw allError;
      
      // Group by submission_id and find duplicates
      const submissionGroups = new Map();
      allEvaluations?.forEach(eval => {
        const key = eval.submission_id;
        if (!submissionGroups.has(key)) {
          submissionGroups.set(key, []);
        }
        submissionGroups.get(key).push(eval);
      });
      
      let duplicatesRemoved = 0;
      let totalScoreFixed = 0;
      
      // Process each group of duplicates
      for (const [submissionId, evaluations] of submissionGroups.entries()) {
        if (evaluations.length > 1) {
          console.log(`Found ${evaluations.length} duplicates for submission ${submissionId}`);
          
          // Keep the latest evaluation (by evaluated_at)
          evaluations.sort((a, b) => new Date(b.evaluated_at).getTime() - new Date(a.evaluated_at).getTime());
          const keepEvaluation = evaluations[0];
          const toDelete = evaluations.slice(1);
          
          // Calculate total score from duplicates
          const duplicateScore = toDelete.reduce((sum, eval) => sum + (eval.score || 0), 0);
          totalScoreFixed += duplicateScore;
          
          // Delete the duplicates
          for (const evalToDelete of toDelete) {
            const { error: deleteError } = await supabase
              .from('evaluations')
              .delete()
              .eq('id', evalToDelete.id);
            
            if (deleteError) {
              console.error(`Failed to delete evaluation ${evalToDelete.id}:`, deleteError);
            } else {
              duplicatesRemoved++;
              console.log(`Deleted duplicate evaluation ${evalToDelete.id}`);
            }
          }
        }
      }
      
      // Fix assessment instance total scores
      console.log('Fixing assessment instance total scores...');
      const { data: instances, error: instancesError } = await supabase
        .from('assessment_instances')
        .select('id, total_score');
      
      if (instancesError) throw instancesError;
      
      let instancesFixed = 0;
      for (const instance of instances || []) {
        // Recalculate total score from evaluations
        const { data: instanceEvaluations } = await supabase
          .from('evaluations')
          .select('score')
          .in('submission_id', 
            (await supabase
              .from('submissions')
              .select('id')
              .eq('instance_id', instance.id)
            ).data?.map(s => s.id) || []
          );
        
        const correctTotalScore = instanceEvaluations?.reduce((sum, e) => sum + (e.score || 0), 0) || 0;
        
        if (Math.abs((instance.total_score || 0) - correctTotalScore) > 0.1) {
          const { error: updateError } = await supabase
            .from('assessment_instances')
            .update({ total_score: correctTotalScore })
            .eq('id', instance.id);
          
          if (!updateError) {
            instancesFixed++;
            console.log(`Fixed total score for instance ${instance.id}: ${instance.total_score} -> ${correctTotalScore}`);
          }
        }
      }
      
      console.log(`Cleanup completed: ${duplicatesRemoved} duplicates removed, ${instancesFixed} instances fixed`);
      
      return new Response(JSON.stringify({
        success: true,
        duplicatesRemoved,
        instancesFixed,
        totalScoreFixed,
        message: `Successfully removed ${duplicatesRemoved} duplicate evaluations and fixed ${instancesFixed} assessment instances`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in cleanup-evaluation-duplicates:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
