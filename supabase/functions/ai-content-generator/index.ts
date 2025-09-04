import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { topic, questionType, difficulty, context, assessmentContext } = await req.json();

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Generate AI-powered content based on type
    const prompt = buildPrompt(topic, questionType, difficulty, context, assessmentContext);
    
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
            content: 'You are an expert assessment designer who creates high-quality educational questions. Always respond with valid JSON containing the question details without markdown formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: 2000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from AI service');
    }

    const content = data.choices[0].message.content;
    const cleanedContent = extractJsonFromMarkdown(content);
    const generatedContent = JSON.parse(cleanedContent);

    console.log('Generated content:', generatedContent);

    return new Response(
      JSON.stringify({ 
        success: true, 
        content: generatedContent 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error generating content:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to generate content' 
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

function buildPrompt(topic: string, questionType: string, difficulty: string, context: string, assessmentContext?: any): string {
  const basePrompt = `Generate a high-quality ${questionType} question about "${topic}" with ${difficulty} difficulty level.`;
  
  const contextInfo = context ? `Additional context: ${context}` : '';
  const assessmentInfo = assessmentContext ? `Assessment context: This is for a ${assessmentContext.title} assessment.` : '';

  switch (questionType) {
    case 'coding':
      return `${basePrompt} ${contextInfo} ${assessmentInfo}

Create a coding question with the following JSON structure:
{
  "title": "Question title",
  "description": "Detailed question description with clear requirements",
  "difficulty": "${difficulty}",
  "points": (appropriate points based on difficulty),
  "config": {
    "language": "javascript",
    "supportedLanguages": ["javascript", "python", "java"],
    "starterCode": "// Starter code template",
    "testCases": [
      {
        "input": "test input",
        "expectedOutput": "expected output",
        "description": "what this test checks"
      }
    ],
    "hints": ["helpful hint 1", "helpful hint 2"],
    "commonMistakes": ["common mistake to avoid"],
    "optimizationTips": ["performance tip"],
    "timeLimit": 30,
    "memoryLimit": 256
  }
}`;

    case 'mcq':
      return `${basePrompt} ${contextInfo} ${assessmentInfo}

Create a realistic multiple choice question with the following JSON structure:
{
  "title": "Clear, specific question title about ${topic}",
  "description": "Well-formatted question text with context and clear instructions. Make it realistic and practical.",
  "difficulty": "${difficulty}",
  "points": (appropriate points: beginner=5, intermediate=10, advanced=15),
  "config": {
    "options": [
      {"id": "1", "text": "Realistic correct answer with specific content", "isCorrect": true},
      {"id": "2", "text": "Plausible but incorrect option", "isCorrect": false},
      {"id": "3", "text": "Another realistic incorrect option", "isCorrect": false},
      {"id": "4", "text": "Third incorrect but believable option", "isCorrect": false}
    ],
    "allowMultiple": false,
    "shuffleOptions": true,
    "explanation": "Clear explanation of why the correct answer is right and why others are wrong"
  }
}

IMPORTANT: Make the question text and options specific and realistic. Avoid placeholders like "Correct answer" or "Option 1".`;

    case 'subjective':
      return `${basePrompt} ${contextInfo} ${assessmentInfo}

Create a subjective question with the following JSON structure:
{
  "title": "Question title",
  "description": "Thought-provoking question that requires detailed analysis",
  "difficulty": "${difficulty}",
  "points": (appropriate points based on difficulty),
  "config": {
    "minWords": (minimum word count),
    "maxWords": (maximum word count),
    "placeholder": "Guidance for the answer",
    "rubric": [
      {"criteria": "Understanding", "description": "Demonstrates clear understanding", "points": 5},
      {"criteria": "Analysis", "description": "Provides thoughtful analysis", "points": 5},
      {"criteria": "Examples", "description": "Uses relevant examples", "points": 5}
    ]
  }
}`;

      default:
        return `${basePrompt} ${contextInfo} ${assessmentInfo}

Create a ${questionType} question with appropriate configuration.`;
    }
  }

  // Extract JSON from markdown code blocks if present
  function extractJsonFromMarkdown(content: string): string {
    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      return jsonMatch[1];
    }
    
    // If no markdown, try to find JSON object
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      return content.slice(jsonStart, jsonEnd + 1);
    }
    
    return content.trim();
  }