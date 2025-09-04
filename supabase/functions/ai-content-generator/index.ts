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
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert assessment designer who creates high-quality educational questions. Always respond with valid JSON containing the question details.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedContent = JSON.parse(data.choices[0].message.content);

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

Create a multiple choice question with the following JSON structure:
{
  "title": "Question title",
  "description": "Clear question with any necessary context",
  "difficulty": "${difficulty}",
  "points": (appropriate points based on difficulty),
  "config": {
    "options": [
      {"id": "1", "text": "Correct answer", "isCorrect": true},
      {"id": "2", "text": "Incorrect option 1", "isCorrect": false},
      {"id": "3", "text": "Incorrect option 2", "isCorrect": false},
      {"id": "4", "text": "Incorrect option 3", "isCorrect": false}
    ],
    "allowMultiple": false,
    "shuffleOptions": true,
    "explanation": "Explanation of why the correct answer is right"
  }
}`;

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