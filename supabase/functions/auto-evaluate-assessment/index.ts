import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { instanceId } = await req.json();
    
    if (!instanceId) {
      throw new Error('Instance ID is required');
    }

    console.log(`Starting evaluation for instance: ${instanceId}`);

    // Fetch assessment instance
    const { data: instance, error: instanceError } = await supabase
      .from('assessment_instances')
      .select('*')
      .eq('id', instanceId)
      .single();

    if (instanceError || !instance) {
      throw new Error(`Failed to fetch assessment instance: ${instanceError?.message}`);
    }

    // Fetch assessment details
    const { data: assessment, error: assessmentError } = await supabase
      .from('assessments')
      .select('*')
      .eq('id', instance.assessment_id)
      .single();

    if (assessmentError || !assessment) {
      throw new Error(`Failed to fetch assessment: ${assessmentError?.message}`);
    }

    // Fetch submissions for this instance
    const { data: submissions, error: submissionsError } = await supabase
      .from('submissions')
      .select('*')
      .eq('instance_id', instanceId);

    if (submissionsError) {
      throw new Error(`Failed to fetch submissions: ${submissionsError?.message}`);
    }

    // Fetch questions separately to avoid relationship conflicts
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, question_type, points, config')
      .eq('assessment_id', instance.assessment_id);

    if (questionsError) {
      throw new Error(`Failed to fetch questions: ${questionsError?.message}`);
    }

    // Create a map for easy question lookup
    const questionMap = new Map(questions?.map(q => [q.id, q]) || []);

    // Fetch proctoring data
    const { data: proctoringSession, error: proctoringError } = await supabase
      .from('proctoring_sessions')
      .select('*')
      .eq('assessment_instance_id', instanceId)
      .single();

    let integrityScore = 100;
    let proctoringNotes = '';
    let violations: any[] = [];
    let securityEvents: any[] = [];

    if (proctoringSession && !proctoringError) {
      violations = proctoringSession.security_events || [];
      securityEvents = proctoringSession.monitoring_data?.security_events || [];
      
      // Calculate integrity score based on violations
      integrityScore = calculateIntegrityScore(violations.concat(securityEvents));
      proctoringNotes = generateProctoringNotes(violations, securityEvents);

      // Create proctoring report
      await createProctoringReport(instanceId, instance, violations.concat(securityEvents), integrityScore);
    }

    // Check if evaluation already exists to prevent duplicates
    const { data: existingEvaluations } = await supabase
      .from('evaluations')
      .select('submission_id')
      .in('submission_id', (submissions || []).map(s => s.id));

    const evaluatedSubmissionIds = new Set(existingEvaluations?.map(e => e.submission_id) || []);

    let totalScore = 0;
    let maxPossibleScore = 0;
    const evaluationPromises: Promise<void>[] = [];

    // First pass: Evaluate MCQ questions instantly and collect background evaluation promises
    for (const submission of submissions || []) {
      const question = questionMap.get(submission.question_id);
      if (!question) continue;

      maxPossibleScore += question.points || 0;

      // Skip if already evaluated
      if (evaluatedSubmissionIds.has(submission.id)) {
        console.log(`Submission ${submission.id} already evaluated, fetching existing score`);
        const { data: existingEval } = await supabase
          .from('evaluations')
          .select('score')
          .eq('submission_id', submission.id)
          .single();
        if (existingEval) {
          totalScore += existingEval.score || 0;
        }
        continue;
      }

      let score = 0;
      switch (question.question_type) {
        case 'mcq':
          // MCQ evaluation is instant
          score = evaluateMCQ(submission, question);
          totalScore += score;

          // Insert evaluation immediately for MCQ using UPSERT to prevent duplicates
          await supabase
            .from('evaluations')
            .upsert({
              submission_id: submission.id,
              score: score,
              max_score: question.points || 0,
              integrity_score: integrityScore,
              feedback: 'Automated MCQ evaluation',
              evaluated_at: new Date().toISOString()
            }, { onConflict: 'submission_id' });
          break;
        
        case 'subjective':
        case 'coding':
          // Start AI evaluation in background but don't wait
          if (openAIApiKey) {
            const aiEvaluationPromise = (async () => {
              try {
                let aiScore = 0;
                let aiFeedback = null;
                
                if (question.question_type === 'subjective') {
                  aiScore = await evaluateSubjectiveWithAI(submission, question);
                } else if (question.question_type === 'coding') {
                  // Check if this is a Selenium assessment by looking at question config and submission content
                  const isSeleniumQuestion = question.config?.language?.includes('selenium') || 
                                           question.config?.questionType === 'selenium' ||
                                           (submission.answer?.files && submission.answer.files.length > 0 &&
                                            typeof submission.answer.files[0]?.content === 'string' && 
                                            (submission.answer.files[0].content.includes('WebDriver') || 
                                             submission.answer.files[0].content.includes('selenium') ||
                                             submission.answer.files[0].content.includes('driver.find') ||
                                             submission.answer.files[0].content.includes('By.xpath') ||
                                             submission.answer.files[0].content.includes('By.id'))) ||
                                           (typeof submission.answer?.code === 'string' && 
                                            (submission.answer.code.includes('WebDriver') || 
                                             submission.answer.code.includes('selenium') ||
                                             submission.answer.code.includes('driver.find')));
                  
                  if (isSeleniumQuestion) {
                    console.log(`Evaluating Selenium question ${question.id}`);
                    const seleniumEvaluation = await evaluateSeleniumWithAI(submission, question);
                    aiScore = seleniumEvaluation.score;
                    aiFeedback = seleniumEvaluation.feedback;
                  } else {
                    aiScore = await evaluateCodingWithAI(submission, question);
                  }
                }

                // Update evaluation with AI score and feedback
                // Check for existing evaluation first
                const { data: existingEval } = await supabase
                  .from('evaluations')
                  .select('id')
                  .eq('submission_id', submission.id)
                  .single();

                // Use UPSERT to prevent duplicates and handle conflicts gracefully
                await supabase
                  .from('evaluations')
                  .upsert({
                    submission_id: submission.id,
                    score: aiScore,
                    max_score: question.points || 0,
                    integrity_score: integrityScore,
                    ai_feedback: aiFeedback,
                    feedback: aiFeedback ? JSON.stringify(aiFeedback) : `AI-powered ${question.question_type} evaluation`,
                    evaluated_at: new Date().toISOString()
                  }, { onConflict: 'submission_id' });

                console.log(`Evaluation created/updated for submission ${submission.id} with score ${aiScore}`);
              } catch (error) {
                console.error(`AI evaluation failed for ${question.question_type} question:`, error);
                // Insert fallback evaluation with 0 score using UPSERT
                await supabase
                  .from('evaluations')
                  .upsert({
                    submission_id: submission.id,
                    score: 0,
                    max_score: question.points || 0,
                    integrity_score: integrityScore,
                    feedback: `AI evaluation failed: ${error.message}`,
                    evaluated_at: new Date().toISOString()
                  }, { onConflict: 'submission_id' });
              }
            })();
            
            evaluationPromises.push(aiEvaluationPromise);
          } else {
            // No AI key, insert 0 score evaluation using UPSERT
            await supabase
              .from('evaluations')
              .upsert({
                submission_id: submission.id,
                score: 0,
                max_score: question.points || 0,
                integrity_score: integrityScore,
                feedback: 'Manual evaluation required (no AI key)',
                evaluated_at: new Date().toISOString()
              }, { onConflict: 'submission_id' });
          }
          break;
        
        case 'interview':
          // Start interview evaluation in background
          const interviewEvaluationPromise = (async () => {
            try {
              console.log(`Starting interview evaluation for question ${question.id}, submission ${submission.id}`);
              
              // Find the interview session for this submission
              const { data: interviewSession, error: sessionError } = await supabase
                .from('interview_sessions')
                .select('id, current_state, final_score')
                .eq('instance_id', instanceId)
                .eq('question_id', question.id)
                .single();

              if (sessionError || !interviewSession) {
                console.error('Interview session not found:', sessionError);
                throw new Error('Interview session not found');
              }

              // Trigger interview intelligence analysis and wait for completion
              console.log('Triggering interview intelligence analysis...');
              await supabase.functions.invoke('trigger-interview-intelligence', {
                body: { sessionId: interviewSession.id }
              });

              // Wait for intelligence analysis to complete (with timeout)
              let analysisComplete = false;
              let attempts = 0;
              const maxAttempts = 10; // 30 seconds max wait
              
              while (!analysisComplete && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
                attempts++;
                
                // Check if performance metrics are available
                const { data: performanceMetrics } = await supabase
                  .from('interview_performance_metrics')
                  .select('overall_score, communication_score, technical_score, behavioral_score')
                  .eq('session_id', interviewSession.id)
                  .single();
                
                if (performanceMetrics && performanceMetrics.overall_score !== null) {
                  analysisComplete = true;
                  
                  // Calculate interview score based on performance metrics
                  const interviewScore = Math.round(
                    (performanceMetrics.overall_score / 100) * (question.points || 10)
                  );
                  
                  // Get conversation intelligence for feedback
                  const { data: conversationIntelligence } = await supabase
                    .from('conversation_intelligence')
                    .select('ai_insights, competency_analysis, recommendations')
                    .eq('session_id', interviewSession.id)
                    .single();
                  
                  const aiFeedback = {
                    overall_score: performanceMetrics.overall_score,
                    communication_score: performanceMetrics.communication_score,
                    technical_score: performanceMetrics.technical_score,
                    behavioral_score: performanceMetrics.behavioral_score,
                    ai_insights: conversationIntelligence?.ai_insights || {},
                    competency_analysis: conversationIntelligence?.competency_analysis || {},
                    recommendations: conversationIntelligence?.recommendations || []
                  };
                  
                  // Create evaluation record using UPSERT
                  await supabase
                    .from('evaluations')
                    .upsert({
                      submission_id: submission.id,
                      score: interviewScore,
                      max_score: question.points || 0,
                      integrity_score: integrityScore,
                      ai_feedback: aiFeedback,
                      feedback: `Interview evaluation - Overall: ${performanceMetrics.overall_score}%, Communication: ${performanceMetrics.communication_score}%, Technical: ${performanceMetrics.technical_score}%`,
                      evaluated_at: new Date().toISOString()
                    }, { onConflict: 'submission_id' });

                  console.log(`Interview evaluation completed with score: ${interviewScore}/${question.points}`);
                  
                  console.log(`Interview evaluation completed with score: ${interviewScore}/${question.points}`);
                }
              }
              
              if (!analysisComplete) {
                console.warn('Interview analysis timed out, creating fallback evaluation');
                // Create fallback evaluation
                await supabase
                  .from('evaluations')
                  .upsert({
                    submission_id: submission.id,
                    score: Math.round((question.points || 10) * 0.5), // 50% fallback score
                    max_score: question.points || 0,
                    integrity_score: integrityScore,
                    feedback: 'Interview evaluation - Analysis pending',
                    evaluated_at: new Date().toISOString()
                  });
              }
              
            } catch (error) {
              console.error('Interview evaluation failed:', error);
              // Insert fallback evaluation
              await supabase
                .from('evaluations')
                .upsert({
                  submission_id: submission.id,
                  score: 0,
                  max_score: question.points || 0,
                  integrity_score: integrityScore,
                  feedback: `Interview evaluation failed: ${error.message}`,
                  evaluated_at: new Date().toISOString()
                });
            }
          })();
          
          evaluationPromises.push(interviewEvaluationPromise);
          break;
        
        case 'project_based':
          // Start project-based evaluation in background
          const projectEvaluationPromise = (async () => {
            try {
              console.log(`Starting project-based evaluation for question ${question.id}, submission ${submission.id}`);
              
              // Extract project files from submission
              let projectCode = '';
              let language = 'javascript'; // default
              let questionContext = question.config?.description || question.config?.title || '';
              
              if (submission.answer?.files && Array.isArray(submission.answer.files)) {
                // Multi-file project submission
                const mainFiles = submission.answer.files.filter((file: any) => 
                  file.isMainFile || file.file_name?.includes('main') || file.file_name?.includes('index')
                );
                const filesToAnalyze = mainFiles.length > 0 ? mainFiles : submission.answer.files.slice(0, 3); // Analyze up to 3 files
                
                projectCode = filesToAnalyze.map((file: any) => 
                  `// File: ${file.file_name || file.path || 'unnamed'}\n${file.content || file.file_content || ''}`
                ).join('\n\n');
                
                // Determine language from file extensions
                const firstFile = filesToAnalyze[0];
                if (firstFile?.file_name) {
                  const extension = firstFile.file_name.split('.').pop()?.toLowerCase();
                  const languageMap: {[key: string]: string} = {
                    'js': 'javascript',
                    'ts': 'typescript',
                    'py': 'python',
                    'java': 'java',
                    'cpp': 'cpp',
                    'c': 'c',
                    'cs': 'csharp',
                    'php': 'php',
                    'go': 'go',
                    'rb': 'ruby'
                  };
                  language = languageMap[extension || ''] || firstFile.language || 'javascript';
                }
              } else if (submission.answer?.code) {
                // Single code submission
                projectCode = submission.answer.code;
                language = submission.answer.language || question.config?.language || 'javascript';
              } else {
                throw new Error('No code found in project submission');
              }
              
              if (!projectCode.trim()) {
                throw new Error('Empty code submission');
              }
              
              console.log(`Analyzing ${projectCode.length} characters of ${language} code`);
              
              // Call enhanced-code-execution function for comprehensive analysis
              const { data: executionResult, error: executionError } = await supabase.functions.invoke('enhanced-code-execution', {
                body: {
                  code: projectCode,
                  language: language,
                  testCases: question.config?.testCases || [],
                  executionMode: 'standard',
                  debugMode: false,
                  performanceAnalysis: true,
                  enableHints: true,
                  realTimeAnalysis: true
                }
              });
              
              if (executionError) {
                throw new Error(`Enhanced code execution failed: ${executionError.message}`);
              }
              
              const execution = executionResult;
              if (!execution) {
                throw new Error('No execution results received');
              }
              
              // Calculate score based on multiple factors from enhanced execution
              let scoreFactors = {
                codeQuality: execution.codeQuality?.score || 0,
                testResults: 0,
                performance: 0,
                errors: 0
              };
              
              // Test results scoring
              if (execution.testResults && execution.testResults.length > 0) {
                const passedTests = execution.testResults.filter(test => test.passed).length;
                scoreFactors.testResults = (passedTests / execution.testResults.length) * 100;
              } else {
                // If no tests, base on success and code quality
                scoreFactors.testResults = execution.success ? 75 : 25;
              }
              
              // Performance scoring
              if (execution.performance?.timeComplexity) {
                const complexityScore = {
                  'O(1)': 100, 'O(log n)': 90, 'O(n)': 80, 'O(n log n)': 70,
                  'O(n²)': 50, 'O(n³)': 30, 'O(2^n)': 10
                }[execution.performance.timeComplexity] || 60;
                scoreFactors.performance = complexityScore;
              } else {
                scoreFactors.performance = 60; // neutral score
              }
              
              // Errors penalty
              scoreFactors.errors = Math.max(0, 100 - (execution.errors?.length || 0) * 20);
              
              // Weighted overall score
              const overallScore = Math.round(
                (scoreFactors.codeQuality * 0.3) +
                (scoreFactors.testResults * 0.4) +
                (scoreFactors.performance * 0.2) +
                (scoreFactors.errors * 0.1)
              );
              
              const projectScore = Math.round((overallScore / 100) * (question.points || 10));
              
              // Create comprehensive feedback from enhanced execution results
              const aiFeedback = {
                overallScore: overallScore,
                executionResults: {
                  success: execution.success,
                  executionTime: execution.executionTime,
                  testResults: execution.testResults || [],
                  errors: execution.errors || [],
                  warnings: execution.warnings || []
                },
                codeQuality: execution.codeQuality || {},
                performance: execution.performance || {},
                debugging: execution.debugging || {},
                hints: execution.hints || [],
                improvements: execution.improvements || [],
                optimizationSuggestions: execution.optimizationSuggestions || [],
                scoreBreakdown: scoreFactors
              };
              
              const feedbackText = `Enhanced Project Evaluation - Overall Score: ${overallScore}%
Test Results: ${execution.testResults ? `${execution.testResults.filter(t => t.passed).length}/${execution.testResults.length} passed` : 'No tests provided'}
Code Quality Score: ${execution.codeQuality?.score || 'N/A'}%
Performance: ${execution.performance?.timeComplexity || 'Not analyzed'} time complexity
${execution.errors?.length > 0 ? `Errors Found: ${execution.errors.length}` : 'No errors detected'}
${execution.warnings?.length > 0 ? `Warnings: ${execution.warnings.length}` : ''}
${execution.hints?.length > 0 ? `\nHints: ${execution.hints.slice(0, 2).join('; ')}` : ''}
${execution.improvements?.length > 0 ? `\nSuggested Improvements: ${execution.improvements.slice(0, 3).join('; ')}` : ''}`;
              
              // Create evaluation record - check for existing evaluation first
              const { data: existingEval } = await supabase
                .from('evaluations')
                .select('id')
                .eq('submission_id', submission.id)
                .single();

              if (!existingEval) {
                await supabase
                  .from('evaluations')
                  .insert({
                    submission_id: submission.id,
                    score: projectScore,
                    max_score: question.points || 0,
                    integrity_score: integrityScore,
                    ai_feedback: aiFeedback,
                    feedback: feedbackText,
                    evaluated_at: new Date().toISOString()
                  });

                // Score will be calculated in final aggregation step
              } else {
                console.log(`Evaluation already exists for submission ${submission.id}, skipping`);
              }
              
              console.log(`Project evaluation completed with score: ${projectScore}/${question.points}`);
              
            } catch (error) {
              console.error('Project-based evaluation failed:', error);
              // Insert fallback evaluation
              await supabase
                .from('evaluations')
                .upsert({
                  submission_id: submission.id,
                  score: 0,
                  max_score: question.points || 0,
                  integrity_score: integrityScore,
                  feedback: `Project evaluation failed: ${error.message}`,
                  evaluated_at: new Date().toISOString()
                });
            }
          })();
          
          evaluationPromises.push(projectEvaluationPromise);
          break;
        default:
          console.log(`Skipping evaluation for question type: ${question.question_type}`);
      }
    }

    // Handle the update based on whether there are background evaluations
    if (evaluationPromises.length > 0) {
      // Set status to in_progress while background evaluations run
      const { error: updateError } = await supabase
        .from('assessment_instances')
        .update({
          status: 'submitted',
          evaluation_status: 'in_progress',
          total_score: Math.round(totalScore), // MCQ scores only for now
          max_possible_score: maxPossibleScore,
          integrity_score: integrityScore,
          proctoring_summary: {
            integrity_score: integrityScore,
            violations_count: violations.length + securityEvents.length,
            technical_issues: securityEvents.filter(event => 
              event.type === 'technical_issue' || 
              event.violation_type === 'technical_issue'
            ),
            notes: proctoringNotes
          }
        })
        .eq('id', instanceId);

      if (updateError) {
        console.error('Error updating assessment instance:', updateError);
        throw new Error(`Failed to update assessment instance: ${updateError.message}`);
      }

      // Wait for all background evaluations to complete, then update final scores
      EdgeRuntime.waitUntil(
        Promise.all(evaluationPromises).then(async () => {
          try {
            console.log('Background evaluations completed, calculating final scores...');
            
            // Recompute total scores from evaluations table
            const submissionIds = (submissions || []).map(s => s.id);
            const { data: finalEvaluations } = await supabase
              .from('evaluations')
              .select('score, max_score')
              .in('submission_id', submissionIds);

            const finalTotalScore = (finalEvaluations || []).reduce((sum, evaluation) => sum + (evaluation.score || 0), 0);
            const finalMaxScore = (finalEvaluations || []).reduce((sum, evaluation) => sum + (evaluation.max_score || 0), 0);

            // Final update with complete scores
            await supabase
              .from('assessment_instances')
              .update({
                status: 'evaluated',
                evaluation_status: 'completed',
                total_score: Math.round(finalTotalScore),
                max_possible_score: finalMaxScore,
                evaluated_at: new Date().toISOString()
              })
              .eq('id', instanceId);

            console.log(`Final evaluation completed for instance ${instanceId}: ${finalTotalScore}/${finalMaxScore}`);
          } catch (error) {
            console.error('Error in background evaluation completion:', error);
          }
        })
      );

      console.log(`Evaluation started for instance ${instanceId} with ${evaluationPromises.length} background tasks`);
      return new Response(JSON.stringify({
        success: true,
        message: 'Evaluation started successfully',
        instanceId,
        totalScore: Math.round(totalScore),
        maxPossibleScore,
        integrityScore,
        backgroundEvaluations: evaluationPromises.length,
        backgroundProcessing: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // MCQ-only assessment, complete evaluation immediately
      const finalScore = Math.round(totalScore * (integrityScore / 100));
      
      const { error: updateError } = await supabase
        .from('assessment_instances')
        .update({
          status: 'evaluated',
          evaluation_status: 'completed',
          total_score: finalScore,
          max_possible_score: maxPossibleScore,
          integrity_score: integrityScore,
          proctoring_summary: {
            integrity_score: integrityScore,
            violations_count: violations.length + securityEvents.length,
            notes: proctoringNotes
          },
          evaluated_at: new Date().toISOString()
        })
        .eq('id', instanceId);

      if (updateError) {
        console.error('Error updating instance:', updateError);
        throw updateError;
      }

      console.log(`Evaluation completed. Score: ${finalScore}/${maxPossibleScore}, Integrity: ${integrityScore}%`);

      return new Response(
        JSON.stringify({
          success: true,
          finalScore,
          maxPossibleScore,
          integrityScore,
          evaluationsCreated: (submissions || []).length - evaluatedSubmissionIds.size,
          backgroundProcessing: false
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('Error in auto-evaluate-assessment:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: 'Failed to evaluate assessment'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function evaluateMCQ(submission: any, question: any): number {
  try {
    const submissionAnswer = submission.answer;
    const questionConfig = question.config;
    
    if (!submissionAnswer || !questionConfig?.options) {
      console.log('Missing submission answer or question options', { submissionAnswer, questionConfig });
      return 0;
    }

    // Extract selected options from submission
    const selectedOptions = submissionAnswer.selectedOptions || [];
    if (!Array.isArray(selectedOptions)) {
      console.log('Invalid selectedOptions format:', selectedOptions);
      return 0;
    }

    // Find correct options from question config
    const correctOptions = questionConfig.options
      .filter((option: any) => option.isCorrect)
      .map((option: any) => option.id);

    console.log('MCQ Evaluation:', {
      selectedOptions,
      correctOptions,
      questionPoints: question.points
    });

    // For single-answer MCQ, check if the single selected option is correct
    if (selectedOptions.length === 1 && correctOptions.length === 1) {
      const isCorrect = selectedOptions[0] === correctOptions[0];
      const score = isCorrect ? (question.points || 0) : 0;
      console.log('Single MCQ Score awarded:', score);
      return score;
    }

    // For multiple-answer MCQ, check if selected options match correct options exactly
    if (selectedOptions.length > 1 || correctOptions.length > 1) {
      const isCorrect = selectedOptions.length === correctOptions.length &&
                       selectedOptions.every((selected: any) => correctOptions.includes(selected)) &&
                       correctOptions.every((correct: any) => selectedOptions.includes(correct));

      const score = isCorrect ? (question.points || 0) : 0;
      console.log('Multiple MCQ Score awarded:', score);
      return score;
    }

    // Single selection but multiple correct options - partial scoring not implemented
    return 0;
  } catch (error) {
    console.error('Error in evaluateMCQ:', error);
    return 0;
  }
}

async function evaluateSubjectiveWithAI(submission: any, question: any): Promise<number> {
  if (!openAIApiKey) return 0;

  const prompt = `
    Evaluate this answer for the given question. Provide a score out of ${question.points || 10} points.
    
    Question: ${question.config?.question || ''}
    Expected Answer/Rubric: ${question.config?.expectedAnswer || 'Not provided'}
    Student Answer: ${submission.answer || ''}
    
    Consider:
    - Accuracy and correctness
    - Completeness
    - Understanding demonstrated
    - Clarity of explanation
    
    Respond with only a number (the score).
  `;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert evaluator. Respond only with a numeric score.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 10,
      }),
    });

    const data = await response.json();
    const scoreText = data.choices[0].message.content.trim();
    const score = parseFloat(scoreText);
    
    return isNaN(score) ? 0 : Math.min(score, question.points || 0);
  } catch (error) {
    console.error('Error in AI evaluation:', error);
    return 0;
  }
}

async function evaluateCodingWithAI(submission: any, question: any): Promise<{score: number, feedback: any}> {
  console.log('Starting enhanced coding evaluation for question:', question.id);
  
  try {
    const code = submission.answer?.code || '';
    const language = submission.answer?.language || question.config?.language || 'javascript';
    const testCases = question.config?.testCases || [];
    
    // Use enhanced-code-execution for comprehensive evaluation
    const response = await supabase.functions.invoke('enhanced-code-execution', {
      body: {
        code,
        language,
        testCases,
        options: {
          executionMode: 'comprehensive',
          debugMode: true,
          performanceAnalysis: true
        }
      }
    });

    if (response.error) {
      console.error('Enhanced execution failed:', response.error);
      return await fallbackCodingEvaluation(submission, question);
    }

    const executionResult = response.data;
    
    // Calculate comprehensive score based on multiple factors
    let score = 0;
    const maxScore = question.points || 10;
    
    // Test case results (40% of score)
    const testPassRate = executionResult.testResults?.length > 0 
      ? executionResult.testResults.filter((t: any) => t.passed).length / executionResult.testResults.length
      : 0.5; // Give 50% if no tests
    score += testPassRate * maxScore * 0.4;
    
    // Code quality (30% of score)
    const codeQuality = executionResult.analysis?.codeQuality?.overallScore || 50;
    score += (codeQuality / 100) * maxScore * 0.3;
    
    // Performance analysis (20% of score)
    const performanceScore = executionResult.performance?.efficiencyScore || 70;
    score += (performanceScore / 100) * maxScore * 0.2;
    
    // Syntax and correctness (10% of score)
    const syntaxScore = executionResult.analysis?.syntaxErrors?.length === 0 ? 100 : 50;
    score += (syntaxScore / 100) * maxScore * 0.1;
    
    // Apply error penalties
    if (executionResult.analysis?.syntaxErrors?.length > 0) {
      score *= 0.8; // 20% penalty for syntax errors
    }
    if (executionResult.analysis?.logicErrors?.length > 0) {
      score *= 0.9; // 10% penalty for logic errors
    }
    
    // Cap the score at maximum
    score = Math.min(Math.round(score), maxScore);
    
    const feedback = {
      evaluation_method: 'enhanced_execution',
      confidence: 0.95,
      test_results: executionResult.testResults || [],
      code_quality_score: codeQuality,
      performance_score: performanceScore,
      syntax_errors: executionResult.analysis?.syntaxErrors || [],
      logic_errors: executionResult.analysis?.logicErrors || [],
      detailed_feedback: generateDetailedFeedback(executionResult, score, maxScore),
      improvements: executionResult.recommendations || [],
      debugging_info: executionResult.debugging || {},
      performance_analysis: executionResult.performance || {}
    };
    
    console.log(`Enhanced coding evaluation completed. Score: ${score}/${maxScore}`);
    return { score, feedback };
    
  } catch (error) {
    console.error('Error in enhanced coding evaluation:', error);
    return await fallbackCodingEvaluation(submission, question);
  }
}

// Fallback to simple evaluation if enhanced fails
async function fallbackCodingEvaluation(submission: any, question: any): Promise<{score: number, feedback: any}> {
  if (!openAIApiKey) return { score: 0, feedback: { evaluation_method: 'fallback', error: 'No API key' } };

  const prompt = `
    Evaluate this coding solution. Provide a score out of ${question.points || 10} points.
    
    Problem: ${question.config?.problem || ''}
    Expected Solution/Approach: ${question.config?.expectedSolution || 'Not provided'}
    Student Code: ${submission.answer?.code || ''}
    Programming Language: ${submission.answer?.language || 'Not specified'}
    
    Consider:
    - Correctness of the algorithm
    - Code quality and structure
    - Efficiency
    - Edge case handling
    - Best practices
    
    Respond with only a number (the score).
  `;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert code evaluator. Respond only with a numeric score.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 10,
      }),
    });

    const data = await response.json();
    const scoreText = data.choices[0].message.content.trim();
    const score = parseFloat(scoreText);
    
    return { 
      score: isNaN(score) ? 0 : Math.min(score, question.points || 0),
      feedback: { evaluation_method: 'fallback_ai', confidence: 0.6 }
    };
  } catch (error) {
    console.error('Error in fallback coding evaluation:', error);
    return { score: 0, feedback: { evaluation_method: 'fallback', error: error.message } };
  }
}

function generateDetailedFeedback(executionResult: any, score: number, maxScore: number): string {
  const percentage = Math.round((score / maxScore) * 100);
  let feedback = `Overall Score: ${score}/${maxScore} (${percentage}%). `;
  
  if (executionResult.testResults?.length > 0) {
    const passedTests = executionResult.testResults.filter((t: any) => t.passed).length;
    feedback += `Test Cases: ${passedTests}/${executionResult.testResults.length} passed. `;
  }
  
  if (executionResult.analysis?.codeQuality?.overallScore) {
    feedback += `Code Quality: ${executionResult.analysis.codeQuality.overallScore}/100. `;
  }
  
  if (executionResult.analysis?.syntaxErrors?.length > 0) {
    feedback += `Found ${executionResult.analysis.syntaxErrors.length} syntax error(s). `;
  }
  
  if (executionResult.performance?.timeComplexity) {
    feedback += `Time Complexity: ${executionResult.performance.timeComplexity}. `;
  }
  
  return feedback;
}

async function evaluateSeleniumWithAI(submission: any, question: any): Promise<{score: number, feedback: any}> {
  if (!openAIApiKey) return { score: 0, feedback: null };

  try {
    console.log('Starting Selenium evaluation with detailed feedback');
    
    // Call the evaluate-selenium-code function with proper data structure
    const response = await supabase.functions.invoke('evaluate-selenium-code', {
      body: {
        code: submission.answer?.files?.[0]?.content || submission.answer?.code || '',
        language: submission.answer?.files?.[0]?.language || question.config?.language || 'java',
        testCases: question.config?.testCases || [],
        executionMode: 'selenium',
        debugMode: true,
        performanceAnalysis: true
      }
    });

    if (response.error) {
      throw new Error(`Selenium evaluation failed: ${response.error.message}`);
    }

    const evaluationData = response.data;
    
    // Calculate score from Selenium evaluation
    let score = 0;
    if (evaluationData.seleniumScore?.overallScore) {
      // Convert 0-100 scale to question points
      score = Math.round((evaluationData.seleniumScore.overallScore / 100) * (question.points || 0));
    }

    console.log(`Selenium evaluation completed. Score: ${score}/${question.points}`);

    return {
      score,
      feedback: {
        evaluation_method: 'selenium_ai',
        confidence: 0.9,
        selenium_analysis: evaluationData,
        detailed_feedback: `Selenium Score: ${evaluationData.seleniumScore?.overallScore || 0}/100. 
                          Locator Quality: ${evaluationData.seleniumScore?.locatorQuality || 0}/100. 
                          Test Flow: ${evaluationData.seleniumScore?.testFlow || 0}/100. 
                          Best Practices: ${evaluationData.seleniumScore?.bestPractices || 0}/100.`,
        improvements: evaluationData.improvements || [],
        locator_analysis: evaluationData.locatorAnalysis || []
      }
    };
  } catch (error) {
    console.error('Error in Selenium evaluation:', error);
    return { score: 0, feedback: { evaluation_method: 'selenium_ai', error: error.message } };
  }
}

function calculateIntegrityScore(violations: any[]): number {
  if (!violations || violations.length === 0) return 100;
  
  let score = 100;
  for (const violation of violations) {
    switch (violation.type) {
      case 'tab_switch':
        score -= 5;
        break;
      case 'fullscreen_exit':
        score -= 10;
        break;
      case 'multiple_faces':
        score -= 15;
        break;
      case 'no_face':
        score -= 20;
        break;
      case 'copy_paste':
        score -= 25;
        break;
      default:
        score -= 3;
    }
  }
  
  return Math.max(score, 0);
}

function generateProctoringNotes(violations: any[], securityEvents: any[]): string {
  if (!violations.length && !securityEvents.length) {
    return 'No proctoring violations detected. Assessment completed under normal conditions.';
  }
  
  const notes = [];
  if (violations.length > 0) {
    notes.push(`${violations.length} proctoring violation(s) detected`);
  }
  if (securityEvents.length > 0) {
    notes.push(`${securityEvents.length} security event(s) logged`);
  }
  
  return notes.join('. ');
}

async function createProctoringReport(instanceId: string, instance: any, allEvents: any[], integrityScore: number) {
  try {
    const reportData = {
      total_violations: allEvents.length,
      integrity_score: integrityScore,
      session_duration: instance.duration_taken_seconds || 0,
      events_timeline: allEvents.map(event => ({
        type: event.type,
        timestamp: event.timestamp,
        severity: event.severity || 'medium'
      }))
    };

    const { error } = await supabase
      .from('proctoring_reports')
      .insert({
        assessment_instance_id: instanceId,
        participant_id: instance.participant_id,
        assessment_id: instance.assessment_id,
        report_data: reportData,
        integrity_score: integrityScore,
        violations_summary: allEvents,
        recommendations: generateRecommendations(allEvents, integrityScore),
        status: 'generated'
      });

    if (error) {
      console.error('Error creating proctoring report:', error);
    }
  } catch (error) {
    console.error('Error in createProctoringReport:', error);
  }
}

function generateRecommendations(events: any[], integrityScore: number): string {
  if (integrityScore >= 90) {
    return 'Assessment completed with high integrity. No additional action required.';
  } else if (integrityScore >= 70) {
    return 'Assessment completed with minor integrity concerns. Review recommended.';
  } else if (integrityScore >= 50) {
    return 'Assessment completed with moderate integrity concerns. Manual review strongly recommended.';
  } else {
    return 'Assessment completed with significant integrity concerns. Manual review and potential re-assessment recommended.';
  }
}