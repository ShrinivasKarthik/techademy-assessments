import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      assessmentId,
      targetSkills = [],
      difficultyDistribution = { beginner: 20, intermediate: 60, advanced: 20 },
      questionTypes = ['coding', 'mcq', 'subjective'],
      totalPoints = 100,
      timeLimitMinutes = 60,
      aiCriteria = '',
      preferences = {}
    } = await req.json();

    console.log('Smart Assembly Request:', { assessmentId, targetSkills, difficultyDistribution });

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get available questions from the question bank
    const { data: availableQuestions, error: questionsError } = await supabase
      .from('questions')
      .select(`
        *,
        question_skills!inner(
          skills(name)
        )
      `)
      .eq('is_active', true)
      .is('assessment_id', null); // Only standalone questions from question bank

    if (questionsError) {
      throw new Error(`Failed to fetch questions: ${questionsError.message}`);
    }

    // Transform questions data
    const questions = availableQuestions?.map(q => ({
      ...q,
      skills: q.question_skills?.map((qs: any) => qs.skills.name) || []
    })) || [];

    console.log(`Found ${questions.length} available questions`);

    // Use AI to intelligently select and optimize question combination
    const selectedQuestions = await selectOptimalQuestions(
      questions,
      targetSkills,
      difficultyDistribution,
      questionTypes,
      totalPoints,
      timeLimitMinutes,
      aiCriteria,
      preferences
    );

    // Save auto-build configuration
    const { error: saveError } = await supabase
      .from('assessment_auto_build')
      .upsert({
        assessment_id: assessmentId,
        target_skills: targetSkills,
        difficulty_distribution: difficultyDistribution,
        question_types: questionTypes,
        total_points: totalPoints,
        time_limit_minutes: timeLimitMinutes,
        ai_criteria: aiCriteria,
        build_status: 'completed',
        selected_questions: selectedQuestions.map(q => q.id)
      });

    if (saveError) {
      console.error('Error saving auto-build config:', saveError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      selectedQuestions,
      metrics: {
        totalQuestions: selectedQuestions.length,
        totalPoints: selectedQuestions.reduce((sum, q) => sum + q.points, 0),
        skillsCovered: [...new Set(selectedQuestions.flatMap(q => q.skills))],
        difficultyBreakdown: getDifficultyBreakdown(selectedQuestions),
        estimatedTime: estimateCompletionTime(selectedQuestions)
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in smart assembly:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function selectOptimalQuestions(
  questions: any[],
  targetSkills: string[],
  difficultyDistribution: any,
  questionTypes: string[],
  totalPoints: number,
  timeLimitMinutes: number,
  aiCriteria: string,
  preferences: any
) {
  // Filter questions by type and skills
  const relevantQuestions = questions.filter(q => {
    const hasRelevantSkill = targetSkills.length === 0 || 
      q.skills.some((skill: string) => targetSkills.includes(skill));
    const hasRelevantType = questionTypes.includes(q.question_type);
    return hasRelevantSkill && hasRelevantType;
  });

  console.log(`Filtered to ${relevantQuestions.length} relevant questions`);

  if (relevantQuestions.length === 0) {
    throw new Error('No relevant questions found matching the criteria');
  }

  // Use AI to create optimal question selection
  const prompt = `You are an expert assessment designer. Create an optimal question selection for an assessment.

Available Questions (${relevantQuestions.length} total):
${relevantQuestions.slice(0, 50).map((q, i) => `${i + 1}. "${q.title}" | Type: ${q.question_type} | Difficulty: ${q.difficulty} | Points: ${q.points} | Skills: [${q.skills.join(', ')}] | Usage: ${q.usage_count} | Rating: ${q.quality_rating || 'N/A'}`).join('\n')}
${relevantQuestions.length > 50 ? `... and ${relevantQuestions.length - 50} more questions` : ''}

Requirements:
- Target Skills: ${targetSkills.join(', ') || 'Any'}
- Difficulty Distribution: ${Object.entries(difficultyDistribution).map(([level, percent]) => `${level}: ${percent}%`).join(', ')}
- Question Types: ${questionTypes.join(', ')}
- Target Total Points: ${totalPoints}
- Time Limit: ${timeLimitMinutes} minutes
- Additional Criteria: ${aiCriteria || 'None'}

Optimization Goals:
1. Maximize skill coverage across target skills
2. Balance difficulty according to specified distribution  
3. Prefer higher-rated and frequently-used questions
4. Ensure variety in question types
5. Fit within time and point constraints
6. Create a coherent assessment flow

Select 8-15 questions that create the most effective assessment. Consider:
- Progressive difficulty curve
- Comprehensive skill testing
- Realistic time allocation
- Quality and proven performance

Return a JSON array of question IDs in optimal order:
["question-id-1", "question-id-2", ...]`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert at creating optimal assessment question selections. Always return valid JSON arrays of question IDs.' 
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1500,
      temperature: 0.3,
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
  }

  try {
    const selectedIds = JSON.parse(data.choices[0].message.content);
    
    // Get the actual question objects in the specified order
    const selectedQuestions = selectedIds
      .map((id: string) => relevantQuestions.find(q => q.id === id))
      .filter(Boolean);

    // If AI selection is insufficient, add high-quality questions to meet requirements
    if (selectedQuestions.length < 5) {
      const additionalQuestions = relevantQuestions
        .filter(q => !selectedIds.includes(q.id))
        .sort((a, b) => {
          const scoreA = (a.quality_rating || 3) * 0.6 + (a.usage_count || 0) * 0.4;
          const scoreB = (b.quality_rating || 3) * 0.6 + (b.usage_count || 0) * 0.4;
          return scoreB - scoreA;
        })
        .slice(0, 8 - selectedQuestions.length);

      selectedQuestions.push(...additionalQuestions);
    }

    console.log(`Selected ${selectedQuestions.length} questions for optimal assessment`);
    return selectedQuestions;

  } catch (parseError) {
    console.error('Failed to parse AI selection, using fallback algorithm');
    
    // Fallback: Smart algorithmic selection
    return fallbackQuestionSelection(
      relevantQuestions,
      targetSkills,
      difficultyDistribution,
      totalPoints
    );
  }
}

function fallbackQuestionSelection(
  questions: any[],
  targetSkills: string[],
  difficultyDistribution: any,
  totalPoints: number
) {
  // Score and rank questions
  const scoredQuestions = questions.map(q => {
    let score = 0;
    
    // Quality score (40%)
    score += (q.quality_rating || 3) * 0.4;
    
    // Usage score (20%) - normalize usage count
    const maxUsage = Math.max(...questions.map(qq => qq.usage_count || 0));
    score += maxUsage > 0 ? ((q.usage_count || 0) / maxUsage) * 0.2 : 0;
    
    // Skill relevance (30%)
    if (targetSkills.length > 0) {
      const skillMatch = q.skills.filter((skill: string) => targetSkills.includes(skill)).length;
      score += (skillMatch / Math.max(targetSkills.length, 1)) * 0.3;
    }
    
    // Difficulty distribution alignment (10%)
    const targetPercent = difficultyDistribution[q.difficulty] || 0;
    score += targetPercent * 0.001; // Small boost for aligned difficulty
    
    return { ...q, score };
  });

  // Sort by score and select top questions
  scoredQuestions.sort((a, b) => b.score - a.score);
  
  // Select diverse set of top questions
  const selected = [];
  const usedSkills = new Set();
  const difficultyCount = { beginner: 0, intermediate: 0, advanced: 0 };
  
  for (const question of scoredQuestions) {
    if (selected.length >= 12) break;
    
    // Prefer questions that add new skills
    const addsNewSkill = question.skills.some((skill: string) => !usedSkills.has(skill));
    const needsMoreOfDifficulty = difficultyCount[question.difficulty as keyof typeof difficultyCount] < 4;
    
    if ((addsNewSkill || needsMoreOfDifficulty) && selected.length < 10) {
      selected.push(question);
      question.skills.forEach((skill: string) => usedSkills.add(skill));
      difficultyCount[question.difficulty as keyof typeof difficultyCount]++;
    }
  }
  
  // Fill remaining slots with highest-scoring questions
  for (const question of scoredQuestions) {
    if (selected.length >= 10) break;
    if (!selected.find(sq => sq.id === question.id)) {
      selected.push(question);
    }
  }
  
  return selected;
}

function getDifficultyBreakdown(questions: any[]) {
  const breakdown = { beginner: 0, intermediate: 0, advanced: 0 };
  questions.forEach(q => {
    if (breakdown.hasOwnProperty(q.difficulty)) {
      breakdown[q.difficulty as keyof typeof breakdown]++;
    }
  });
  return breakdown;
}

function estimateCompletionTime(questions: any[]) {
  // Rough time estimates by question type (in minutes)
  const timeEstimates = {
    coding: 15,
    subjective: 10,
    mcq: 3,
    file_upload: 8,
    audio: 5
  };
  
  return questions.reduce((total, q) => {
    return total + (timeEstimates[q.question_type as keyof typeof timeEstimates] || 5);
  }, 0);
}