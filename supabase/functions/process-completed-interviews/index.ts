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
    console.log('Starting batch processing of completed interview assessments...');

    // Step 1: Find all completed interview sessions that need processing and have conversation data
    const { data: allSessions, error: sessionsError } = await supabase
      .from('interview_sessions')
      .select(`
        id,
        instance_id,
        assessment_instances!inner(
          id,
          status,
          evaluation_status
        )
      `)
      .in('assessment_instances.status', ['submitted', 'evaluated']);

    if (sessionsError) {
      throw new Error(`Failed to fetch sessions: ${sessionsError.message}`);
    }

    console.log(`Found ${allSessions?.length || 0} total sessions`);

    // Step 1.1: Filter sessions that have conversation data
    const sessionsToProcess = [];
    const skippedSessions = [];

    if (allSessions) {
      for (const session of allSessions) {
        // Check if session has conversation responses
        const { data: responses, error: responseError } = await supabase
          .from('interview_responses')
          .select('id')
          .eq('session_id', session.id)
          .limit(1);

        if (responseError) {
          console.error(`Error checking responses for session ${session.id}:`, responseError);
          skippedSessions.push({ session: session.id, reason: 'Response check failed' });
          continue;
        }

        if (responses && responses.length > 0) {
          sessionsToProcess.push(session);
        } else {
          console.log(`Skipping session ${session.id} - no conversation data`);
          skippedSessions.push({ session: session.id, reason: 'No conversation data' });
        }
      }
    }

    console.log(`Sessions with conversation data: ${sessionsToProcess.length}`);
    console.log(`Sessions skipped: ${skippedSessions.length}`);
    if (skippedSessions.length > 0) {
      console.log('Skipped sessions:', skippedSessions);
    }


    if (!sessionsToProcess || sessionsToProcess.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No sessions found to process',
        processedCount: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let processedCount = 0;
    let errors: string[] = [];

    // Step 2: Process each session
    for (const session of sessionsToProcess) {
      try {
        console.log(`Processing session ${session.id}...`);

        // Check if conversation intelligence already exists
        const { data: existingIntelligence } = await supabase
          .from('conversation_intelligence')
          .select('id')
          .eq('session_id', session.id)
          .single();

        if (!existingIntelligence) {
          // Trigger interview intelligence analysis
          console.log(`Triggering intelligence analysis for session ${session.id}`);
          const { error: intelligenceError } = await supabase.functions.invoke('trigger-interview-intelligence', {
            body: { sessionId: session.id }
          });

          if (intelligenceError) {
            console.error(`Intelligence analysis failed for session ${session.id}:`, intelligenceError);
            errors.push(`Session ${session.id}: Intelligence analysis failed - ${intelligenceError.message}`);
            continue;
          }

          // Wait a bit for the analysis to complete
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          console.log(`Intelligence data already exists for session ${session.id}`);
        }

        // Check if evaluation already exists
        const { data: existingEvaluation } = await supabase
          .from('evaluations')
          .select('id')
          .eq('submission_id', session.instance_id)
          .single();

        if (!existingEvaluation) {
          // Trigger auto-evaluation for the assessment instance
          console.log(`Triggering auto-evaluation for instance ${session.instance_id}`);
          const { error: evaluationError } = await supabase.functions.invoke('auto-evaluate-assessment', {
            body: { instanceId: session.instance_id }
          });

          if (evaluationError) {
            console.error(`Auto-evaluation failed for instance ${session.instance_id}:`, evaluationError);
            errors.push(`Instance ${session.instance_id}: Auto-evaluation failed - ${evaluationError.message}`);
            continue;
          }
        } else {
          console.log(`Evaluation already exists for instance ${session.instance_id}`);
        }

        processedCount++;
        console.log(`Successfully processed session ${session.id}`);

      } catch (error) {
        console.error(`Error processing session ${session.id}:`, error);
        errors.push(`Session ${session.id}: ${error.message}`);
      }
    }

    // Step 3: Update assessment instance statuses for completed evaluations
    const { error: updateError } = await supabase
      .from('assessment_instances')
      .update({ 
        status: 'evaluated',
        evaluation_status: 'completed',
        evaluated_at: new Date().toISOString()
      })
      .in('id', sessionsToProcess.map(s => s.instance_id))
      .eq('status', 'submitted');

    if (updateError) {
      console.error('Failed to update assessment instance statuses:', updateError);
      errors.push(`Failed to update instance statuses: ${updateError.message}`);
    }

    console.log(`Batch processing completed. Processed: ${processedCount}, Errors: ${errors.length}`);

    return new Response(JSON.stringify({ 
      success: true,
      message: `Batch processing completed successfully`,
      processedCount,
      totalSessions: sessionsToProcess.length,
      errors: errors.length > 0 ? errors : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in batch processing:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});