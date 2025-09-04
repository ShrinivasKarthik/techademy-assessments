import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { questionType, questionDescription, difficulty, skills } = await req.json();

    if (!questionType || !questionDescription) {
      return new Response(
        JSON.stringify({ error: 'Question type and description are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `You are an expert educator and assessment specialist. Design comprehensive rubrics for evaluating student performance on different types of questions.

For coding questions, focus on:
- Correctness (algorithm logic, test case passing)
- Code Quality (naming, structure, readability, best practices)
- Efficiency (time/space complexity optimization)
- Problem Solving (approach, edge case handling)

For subjective questions, focus on:
- Content Knowledge (accuracy, depth of understanding)
- Critical Thinking (analysis, reasoning, synthesis)
- Communication (clarity, organization, examples)
- Completeness (addresses all aspects of the question)

For other question types, adapt accordingly.

Create rubrics with:
- 4-6 evaluation dimensions
- Clear performance levels (Excellent, Good, Satisfactory, Needs Improvement)
- Specific point ranges for each level
- Detailed descriptions for each criteria and level
- Suggested weights for each dimension

Respond with a JSON object:
{
  "rubric": {
    "dimensions": [
      {
        "name": string,
        "description": string,
        "weight": number (0-1, should sum to 1),
        "levels": [
          {
            "name": "Excellent"|"Good"|"Satisfactory"|"Needs Improvement",
            "pointRange": [number, number],
            "description": string,
            "indicators": [string]
          }
        ]
      }
    ],
    "totalPoints": number,
    "passingScore": number,
    "rubricType": string,
    "instructions": string
  },
  "templates": [
    {
      "name": string,
      "description": string,
      "applicableTypes": [string],
      "rubric": object
    }
  ],
  "suggestions": {
    "weightingTips": [string],
    "commonPitfalls": [string],
    "improvementTips": [string]
  }
}`;

    const userPrompt = `
Question Type: ${questionType}
Difficulty Level: ${difficulty}
Question Description: ${questionDescription}
${skills?.length ? `Target Skills: ${skills.join(', ')}` : ''}

Generate a comprehensive rubric for evaluating student responses to this question. Make the rubric specific to the question type and difficulty level, with clear performance indicators and fair point distributions.`;

    console.log('Generating rubric with AI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 3000,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;

    console.log('Raw AI response:', generatedContent);

    // Parse the JSON response from AI
    let result;
    try {
      const jsonMatch = generatedContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonContent = jsonMatch ? jsonMatch[1] : generatedContent;
      result = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Fallback response
      result = {
        rubric: {
          dimensions: [
            {
              name: "Correctness",
              description: "Accuracy of the solution and test case performance",
              weight: 0.4,
              levels: [
                {
                  name: "Excellent",
                  pointRange: [90, 100],
                  description: "All test cases pass, correct algorithm",
                  indicators: ["Passes all test cases", "Correct algorithm logic", "Handles edge cases"]
                },
                {
                  name: "Good",
                  pointRange: [70, 89],
                  description: "Most test cases pass, minor issues",
                  indicators: ["Passes most test cases", "Generally correct approach", "Minor logical errors"]
                },
                {
                  name: "Satisfactory",
                  pointRange: [50, 69],
                  description: "Some test cases pass, basic understanding shown",
                  indicators: ["Passes basic test cases", "Shows understanding of problem", "Some logical issues"]
                },
                {
                  name: "Needs Improvement",
                  pointRange: [0, 49],
                  description: "Few or no test cases pass",
                  indicators: ["Fails most test cases", "Incorrect approach", "Major logical errors"]
                }
              ]
            }
          ],
          totalPoints: 100,
          passingScore: 60,
          rubricType: questionType,
          instructions: "Evaluate based on the criteria provided for each dimension."
        },
        templates: [],
        suggestions: {
          weightingTips: ["Adjust weights based on question complexity"],
          commonPitfalls: ["Being too lenient on correctness"],
          improvementTips: ["Use specific examples in descriptions"]
        }
      };
    }

    console.log('Generated rubric:', result);

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in generate-rubric function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Rubric generation failed', 
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});