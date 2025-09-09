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
    console.log('Starting cleanup of stuck assessments...');

    // Get all stuck assessment instances
    const { data: stuckInstances, error: fetchError } = await supabase
      .from('assessment_instances')
      .select(`
        id,
        assessment_id,
        started_at,
        questions_answered,
        assessments!assessment_instances_assessment_id_fkey(duration_minutes)
      `)
      .eq('status', 'in_progress');

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${stuckInstances?.length || 0} stuck instances`);

    if (!stuckInstances || stuckInstances.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No stuck assessments found',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    const instancesToSubmit = [];

    // Identify instances that should be auto-submitted
    for (const instance of stuckInstances) {
      const startedAt = new Date(instance.started_at);
      const elapsedMinutes = (now.getTime() - startedAt.getTime()) / (1000 * 60);
      const durationMinutes = instance.assessments.duration_minutes;

      // Auto-submit if:
      // 1. Time has expired (elapsed >= duration)
      // 2. Abandoned session (< 3 questions answered AND inactive for 30+ minutes)
      const shouldSubmitTimeExpired = elapsedMinutes >= durationMinutes;
      const shouldSubmitAbandoned = instance.questions_answered < 3 && elapsedMinutes >= 30;

      if (shouldSubmitTimeExpired || shouldSubmitAbandoned) {
        const durationTaken = Math.min(elapsedMinutes * 60, durationMinutes * 60); // Cap at max duration
        const timeRemaining = Math.max(0, (durationMinutes * 60) - durationTaken);

        instancesToSubmit.push({
          id: instance.id,
          duration_taken_seconds: Math.floor(durationTaken),
          time_remaining_seconds: Math.floor(timeRemaining),
          submitted_at: shouldSubmitTimeExpired 
            ? new Date(startedAt.getTime() + (durationMinutes * 60 * 1000)).toISOString()
            : now.toISOString(),
          reason: shouldSubmitTimeExpired ? 'time_expired' : 'abandoned'
        });
      }
    }

    console.log(`Auto-submitting ${instancesToSubmit.length} instances`);

    // Batch update all instances to submitted status
    const submittedInstanceIds = [];
    for (const instance of instancesToSubmit) {
      const { error: updateError } = await supabase
        .from('assessment_instances')
        .update({
          status: 'submitted',
          submitted_at: instance.submitted_at,
          duration_taken_seconds: instance.duration_taken_seconds,
          time_remaining_seconds: instance.time_remaining_seconds,
        })
        .eq('id', instance.id)
        .eq('status', 'in_progress'); // Only update if still in progress

      if (updateError) {
        console.error(`Error updating instance ${instance.id}:`, updateError);
      } else {
        submittedInstanceIds.push(instance.id);
        console.log(`Auto-submitted instance ${instance.id} (${instance.reason})`);
      }
    }

    // Trigger evaluations for all successfully submitted instances
    console.log(`Triggering evaluations for ${submittedInstanceIds.length} instances`);
    const evaluationPromises = submittedInstanceIds.map(instanceId => 
      supabase.functions.invoke('auto-evaluate-assessment', {
        body: { instanceId }
      }).catch(error => {
        console.error(`Error triggering evaluation for ${instanceId}:`, error);
        return { error };
      })
    );

    // Wait for all evaluations to be triggered (but not completed)
    const evaluationResults = await Promise.allSettled(evaluationPromises);
    const successfulEvaluations = evaluationResults.filter(result => 
      result.status === 'fulfilled' && !result.value.error
    ).length;

    console.log(`Successfully triggered ${successfulEvaluations} evaluations`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Cleanup completed successfully',
      processed: submittedInstanceIds.length,
      found_stuck: stuckInstances.length,
      evaluations_triggered: successfulEvaluations,
      details: {
        auto_submitted: submittedInstanceIds.length,
        time_expired: instancesToSubmit.filter(i => i.reason === 'time_expired').length,
        abandoned: instancesToSubmit.filter(i => i.reason === 'abandoned').length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error during cleanup:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});