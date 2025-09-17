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
  console.log('trigger-evaluations function started successfully');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { forceSeleniumReEvaluation, assessmentId, reprocessEvaluated = false, force = false } = await req.json().catch(() => ({}));
    
    if (forceSeleniumReEvaluation) {
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
          submitted_at
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

          // Trigger fresh evaluation
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
    }

    console.log('Starting evaluation trigger process...');

    // Build query with optional assessment filtering and status conditions
    let query = supabase
      .from('assessment_instances')
      .select(`
        id,
        assessment_id,
        participant_email,
        participant_name,
        evaluation_status,
        status,
        max_possible_score,
        total_score
      `);

    // Filter by assessment if specified
    if (assessmentId) {
      query = query.eq('assessment_id', assessmentId);
    }

    // Always include submitted instances, and include evaluated instances if reprocessEvaluated is true OR if no specific assessment is selected
    if (reprocessEvaluated || !assessmentId) {
      query = query.or('status.eq.submitted,status.eq.evaluated');
    } else {
      query = query.eq('status', 'submitted');
    }

    const { data: instances, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch instances: ${fetchError.message}`);
    }

    console.log(`Found ${instances?.length || 0} instances to process`);

    let processedCount = 0;
    let evaluatedCount = 0;
    let scoredZeroCount = 0;
    let reprocessedCount = 0;
    let fixedCorrupted = 0;

    for (const instance of instances || []) {
      try {
        // Check if this instance has any submissions
        const { data: submissions, error: submissionError } = await supabase
          .from('submissions')
          .select('id')
          .eq('instance_id', instance.id);

        if (submissionError) {
          console.error(`Error checking submissions for instance ${instance.id}:`, submissionError);
          continue;
        }

        // Check if this instance has actual evaluations and get their scores
        const { data: evaluations, error: evalCheckError } = await supabase
          .from('evaluations')
          .select('id, score, max_score')
          .in('submission_id', (submissions || []).map(s => s.id));

        if (evalCheckError) {
          console.error(`Error checking evaluations for instance ${instance.id}:`, evalCheckError);
          continue;
        }

        const hasSubmissions = submissions && submissions.length > 0;
        const hasEvaluations = evaluations && evaluations.length > 0;

        // Calculate correct scores from evaluations
        let correctTotalScore = 0;
        let correctMaxScore = 0;
        
        if (hasEvaluations) {
          correctTotalScore = evaluations.reduce((sum, evaluation) => sum + (evaluation.score || 0), 0);
          correctMaxScore = evaluations.reduce((sum, evaluation) => sum + (evaluation.max_score || 0), 0);
        }

        if (!hasSubmissions) {
          // No submissions - mark as evaluated with 0 score
          const { error: updateError } = await supabase
            .from('assessment_instances')
            .update({
              evaluation_status: 'completed',
              total_score: 0,
              max_possible_score: instance.max_possible_score || 100,
              evaluated_at: new Date().toISOString(),
              status: 'evaluated'
            })
            .eq('id', instance.id);

          if (updateError) {
            console.error(`Error updating instance ${instance.id}:`, updateError);
          } else {
            scoredZeroCount++;
            console.log(`Scored instance ${instance.id} as 0 (no submissions)`);
          }
        } else if (!hasEvaluations) {
          // Has submissions but no evaluations - need to evaluate
          console.log(`Instance ${instance.id} has submissions but no evaluations, triggering evaluation...`);
          
          // Reset evaluation status to ensure proper processing
          await supabase
            .from('assessment_instances')
            .update({
              evaluation_status: 'not_started'
            })
            .eq('id', instance.id);

          const { error: evalError } = await supabase.functions.invoke('auto-evaluate-assessment', {
            body: { instanceId: instance.id }
          });

          if (evalError) {
            console.error(`Error evaluating instance ${instance.id}:`, evalError);
          } else {
            evaluatedCount++;
            if (instance.evaluation_status === 'completed') {
              reprocessedCount++;
              console.log(`Re-processed corrupted instance ${instance.id}`);
            } else {
              console.log(`Triggered evaluation for instance ${instance.id}`);
            }
          }
        } else if (instance.evaluation_status === 'not_started') {
          // Has both submissions and evaluations but marked as not started - trigger evaluation
          const { error: evalError } = await supabase.functions.invoke('auto-evaluate-assessment', {
            body: { instanceId: instance.id }
          });

          if (evalError) {
            console.error(`Error evaluating instance ${instance.id}:`, evalError);
          } else {
            evaluatedCount++;
            console.log(`Triggered evaluation for instance ${instance.id}`);
          }
        } else if (hasEvaluations) {
          // Check if cached scores match calculated scores
          const cachedTotal = instance.total_score || 0;
          const cachedMax = instance.max_possible_score || 0;
          
          const totalMismatch = Math.abs(cachedTotal - correctTotalScore) > 0.1;
          const maxMismatch = Math.abs(cachedMax - correctMaxScore) > 0.1;
          
          if (totalMismatch || maxMismatch) {
            console.log(`Fixing corrupted scores for instance ${instance.id}: cached ${cachedTotal}/${cachedMax} vs actual ${correctTotalScore}/${correctMaxScore}`);
            
            // Update with correct scores
            await supabase
              .from('assessment_instances')
              .update({
                total_score: Math.round(correctTotalScore),
                max_possible_score: correctMaxScore,
                evaluation_status: 'completed',
                status: 'evaluated',
                evaluated_at: new Date().toISOString()
              })
              .eq('id', instance.id);
            
            fixedCorrupted++;
          } else if (force && reprocessEvaluated) {
            // Force re-evaluation even if scores match
            const { error: evalError } = await supabase.functions.invoke('auto-evaluate-assessment', {
              body: { instanceId: instance.id, forceReEvaluation: true }
            });

            if (evalError) {
              console.error(`Error force re-evaluating instance ${instance.id}:`, evalError);
            } else {
              evaluatedCount++;
              console.log(`Force re-evaluated instance ${instance.id}`);
            }
          } else {
            console.log(`Instance ${instance.id} already properly evaluated with correct scores, skipping`);
          }
        } else {
          console.log(`Instance ${instance.id} already properly evaluated, skipping`);
        }

        processedCount++;
      } catch (error) {
        console.error(`Error processing instance ${instance.id}:`, error);
      }
    }

    console.log(`Evaluation trigger completed. Processed: ${processedCount}, Evaluated: ${evaluatedCount}, Scored Zero: ${scoredZeroCount}, Re-processed corrupted: ${reprocessedCount}, Fixed corrupted: ${fixedCorrupted}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Evaluation process completed',
      processed: processedCount,
      evaluated: evaluatedCount,
      scored_zero: scoredZeroCount,
      reprocessed_corrupted: reprocessedCount,
      fixed_corrupted: fixedCorrupted,
      total_found: instances?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in trigger-evaluations:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});