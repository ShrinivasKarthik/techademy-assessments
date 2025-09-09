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
    console.log('Starting Selenium re-evaluation process...');

    // Find all coding questions that might be Selenium-related
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, title, question_text')
      .eq('question_type', 'coding')
      .or('title.ilike.%selenium%,question_text.ilike.%selenium%,question_text.ilike.%webdriver%');

    if (questionsError) {
      throw new Error(`Failed to fetch Selenium questions: ${questionsError.message}`);
    }

    const questionIds = questions?.map(q => q.id) || [];
    console.log(`Found ${questionIds.length} potential Selenium questions`);

    if (questionIds.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No Selenium questions found',
        processed: 0,
        re_evaluated: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find all submissions for these questions
    const { data: submissions, error: submissionsError } = await supabase
      .from('submissions')
      .select(`
        id,
        instance_id,
        question_id,
        answer,
        submitted_at,
        evaluations!evaluations_submission_id_fkey(
          id,
          score,
          max_score,
          ai_feedback,
          evaluated_at
        )
      `)
      .in('question_id', questionIds)
      .not('answer', 'is', null);

    if (submissionsError) {
      throw new Error(`Failed to fetch submissions: ${submissionsError.message}`);
    }

    console.log(`Found ${submissions?.length || 0} submissions to re-evaluate`);

    let processedCount = 0;
    let reEvaluatedCount = 0;
    let errorCount = 0;

    for (const submission of submissions || []) {
      try {
        console.log(`Re-evaluating submission ${submission.id}...`);

        // Delete existing evaluations for this submission
        const { error: deleteError } = await supabase
          .from('evaluations')
          .delete()
          .eq('submission_id', submission.id);

        if (deleteError) {
          console.error(`Error deleting old evaluations for submission ${submission.id}:`, deleteError);
          errorCount++;
          continue;
        }

        // Trigger fresh evaluation using the updated Selenium evaluation
        const { error: evalError } = await supabase.functions.invoke('auto-evaluate-assessment', {
          body: { instanceId: submission.instance_id, forceReEvaluation: true }
        });

        if (evalError) {
          console.error(`Error re-evaluating submission ${submission.id}:`, evalError);
          errorCount++;
        } else {
          reEvaluatedCount++;
          console.log(`Successfully re-evaluated submission ${submission.id}`);
        }

        processedCount++;

        // Add a small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Error processing submission ${submission.id}:`, error);
        errorCount++;
        processedCount++;
      }
    }

    console.log(`Selenium re-evaluation completed. Processed: ${processedCount}, Re-evaluated: ${reEvaluatedCount}, Errors: ${errorCount}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Selenium re-evaluation process completed',
      processed: processedCount,
      re_evaluated: reEvaluatedCount,
      errors: errorCount,
      total_submissions: submissions?.length || 0,
      selenium_questions_found: questionIds.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in re-evaluate-selenium-submissions:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});