import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assessmentId, analysisType = 'comprehensive' } = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch assessment data
    const { data: assessment, error: assessmentError } = await supabase
      .from('assessments')
      .select(`
        *,
        questions (
          id,
          title,
          question_type,
          difficulty,
          points,
          config
        )
      `)
      .eq('id', assessmentId)
      .single();

    if (assessmentError) {
      throw new Error(`Failed to fetch assessment: ${assessmentError.message}`);
    }

    // Fetch assessment instances and submissions
    const { data: instances, error: instancesError } = await supabase
      .from('assessment_instances')
      .select(`
        *,
        submissions (
          id,
          question_id,
          answer,
          evaluations (
            score,
            max_score,
            ai_feedback
          )
        )
      `)
      .eq('assessment_id', assessmentId);

    if (instancesError) {
      throw new Error(`Failed to fetch instances: ${instancesError.message}`);
    }

    // Generate AI insights
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const analysisData = {
      assessment,
      instances,
      totalParticipants: instances.length,
      completedInstances: instances.filter(i => i.status === 'submitted').length,
      averageScore: calculateAverageScore(instances),
      questionPerformance: analyzeQuestionPerformance(instances, assessment.questions),
      difficultyDistribution: analyzeDifficultyDistribution(assessment.questions),
      commonIssues: identifyCommonIssues(instances)
    };

    const prompt = buildInsightsPrompt(analysisData, analysisType);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational data analyst who provides actionable insights about assessment performance. Respond with valid JSON containing your analysis.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 3000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const insights = JSON.parse(aiResponse.choices[0].message.content);

    console.log('Generated insights:', insights);

    return new Response(
      JSON.stringify({ 
        success: true, 
        insights: {
          ...insights,
          metadata: {
            generatedAt: new Date().toISOString(),
            assessmentId,
            analysisType,
            dataPoints: {
              totalParticipants: analysisData.totalParticipants,
              completedInstances: analysisData.completedInstances,
              questionsAnalyzed: assessment.questions.length
            }
          }
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error generating insights:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to generate insights' 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});

function calculateAverageScore(instances: any[]): number {
  const completedInstances = instances.filter(i => i.status === 'submitted' && i.total_score !== null);
  if (completedInstances.length === 0) return 0;
  
  const totalScore = completedInstances.reduce((sum, instance) => sum + (instance.total_score || 0), 0);
  const totalMaxScore = completedInstances.reduce((sum, instance) => sum + (instance.max_possible_score || 0), 0);
  
  return totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
}

function analyzeQuestionPerformance(instances: any[], questions: any[]): any[] {
  return questions.map(question => {
    const questionSubmissions = instances.flatMap(instance => 
      instance.submissions?.filter((sub: any) => sub.question_id === question.id) || []
    );

    const scores = questionSubmissions.flatMap((sub: any) => 
      sub.evaluations?.map((eval: any) => ({
        score: eval.score,
        maxScore: eval.max_score
      })) || []
    );

    const averageScore = scores.length > 0 
      ? scores.reduce((sum, s) => sum + (s.score / s.maxScore), 0) / scores.length * 100
      : 0;

    return {
      questionId: question.id,
      title: question.title,
      type: question.question_type,
      difficulty: question.difficulty,
      averageScore,
      totalSubmissions: questionSubmissions.length,
      successRate: scores.filter(s => (s.score / s.maxScore) >= 0.7).length / scores.length * 100
    };
  });
}

function analyzeDifficultyDistribution(questions: any[]): any {
  const distribution = questions.reduce((acc, q) => {
    acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
    return acc;
  }, {});

  return {
    distribution,
    totalQuestions: questions.length,
    balanceScore: calculateBalanceScore(distribution)
  };
}

function calculateBalanceScore(distribution: any): number {
  const total = Object.values(distribution).reduce((sum: number, count: any) => sum + count, 0);
  const ideal = total / 3; // Ideally equal distribution
  const variance = Object.values(distribution).reduce((sum: number, count: any) => 
    sum + Math.pow((count as number) - ideal, 2), 0) / 3;
  
  return Math.max(0, 100 - (variance / ideal) * 20); // Scale to 0-100
}

function identifyCommonIssues(instances: any[]): string[] {
  const issues = [];
  
  const completionRate = instances.filter(i => i.status === 'submitted').length / instances.length;
  if (completionRate < 0.7) {
    issues.push('Low completion rate detected');
  }

  const averageTime = instances
    .filter(i => i.submitted_at && i.started_at)
    .map(i => new Date(i.submitted_at).getTime() - new Date(i.started_at).getTime())
    .reduce((sum, time, _, arr) => sum + time / arr.length, 0);

  if (averageTime > 90 * 60 * 1000) { // More than 90 minutes
    issues.push('Participants taking longer than expected');
  }

  return issues;
}

function buildInsightsPrompt(data: any, analysisType: string): string {
  return `Analyze the following assessment data and provide comprehensive insights:

Assessment: "${data.assessment.title}"
- Total Questions: ${data.assessment.questions.length}
- Duration: ${data.assessment.duration_minutes} minutes
- Participants: ${data.totalParticipants}
- Completion Rate: ${((data.completedInstances / data.totalParticipants) * 100).toFixed(1)}%
- Average Score: ${data.averageScore.toFixed(1)}%

Question Performance:
${data.questionPerformance.map(q => 
  `- ${q.title} (${q.type}, ${q.difficulty}): ${q.averageScore.toFixed(1)}% avg, ${q.successRate.toFixed(1)}% success rate`
).join('\n')}

Difficulty Distribution:
${Object.entries(data.difficultyDistribution.distribution).map(([level, count]) => 
  `- ${level}: ${count} questions`
).join('\n')}

Common Issues Detected:
${data.commonIssues.map(issue => `- ${issue}`).join('\n')}

Please provide insights in this JSON format:
{
  "overallPerformance": {
    "summary": "Overall assessment performance summary",
    "strengths": ["strength 1", "strength 2"],
    "concerns": ["concern 1", "concern 2"],
    "trend": "improving|stable|declining",
    "recommendations": ["recommendation 1", "recommendation 2"]
  },
  "questionAnalysis": {
    "topPerforming": ["question insights"],
    "strugglingQuestions": ["question insights"],
    "difficultyBalance": "assessment of difficulty distribution",
    "typeEffectiveness": "analysis of question type performance"
  },
  "participantInsights": {
    "engagementLevel": "high|medium|low",
    "completionFactors": ["factors affecting completion"],
    "timeManagement": "analysis of time usage patterns",
    "skillGaps": ["identified skill gaps"]
  },
  "actionableRecommendations": [
    {
      "category": "category name",
      "priority": "high|medium|low",
      "action": "specific action to take",
      "expectedImpact": "expected outcome"
    }
  ],
  "predictiveInsights": {
    "futurePerformance": "prediction for future assessments",
    "riskFactors": ["potential risks"],
    "opportunityAreas": ["areas for improvement"]
  }
}`;
}