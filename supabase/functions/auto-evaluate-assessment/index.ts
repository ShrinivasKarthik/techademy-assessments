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

    // First pass: Evaluate MCQ questions instantly and start AI evaluations in background
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

          // Insert evaluation immediately for MCQ
          await supabase
            .from('evaluations')
            .insert({
              submission_id: submission.id,
              score: score,
              max_score: question.points || 0,
              integrity_score: integrityScore,
              evaluation_notes: 'Automated MCQ evaluation',
              evaluated_at: new Date().toISOString()
            });
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
                  });

                // Update total score in instance
                const { data: currentInstance } = await supabase
                  .from('assessment_instances')
                  .select('total_score')
                  .eq('id', instanceId)
                  .single();

                if (currentInstance) {
                  await supabase
                    .from('assessment_instances')
                    .update({
                      total_score: (currentInstance.total_score || 0) + aiScore
                    })
                    .eq('id', instanceId);
                }
              } catch (error) {
                console.error(`AI evaluation failed for ${question.question_type} question:`, error);
                // Insert fallback evaluation with 0 score
                await supabase
                  .from('evaluations')
                  .upsert({
                    submission_id: submission.id,
                    score: 0,
                    max_score: question.points || 0,
                    integrity_score: integrityScore,
                    feedback: `AI evaluation failed: ${error.message}`,
                    evaluated_at: new Date().toISOString()
                  });
              }
            })();
            
            evaluationPromises.push(aiEvaluationPromise);
          } else {
            // No AI key, insert 0 score evaluation
            await supabase
              .from('evaluations')
              .insert({
                submission_id: submission.id,
                score: 0,
                max_score: question.points || 0,
                integrity_score: integrityScore,
                feedback: 'Manual evaluation required (no AI key)',
                evaluated_at: new Date().toISOString()
              });
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
                  
                  // Create evaluation record
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
                    });

                  // Update total score in instance
                  const { data: currentInstance } = await supabase
                    .from('assessment_instances')
                    .select('total_score')
                    .eq('id', instanceId)
                    .single();

                  if (currentInstance) {
                    await supabase
                      .from('assessment_instances')
                      .update({
                        total_score: (currentInstance.total_score || 0) + interviewScore
                      })
                      .eq('id', instanceId);
                  }
                  
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
              
              // Call analyze-code function
              const { data: analysisResult, error: analysisError } = await supabase.functions.invoke('analyze-code', {
                body: {
                  code: projectCode,
                  language: language,
                  questionContext: questionContext,
                  testCases: question.config?.testCases || []
                }
              });
              
              if (analysisError) {
                throw new Error(`Code analysis failed: ${analysisError.message}`);
              }
              
              const analysis = analysisResult?.analysis;
              if (!analysis) {
                throw new Error('No analysis results received');
              }
              
              // Calculate score based on overall analysis score
              const projectScore = Math.round((analysis.overallScore / 100) * (question.points || 10));
              
              // Create comprehensive feedback
              const aiFeedback = {
                overallScore: analysis.overallScore,
                syntaxErrors: analysis.syntaxErrors || [],
                logicAnalysis: analysis.logicAnalysis || {},
                codeQuality: analysis.codeQuality || {},
                performance: analysis.performance || {},
                security: analysis.security || {},
                testCasePredictions: analysis.testCasePredictions || [],
                summary: analysis.summary || 'Project code analysis completed'
              };
              
              const feedbackText = `Project Evaluation - Overall Score: ${analysis.overallScore}%
Logic Correctness: ${analysis.logicAnalysis?.correctness || 'N/A'}%
Code Quality: ${analysis.codeQuality?.score || 'N/A'}%
Performance: ${analysis.performance?.timeComplexity || 'N/A'} time complexity
${analysis.syntaxErrors?.length > 0 ? `Syntax Issues: ${analysis.syntaxErrors.length}` : 'No syntax errors detected'}
${analysis.summary || ''}`;
              
              // Create evaluation record
              await supabase
                .from('evaluations')
                .upsert({
                  submission_id: submission.id,
                  score: projectScore,
                  max_score: question.points || 0,
                  integrity_score: integrityScore,
                  ai_feedback: aiFeedback,
                  feedback: feedbackText,
                  evaluated_at: new Date().toISOString()
                });

              // Update total score in instance
              const { data: currentInstance } = await supabase
                .from('assessment_instances')
                .select('total_score')
                .eq('id', instanceId)
                .single();

              if (currentInstance) {
                await supabase
                  .from('assessment_instances')
                  .update({
                    total_score: (currentInstance.total_score || 0) + projectScore
                  })
                  .eq('id', instanceId);
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

    // Apply integrity score to MCQ-only final score
    const finalScore = Math.round(totalScore * (integrityScore / 100));

    // Update assessment instance with immediate results (MCQ scores)
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

    // Process AI evaluations in background
    if (evaluationPromises.length > 0) {
      EdgeRuntime.waitUntil(
        Promise.all(evaluationPromises).then(() => {
          console.log('Background AI evaluations completed');
        }).catch(error => {
          console.error('Background AI evaluations failed:', error);
        })
      );
    }

    console.log(`Evaluation completed. Score: ${finalScore}/${maxPossibleScore}, Integrity: ${integrityScore}%`);

    return new Response(
      JSON.stringify({
        success: true,
        finalScore,
        maxPossibleScore,
        integrityScore,
        evaluationsCreated: (submissions || []).length - evaluatedSubmissionIds.size,
        backgroundProcessing: evaluationPromises.length > 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

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

async function evaluateCodingWithAI(submission: any, question: any): Promise<number> {
  if (!openAIApiKey) return 0;

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
    
    return isNaN(score) ? 0 : Math.min(score, question.points || 0);
  } catch (error) {
    console.error('Error in AI coding evaluation:', error);
    return 0;
  }
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