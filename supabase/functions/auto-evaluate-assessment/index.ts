import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { instanceId } = await req.json();
    console.log('Starting evaluation for instance:', instanceId);

    // Fetch assessment instance
    const { data: instance, error: instanceError } = await supabase
      .from('assessment_instances')
      .select(`
        *,
        assessments (id, title, proctoring_enabled, proctoring_config)
      `)
      .eq('id', instanceId)
      .single();

    if (instanceError || !instance) {
      throw new Error(`Failed to fetch instance: ${instanceError?.message}`);
    }

    // Fetch submissions for this instance
    const { data: submissions, error: submissionsError } = await supabase
      .from('submissions')
      .select(`
        *,
        questions (
          id, question_type, points, config
        )
      `)
      .eq('instance_id', instanceId);

    if (submissionsError) {
      throw new Error(`Failed to fetch submissions: ${submissionsError?.message}`);
    }

    // Fetch proctoring data
    const { data: proctoringSession, error: proctoringError } = await supabase
      .from('proctoring_sessions')
      .select('*')
      .eq('assessment_instance_id', instanceId)
      .single();

    let totalScore = 0;
    let maxPossibleScore = 0;
    let integrityScore = 100;
    let proctoringNotes = '';

    // Calculate proctoring integrity score
    if (proctoringSession && instance.assessments?.proctoring_enabled) {
      const violations = Array.isArray(instance.proctoring_violations) ? instance.proctoring_violations : [];
      const securityEvents = Array.isArray(proctoringSession.security_events) ? proctoringSession.security_events : [];
      
      // Calculate integrity score based on violations
      integrityScore = calculateIntegrityScore(violations.concat(securityEvents));
      proctoringNotes = generateProctoringNotes(violations, securityEvents);

      // Create proctoring report
      await createProctoringReport(instanceId, instance, violations.concat(securityEvents), integrityScore);
    }

    // Evaluate each submission
    for (const submission of submissions || []) {
      const question = submission.questions;
      if (!question) continue;

      maxPossibleScore += question.points || 0;
      let questionScore = 0;

      try {
        // Evaluate based on question type
        switch (question.question_type) {
          case 'mcq':
            questionScore = evaluateMCQ(submission, question);
            break;
          case 'subjective':
            if (openAIApiKey) {
              questionScore = await evaluateSubjectiveWithAI(submission, question);
            } else {
              questionScore = 0; // Requires manual evaluation
            }
            break;
          case 'coding':
            if (openAIApiKey) {
              questionScore = await evaluateCodingWithAI(submission, question);
            } else {
              questionScore = 0; // Requires manual evaluation
            }
            break;
          default:
            questionScore = 0;
        }

        // Create evaluation record
        await supabase.from('evaluations').insert({
          submission_id: submission.id,
          score: questionScore,
          max_score: question.points || 0,
          integrity_score: integrityScore,
          proctoring_notes: proctoringNotes,
          evaluator_type: 'ai',
          ai_feedback: {
            confidence: question.question_type === 'mcq' ? 1.0 : 0.8,
            evaluation_method: question.question_type,
            timestamp: new Date().toISOString()
          }
        });

        totalScore += questionScore;
      } catch (evalError) {
        console.error(`Error evaluating question ${question.id}:`, evalError);
      }
    }

    // Apply integrity score to final result
    const finalScore = (totalScore * (integrityScore / 100));

    // Update assessment instance with scores
    await supabase
      .from('assessment_instances')
      .update({
        total_score: finalScore,
        max_possible_score: maxPossibleScore,
        status: 'evaluated',
        session_state: 'evaluated',
        integrity_score: integrityScore,
        proctoring_summary: {
          violations_count: Array.isArray(instance.proctoring_violations) ? instance.proctoring_violations.length : 0,
          integrity_score: integrityScore,
          technical_issues: []
        }
      })
      .eq('id', instanceId);

    console.log(`Evaluation completed. Score: ${finalScore}/${maxPossibleScore}, Integrity: ${integrityScore}%`);

    return new Response(JSON.stringify({
      success: true,
      totalScore: finalScore,
      maxPossibleScore,
      integrityScore,
      evaluatedSubmissions: submissions?.length || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in auto-evaluate-assessment:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function evaluateMCQ(submission: any, question: any): number {
  const answer = submission.answer;
  const correctAnswer = question.config?.correctAnswer;
  
  if (!answer || !correctAnswer) return 0;
  
  if (typeof correctAnswer === 'string') {
    return answer === correctAnswer ? (question.points || 0) : 0;
  }
  
  if (Array.isArray(correctAnswer)) {
    const userAnswers = Array.isArray(answer) ? answer : [answer];
    const isCorrect = correctAnswer.every(correct => userAnswers.includes(correct)) &&
                     userAnswers.every(userAns => correctAnswer.includes(userAns));
    return isCorrect ? (question.points || 0) : 0;
  }
  
  return 0;
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
          { role: 'system', content: 'You are an expert assessment evaluator. Provide only numeric scores.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 50
      }),
    });

    const data = await response.json();
    const scoreText = data.choices?.[0]?.message?.content?.trim();
    const score = parseFloat(scoreText || '0');
    
    return Math.min(Math.max(score, 0), question.points || 0);
  } catch (error) {
    console.error('Error evaluating subjective question:', error);
    return 0;
  }
}

async function evaluateCodingWithAI(submission: any, question: any): Promise<number> {
  if (!openAIApiKey) return 0;

  const prompt = `
    Evaluate this coding solution for the given problem. Provide a score out of ${question.points || 10} points.
    
    Problem: ${question.config?.problem || ''}
    Expected Output: ${question.config?.expectedOutput || 'Not specified'}
    Student Code: ${submission.answer?.code || submission.answer || ''}
    
    Evaluate based on:
    - Correctness (40%)
    - Code quality and structure (30%)
    - Efficiency (20%)
    - Edge case handling (10%)
    
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
          { role: 'system', content: 'You are an expert coding assessment evaluator. Provide only numeric scores.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 50
      }),
    });

    const data = await response.json();
    const scoreText = data.choices?.[0]?.message?.content?.trim();
    const score = parseFloat(scoreText || '0');
    
    return Math.min(Math.max(score, 0), question.points || 0);
  } catch (error) {
    console.error('Error evaluating coding question:', error);
    return 0;
  }
}

function calculateIntegrityScore(violations: any[]): number {
  let score = 100;
  
  for (const violation of violations) {
    switch (violation.severity) {
      case 'critical':
        score -= 25;
        break;
      case 'high':
        score -= 15;
        break;
      case 'medium':
        score -= 10;
        break;
      case 'low':
        score -= 5;
        break;
    }
  }
  
  return Math.max(score, 0);
}

function generateProctoringNotes(violations: any[], securityEvents: any[]): string {
  const notes = [];
  
  if (violations.length > 0) {
    notes.push(`${violations.length} proctoring violations detected`);
  }
  
  if (securityEvents.length > 0) {
    notes.push(`${securityEvents.length} security events recorded`);
  }
  
  const criticalEvents = [...violations, ...securityEvents].filter(e => e.severity === 'critical');
  if (criticalEvents.length > 0) {
    notes.push(`${criticalEvents.length} critical security events require review`);
  }
  
  return notes.length > 0 ? notes.join('. ') : 'No significant proctoring issues detected';
}

async function createProctoringReport(instanceId: string, instance: any, allEvents: any[], integrityScore: number) {
  const reportData = {
    timeline: allEvents.map(event => ({
      timestamp: event.timestamp || new Date().toISOString(),
      type: event.type || 'unknown',
      severity: event.severity || 'low',
      description: event.description || event.message || 'Security event'
    })),
    summary: {
      total_events: allEvents.length,
      by_severity: {
        critical: allEvents.filter(e => e.severity === 'critical').length,
        high: allEvents.filter(e => e.severity === 'high').length,
        medium: allEvents.filter(e => e.severity === 'medium').length,
        low: allEvents.filter(e => e.severity === 'low').length
      }
    }
  };

  await supabase.from('proctoring_reports').insert({
    assessment_instance_id: instanceId,
    participant_id: instance.participant_id,
    assessment_id: instance.assessment_id,
    report_data: reportData,
    integrity_score: integrityScore,
    violations_summary: allEvents,
    recommendations: generateRecommendations(allEvents, integrityScore)
  });
}

function generateRecommendations(events: any[], integrityScore: number): string {
  const recommendations = [];
  
  if (integrityScore < 70) {
    recommendations.push('Manual review recommended due to low integrity score');
  }
  
  const criticalEvents = events.filter(e => e.severity === 'critical');
  if (criticalEvents.length > 0) {
    recommendations.push('Critical security violations detected - requires instructor review');
  }
  
  const tabSwitches = events.filter(e => e.type?.includes('tab_switch') || e.type?.includes('focus'));
  if (tabSwitches.length > 5) {
    recommendations.push('Multiple tab switches detected - possible academic dishonesty');
  }
  
  return recommendations.length > 0 ? recommendations.join('. ') : 'Assessment appears to have been completed with integrity';
}