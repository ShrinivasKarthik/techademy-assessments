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
      type, 
      skills = [], 
      difficulty = 'intermediate', 
      count = 1, 
      context = '',
      assessmentContext = null,
      questionType = null
    } = await req.json();

    console.log('Enhanced AI Generator Request:', { type, skills, difficulty, count, context, questionType });

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Create supabase client for database operations
    const supabase = createClient(supabaseUrl, supabaseKey);

    // For now, use null as user ID (no authentication required)
    const userId = null;
    console.log('Running without authentication - userId set to null');

    let results = [];

    if (type === 'bulk_generate') {
      // Generate multiple questions based on skills and context
      results = await generateBulkQuestions(skills, difficulty, count, context, assessmentContext, supabase, userId, questionType);
    } else if (type === 'skill_targeted') {
      // Generate questions targeted to specific skills
      results = await generateSkillTargetedQuestion(skills, difficulty, context, supabase, userId, questionType);
    } else if (type === 'auto_tag') {
      // Auto-tag existing questions with skills
      const { questionData } = await req.json();
      results = await autoTagQuestion(questionData);
    } else if (type === 'recommend_questions') {
      // Recommend questions based on assessment context
      results = await recommendQuestions(assessmentContext, supabase);
    } else {
      throw new Error('Invalid generation type');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data: results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in enhanced AI generator:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateBulkQuestions(skills: string[], difficulty: string, count: number, context: string, assessmentContext: any, supabase: any, userId: string, questionType: string | null) {
  const skillsText = skills.length > 0 ? skills.join(', ') : 'general programming';
  
  const prompt = `Generate ${count} diverse assessment questions focused on these skills: ${skillsText}.
  
  Difficulty: ${difficulty}
  Context: ${context}
  Assessment Context: ${JSON.stringify(assessmentContext || {})}
  
  Requirements:
  ${questionType ? `- Generate ONLY ${questionType} questions` : '- Mix different question types (coding, MCQ, subjective)'}
  - Each question should test specific skills mentioned
  - Provide variety in complexity and approach
  - Include proper configuration for each question type
  - For MCQ questions: Create realistic, specific options with clear correct answers
  
  Return a JSON array of questions with this exact structure:
  [
    {
      "title": "Question title",
      "description": "Detailed description",
      "question_type": "coding|mcq|subjective|file_upload|audio",
      "difficulty": "beginner|intermediate|advanced",
      "points": 10,
      "skills": ["skill1", "skill2"],
      "tags": ["tag1", "tag2"],
      "config": {
        // Type-specific configuration
      }
    }
  ]`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert assessment designer. Generate diverse, high-quality questions that test specific skills effectively. Always return valid JSON without markdown formatting.' 
        },
        { role: 'user', content: prompt }
      ],
      max_completion_tokens: 3000,
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
  }

  try {
    const content = data.choices[0].message.content;
    const cleanedContent = extractJsonFromMarkdown(content);
    let generatedQuestions = JSON.parse(cleanedContent);
    generatedQuestions = Array.isArray(generatedQuestions) ? generatedQuestions : [generatedQuestions];

    // Save the generated questions to the database
    const savedQuestions = [];
    for (const questionData of generatedQuestions) {
      try {
        // Get the highest order_index for standalone questions or use 0
        const { data: maxOrder } = await supabase
          .from('questions')
          .select('order_index')
          .is('assessment_id', null)
          .order('order_index', { ascending: false })
          .limit(1);

        const nextOrderIndex = maxOrder && maxOrder.length > 0 ? (maxOrder[0].order_index || 0) + 1 : 0;

        const { data: savedQuestion, error: saveError } = await supabase
          .from('questions')
          .insert({
            title: questionData.title || '',
            question_text: questionData.description || questionData.question_text || '',
            question_type: questionData.question_type || 'mcq',
            difficulty: questionData.difficulty || difficulty,
            points: questionData.points || 10,
            config: questionData.config || {},
            tags: questionData.tags || [],
            order_index: nextOrderIndex,
            assessment_id: null, // Standalone question for question bank
            created_by: userId // Set to actual user ID from auth token
          })
          .select()
          .single();

        if (saveError) {
          console.error('Error saving question:', saveError);
          continue;
        }

        // Handle skills mapping if provided
        if (questionData.skills && Array.isArray(questionData.skills)) {
          // Get or create skills
          const { data: skillsData, error: skillsError } = await supabase
            .from('skills')
            .select('id, name')
            .in('name', questionData.skills);

          if (!skillsError && skillsData) {
            const existingSkills = skillsData;
            const existingSkillNames = new Set(existingSkills.map(s => s.name));
            const newSkillNames = questionData.skills.filter(name => !existingSkillNames.has(name));

            // Create new skills
            let newSkills = [];
            if (newSkillNames.length > 0) {
              const { data: newSkillsData, error: createSkillsError } = await supabase
                .from('skills')
                .insert(newSkillNames.map(name => ({ name })))
                .select('id, name');

              if (!createSkillsError) {
                newSkills = newSkillsData || [];
              }
            }

            // Map question to skills
            const allSkills = [...existingSkills, ...newSkills];
            if (allSkills.length > 0) {
              await supabase
                .from('question_skills')
                .insert(allSkills.map(skill => ({
                  question_id: savedQuestion.id,
                  skill_id: skill.id
                })));
            }
          }
        }

        savedQuestions.push(savedQuestion);
      } catch (questionError) {
        console.error('Error processing individual question:', questionError);
      }
    }

    console.log(`Successfully saved ${savedQuestions.length} out of ${generatedQuestions.length} questions`);
    return savedQuestions;
  } catch (parseError) {
    console.error('Failed to parse generated questions:', data.choices[0].message.content);
    throw new Error('Failed to generate valid questions format');
  }
}

async function generateSkillTargetedQuestion(skills: string[], difficulty: string, context: string, supabase: any, userId: string, questionType: string | null) {
  const skillsText = skills.join(', ');
  
  const prompt = `Create a focused assessment question specifically designed to test these skills: ${skillsText}.
  
  Difficulty: ${difficulty}
  Context: ${context}
  
  The question should:
  - Directly assess the specified skills
  - Be appropriately challenging for the difficulty level  
  - Include realistic scenarios or examples
  - Have clear success criteria
  ${questionType ? `- Must be of type: ${questionType}` : ''}
  
  Return a single question object with this structure:
  {
    "title": "Question title",
    "description": "Detailed description with clear instructions",
    "question_type": "${questionType || 'coding|mcq|subjective|file_upload|audio'}", 
    "difficulty": "${difficulty}",
    "points": ${difficulty === 'beginner' ? 5 : difficulty === 'intermediate' ? 10 : 15},
    "skills": ${JSON.stringify(skills)},
    "tags": ["relevant", "tags"],
    "config": {
      // Complete configuration for the question type
    }
  }`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert at creating targeted assessment questions that effectively test specific skills. Always return valid JSON without markdown formatting.' 
        },
        { role: 'user', content: prompt }
      ],
      max_completion_tokens: 2000,
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
  }

  try {
    const content = data.choices[0].message.content;
    const cleanedContent = extractJsonFromMarkdown(content);
    const questionData = JSON.parse(cleanedContent);

    // Save the generated question to the database
    try {
      // Get the highest order_index for standalone questions or use 0
      const { data: maxOrder } = await supabase
        .from('questions')
        .select('order_index')
        .is('assessment_id', null)
        .order('order_index', { ascending: false })
        .limit(1);

      const nextOrderIndex = maxOrder && maxOrder.length > 0 ? (maxOrder[0].order_index || 0) + 1 : 0;

      const { data: savedQuestion, error: saveError } = await supabase
        .from('questions')
        .insert({
          title: questionData.title || '',
          question_text: questionData.description || questionData.question_text || '',
          question_type: questionData.question_type || 'mcq',
          difficulty: questionData.difficulty || difficulty,
          points: questionData.points || 10,
          config: questionData.config || {},
          tags: questionData.tags || [],
          order_index: nextOrderIndex,
          assessment_id: null, // Standalone question for question bank
          created_by: userId // Set to actual user ID from auth token
        })
        .select()
        .single();

      if (saveError) {
        console.error('Error saving skill-targeted question:', saveError);
        throw saveError;
      }

      // Handle skills mapping
      if (questionData.skills && Array.isArray(questionData.skills)) {
        // Get or create skills
        const { data: skillsData, error: skillsError } = await supabase
          .from('skills')
          .select('id, name')
          .in('name', questionData.skills);

        if (!skillsError && skillsData) {
          const existingSkills = skillsData;
          const existingSkillNames = new Set(existingSkills.map(s => s.name));
          const newSkillNames = questionData.skills.filter(name => !existingSkillNames.has(name));

          // Create new skills
          let newSkills = [];
          if (newSkillNames.length > 0) {
            const { data: newSkillsData, error: createSkillsError } = await supabase
              .from('skills')
              .insert(newSkillNames.map(name => ({ name })))
              .select('id, name');

            if (!createSkillsError) {
              newSkills = newSkillsData || [];
            }
          }

          // Map question to skills
          const allSkills = [...existingSkills, ...newSkills];
          if (allSkills.length > 0) {
            await supabase
              .from('question_skills')
              .insert(allSkills.map(skill => ({
                question_id: savedQuestion.id,
                skill_id: skill.id
              })));
          }
        }
      }

      console.log('Successfully saved skill-targeted question:', savedQuestion.id);
      return savedQuestion;
    } catch (questionError) {
      console.error('Error saving skill-targeted question:', questionError);
      throw new Error('Failed to save generated question to database');
    }
  } catch (parseError) {
    console.error('Failed to parse generated question:', data.choices[0].message.content);
    throw new Error('Failed to generate valid question format');
  }
}

async function autoTagQuestion(questionData: any) {
  const prompt = `Analyze this assessment question and suggest appropriate skills and tags:

  Title: ${questionData.title}
  Description: ${questionData.description || 'No description'}
  Type: ${questionData.question_type}
  Difficulty: ${questionData.difficulty}
  Config: ${JSON.stringify(questionData.config || {})}
  
  Based on the question content, suggest:
  1. Skills that this question tests (be specific and relevant)
  2. Tags for categorization and searchability
  
  Return a JSON object with this structure:
  {
    "skills": ["skill1", "skill2", "skill3"],
    "tags": ["tag1", "tag2", "tag3"],
    "reasoning": "Brief explanation of why these skills/tags were chosen"
  }`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert at analyzing educational content and identifying the skills and concepts being tested. Always return valid JSON without markdown formatting.' 
        },
        { role: 'user', content: prompt }
      ],
      max_completion_tokens: 1000,
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
  }

  try {
    const content = data.choices[0].message.content;
    const cleanedContent = extractJsonFromMarkdown(content);
    return JSON.parse(cleanedContent);
  } catch (parseError) {
    console.error('Failed to parse auto-tag results:', data.choices[0].message.content);
    throw new Error('Failed to analyze question for tags');
  }
}

async function recommendQuestions(assessmentContext: any, supabase: any) {
  if (!assessmentContext) {
    throw new Error('Assessment context required for recommendations');
  }

  // Get existing questions from the database that might be relevant
  const { data: existingQuestions, error } = await supabase
    .from('questions')
    .select('*')
    .limit(50);

  if (error) {
    console.error('Error fetching questions for recommendations:', error);
    return [];
  }

  const prompt = `Based on this assessment context, recommend the most suitable existing questions:

  Assessment: ${assessmentContext.title || 'Untitled'}
  Description: ${assessmentContext.description || 'No description'}
  Duration: ${assessmentContext.duration_minutes || 60} minutes
  Existing Questions Count: ${assessmentContext.existingQuestionsCount || 0}
  Target Skills: ${JSON.stringify(assessmentContext.targetSkills || [])}
  
  Available Questions:
  ${existingQuestions.map((q: any, i: number) => `${i + 1}. ${q.title} (${q.question_type}, ${q.difficulty}) - Usage: ${q.usage_count || 0}, Rating: ${q.quality_rating || 'N/A'}`).join('\n')}
  
  Recommend the top 10 most suitable questions considering:
  - Relevance to assessment goals
  - Question quality and usage statistics
  - Difficulty distribution
  - Variety of question types
  - Time constraints
  
  Return a JSON array of question IDs with reasoning:
  [
    {
      "question_id": "uuid",
      "relevance_score": 0.9,
      "reasoning": "Why this question is recommended"
    }
  ]`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert at matching questions to assessment objectives and recommending the best questions for specific learning outcomes. Always return valid JSON without markdown formatting.' 
        },
        { role: 'user', content: prompt }
      ],
      max_completion_tokens: 2000,
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
  }

  try {
    const content = data.choices[0].message.content;
    const cleanedContent = extractJsonFromMarkdown(content);
    const recommendations = JSON.parse(cleanedContent);
    
    // Enhance recommendations with actual question data
    const enhancedRecommendations = recommendations.map((rec: any) => {
      const question = existingQuestions.find((q: any) => q.id === rec.question_id);
      return {
        ...rec,
        question: question || null
      };
    }).filter((rec: any) => rec.question !== null);

    return enhancedRecommendations;
  } catch (parseError) {
    console.error('Failed to parse recommendations:', data.choices[0].message.content);
    throw new Error('Failed to generate question recommendations');
  }
}

// Helper function to extract JSON from markdown code blocks
function extractJsonFromMarkdown(content: string): string {
  // Remove markdown code block formatting if present
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }
  // Return original content if no markdown formatting found
  return content.trim();
}