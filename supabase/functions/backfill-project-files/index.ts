import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assessmentTitle, dryRun = true } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Supabase environment not configured');
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    let assessmentFilter = '';
    let assessmentParams: any = {};

    if (assessmentTitle) {
      assessmentFilter = '.ilike.title,*' + assessmentTitle + '*';
      assessmentParams.title = `%${assessmentTitle}%`;
    }

    // Find assessments with project_based questions that don't have project files
    const { data: assessments, error: assessmentError } = await supabase
      .from('assessments')
      .select(`
        id,
        title,
        questions!questions_assessment_id_fkey(
          id,
          title,
          question_type,
          config
        )
      `)
      .not('questions', 'is', null);

    if (assessmentError) {
      console.error('Assessment fetch error:', assessmentError);
      throw new Error('Failed to fetch assessments');
    }

    const results = [];
    let totalFixed = 0;

    for (const assessment of assessments || []) {
      const projectQuestions = assessment.questions?.filter(q => q.question_type === 'project_based') || [];
      
      if (projectQuestions.length === 0) continue;

      const assessmentResult = {
        assessmentId: assessment.id,
        assessmentTitle: assessment.title,
        projectQuestions: [],
        questionsFixed: 0
      };

      for (const question of projectQuestions) {
        // Check if question already has project files
        const { data: existingFiles, error: filesError } = await supabase
          .from('project_files')
          .select('id')
          .eq('question_id', question.id)
          .limit(1);

        if (filesError) {
          console.error(`Files check error for question ${question.id}:`, filesError);
          continue;
        }

        const hasFiles = existingFiles && existingFiles.length > 0;
        const questionResult = {
          questionId: question.id,
          questionTitle: question.title,
          hasFiles,
          action: 'none',
          sourceFound: false,
          cloned: false
        };

        if (!hasFiles) {
          // Try to find source question by matching title/technology
          const config = question.config || {};
          const technology = config.technology || '';
          
          let sourceQuery = supabase
            .from('questions')
            .select('id, title, question_type, config')
            .eq('question_type', 'project_based')
            .neq('id', question.id)
            .not('assessment_id', 'is', null); // Only questions from question bank/other assessments

          // For "Health App Spring Boot", try specific matching
          if (question.title.toLowerCase().includes('health') && 
              question.title.toLowerCase().includes('spring boot')) {
            sourceQuery = sourceQuery.or(
              `title.ilike.*health*spring*boot*,title.ilike.*spring*boot*health*,config->>technology.ilike.*spring*boot*`
            );
          } else if (technology) {
            sourceQuery = sourceQuery.eq('config->>technology', technology);
          } else {
            sourceQuery = sourceQuery.ilike('title', `%${question.title}%`);
          }

          const { data: potentialSources } = await sourceQuery.limit(5);

          let bestSource: any = null;
          if (potentialSources && potentialSources.length > 0) {
            // Find best match - first check for exact tech match, then title similarity
            for (const src of potentialSources) {
              const { data: srcFiles } = await supabase
                .from('project_files')
                .select('id')
                .eq('question_id', src.id)
                .limit(1);

              if (srcFiles && srcFiles.length > 0) {
                bestSource = src;
                break;
              }
            }
          }

          if (bestSource) {
            questionResult.sourceFound = true;
            questionResult.action = dryRun ? 'would-clone' : 'cloning';

            if (!dryRun) {
              try {
                const { data: cloneResult } = await supabase.functions.invoke('clone-project-files', {
                  body: {
                    sourceQuestionId: bestSource.id,
                    targetQuestionId: question.id,
                    overwrite: false
                  }
                });

                if (cloneResult?.success) {
                  questionResult.cloned = true;
                  assessmentResult.questionsFixed++;
                  totalFixed++;
                }
              } catch (cloneError) {
                console.error(`Clone failed for ${question.id}:`, cloneError);
                questionResult.action = 'clone-failed';
              }
            }
          } else {
            questionResult.action = 'no-source-found';
          }
        }

        assessmentResult.projectQuestions.push(questionResult);
      }

      if (assessmentResult.projectQuestions.length > 0) {
        results.push(assessmentResult);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      dryRun,
      totalAssessments: results.length,
      totalQuestionsFixed: totalFixed,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('backfill-project-files error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});