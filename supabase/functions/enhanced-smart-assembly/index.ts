import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { 
      totalQuestions, 
      targetSkills, 
      difficulty, 
      questionTypes, 
      assessmentContext,
      learningObjectives 
    } = await req.json();

    console.log('Enhanced Smart Assembly request:', { totalQuestions, targetSkills, difficulty, questionTypes });

    // Fetch available questions from database
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select(`
        *,
        question_skills!inner(
          skills(name)
        )
      `)
      .eq('is_active', true);

    if (questionsError) {
      throw new Error(`Failed to fetch questions: ${questionsError.message}`);
    }

    console.log(`Found ${questions?.length || 0} available questions`);

    // AI-powered question selection using OpenAI
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const prompt = `You are an expert assessment designer. Analyze the following questions and select the optimal set based on these criteria:

TARGET REQUIREMENTS:
- Total questions needed: ${totalQuestions}
- Target skills: ${targetSkills.join(', ')}
- Difficulty distribution: ${JSON.stringify(difficulty)}
- Question types distribution: ${JSON.stringify(questionTypes)}
- Learning objectives: ${learningObjectives.map((obj: any) => obj.name).join(', ')}
- Assessment context: ${assessmentContext || 'General assessment'}

AVAILABLE QUESTIONS:
${questions?.map(q => `
ID: ${q.id}
Title: ${q.title}
Type: ${q.question_type}
Difficulty: ${q.difficulty}
Points: ${q.points}
Quality: ${q.quality_rating || 'N/A'}
Usage: ${q.usage_count || 0}
Skills: ${q.question_skills?.map((qs: any) => qs.skills?.name).join(', ') || 'None'}
`).join('\n')}

SELECTION CRITERIA:
1. Skill coverage: Prioritize questions that cover target skills
2. Difficulty balance: Match the specified difficulty distribution
3. Type variety: Achieve the desired question type mix
4. Quality: Prefer higher quality questions
5. Freshness: Balance between tested questions and less-used ones
6. Learning progression: Ensure logical skill building

Return ONLY a JSON array of question IDs that best meet these criteria: ["id1", "id2", ...]`;

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: 'You are an expert assessment designer. Always respond with valid JSON arrays of question IDs.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`OpenAI API error: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    
    console.log('AI response:', aiContent);

    let selectedQuestionIds: string[];
    try {
      selectedQuestionIds = JSON.parse(aiContent);
    } catch (e) {
      console.warn('Failed to parse AI response, using fallback selection');
      selectedQuestionIds = smartFallbackSelection(questions || [], {
        totalQuestions,
        targetSkills,
        difficulty,
        questionTypes
      });
    }

    // Get selected questions with details
    const selectedQuestions = questions?.filter(q => selectedQuestionIds.includes(q.id)) || [];

    // If we don't have enough questions, supplement with smart fallback
    if (selectedQuestions.length < totalQuestions) {
      const remainingIds = smartFallbackSelection(
        questions?.filter(q => !selectedQuestionIds.includes(q.id)) || [],
        { 
          totalQuestions: totalQuestions - selectedQuestions.length, 
          targetSkills, 
          difficulty, 
          questionTypes 
        }
      );
      selectedQuestions.push(...(questions?.filter(q => remainingIds.includes(q.id)) || []));
    }

    // Calculate assembly metrics
    const metrics = calculateAssemblyMetrics(selectedQuestions, { difficulty, questionTypes, targetSkills });

    // Save assembly configuration to database
    const { data: buildConfig, error: saveError } = await supabase
      .from('assessment_auto_build')
      .insert({
        target_skills: targetSkills,
        difficulty_distribution: difficulty,
        question_types: questionTypes,
        total_points: selectedQuestions.reduce((sum, q) => sum + (q.points || 0), 0),
        time_limit_minutes: Math.ceil(selectedQuestions.length * 3), // 3 minutes per question estimate
        selected_questions: selectedQuestions.map(q => ({
          id: q.id,
          title: q.title,
          type: q.question_type,
          difficulty: q.difficulty,
          points: q.points,
          quality_score: q.quality_rating || 75,
          selection_reason: 'AI-optimized selection'
        })),
        ai_criteria: JSON.stringify({
          prompt: prompt.substring(0, 500),
          learning_objectives: learningObjectives,
          context: assessmentContext
        }),
        build_status: 'completed',
        created_by: 'user-placeholder' // In real app, get from auth
      })
      .select()
      .single();

    if (saveError) {
      console.warn('Failed to save build config:', saveError);
    }

    return new Response(JSON.stringify({
      success: true,
      questions: selectedQuestions,
      metrics,
      buildId: buildConfig?.id,
      summary: {
        totalSelected: selectedQuestions.length,
        qualityScore: metrics.averageQuality,
        skillCoverage: metrics.skillCoverage,
        difficultyBalance: metrics.difficultyBalance
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in enhanced-smart-assembly:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function smartFallbackSelection(
  questions: any[], 
  criteria: { totalQuestions: number; targetSkills: string[]; difficulty: any; questionTypes: any }
): string[] {
  console.log('Using smart fallback selection');
  
  // Score questions based on criteria match
  const scoredQuestions = questions.map(q => {
    let score = 0;
    
    // Skill relevance (40% weight)
    const questionSkills = q.question_skills?.map((qs: any) => qs.skills?.name) || [];
    const skillMatch = questionSkills.some((skill: string) => 
      criteria.targetSkills.some(target => target.toLowerCase().includes(skill?.toLowerCase() || ''))
    );
    if (skillMatch) score += 40;
    
    // Quality rating (30% weight)
    score += (q.quality_rating || 50) * 0.3;
    
    // Usage balance (20% weight) - prefer moderately used questions
    const usageScore = Math.max(0, 20 - (q.usage_count || 0));
    score += usageScore * 0.2;
    
    // Recency (10% weight)
    const daysSinceCreation = (Date.now() - new Date(q.created_at).getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 10 - daysSinceCreation / 30);
    score += recencyScore * 0.1;
    
    return { question: q, score };
  });
  
  // Sort by score and select top questions
  scoredQuestions.sort((a, b) => b.score - a.score);
  
  return scoredQuestions
    .slice(0, criteria.totalQuestions)
    .map(sq => sq.question.id);
}

function calculateAssemblyMetrics(questions: any[], criteria: any) {
  const totalQuestions = questions.length;
  if (totalQuestions === 0) {
    return {
      averageQuality: 0,
      skillCoverage: 0,
      difficultyBalance: 0,
      typeDistribution: {}
    };
  }
  
  // Calculate average quality
  const averageQuality = questions.reduce((sum, q) => sum + (q.quality_rating || 75), 0) / totalQuestions;
  
  // Calculate skill coverage
  const allSkills = new Set();
  questions.forEach(q => {
    q.question_skills?.forEach((qs: any) => {
      if (qs.skills?.name) allSkills.add(qs.skills.name);
    });
  });
  const skillCoverage = Math.min(100, (allSkills.size / Math.max(1, criteria.targetSkills.length)) * 100);
  
  // Calculate difficulty balance
  const difficultyCount = { beginner: 0, intermediate: 0, advanced: 0 };
  questions.forEach(q => {
    if (q.difficulty && difficultyCount.hasOwnProperty(q.difficulty)) {
      difficultyCount[q.difficulty as keyof typeof difficultyCount]++;
    }
  });
  
  const difficultyBalance = 100 - Math.abs(
    (difficultyCount.beginner / totalQuestions * 100) - (criteria.difficulty.beginner || 33)
  ) - Math.abs(
    (difficultyCount.intermediate / totalQuestions * 100) - (criteria.difficulty.intermediate || 33)
  ) - Math.abs(
    (difficultyCount.advanced / totalQuestions * 100) - (criteria.difficulty.advanced || 33)
  );
  
  // Calculate type distribution
  const typeDistribution = questions.reduce((acc, q) => {
    acc[q.question_type] = (acc[q.question_type] || 0) + 1;
    return acc;
  }, {});
  
  return {
    averageQuality: Math.round(averageQuality),
    skillCoverage: Math.round(skillCoverage),
    difficultyBalance: Math.max(0, Math.round(difficultyBalance)),
    typeDistribution
  };
}