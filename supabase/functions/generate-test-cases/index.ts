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
    const { problemDescription, language, difficulty, existingTestCases } = await req.json();

    if (!problemDescription || !language) {
      return new Response(
        JSON.stringify({ error: 'Problem description and language are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = `You are an expert software engineering educator and test case designer. Generate comprehensive test cases for coding problems that thoroughly validate correctness, edge cases, and performance.

Your test cases should include:
1. **Basic Cases**: Simple, straightforward examples
2. **Edge Cases**: Boundary conditions, empty inputs, single elements
3. **Corner Cases**: Complex scenarios, maximum constraints
4. **Performance Cases**: Large inputs to test efficiency
5. **Error Cases**: Invalid inputs that should be handled gracefully

For each test case, provide:
- Clear input description
- Expected output
- Test case category (basic/edge/corner/performance/error)
- Difficulty level (easy/medium/hard)
- Points weight (1-10 based on complexity)
- Whether it should be visible to students
- Explanation of what the test case validates

Respond with a JSON object:
{
  "testCases": [
    {
      "input": string,
      "expectedOutput": string,
      "description": string,
      "category": "basic"|"edge"|"corner"|"performance"|"error",
      "difficulty": "easy"|"medium"|"hard",
      "points": number (1-10),
      "isVisible": boolean,
      "explanation": string,
      "inputSize": string,
      "timeComplexityNote": string
    }
  ],
  "starterCodeTemplate": string,
  "hints": [string],
  "commonMistakes": [string],
  "optimizationTips": [string]
}`;

    const userPrompt = `
Programming Language: ${language}
Difficulty Level: ${difficulty}
Problem Description: ${problemDescription}

${existingTestCases?.length ? `Existing Test Cases (to avoid duplication):
${existingTestCases.map((tc: any, i: number) => `${i + 1}. Input: ${tc.input}, Output: ${tc.expectedOutput}`).join('\n')}` : ''}

Generate 8-12 comprehensive test cases that thoroughly validate this coding problem. Include a mix of basic cases, edge cases, corner cases, and performance tests. Make sure the test cases are appropriate for the ${difficulty} difficulty level.`;

    console.log('Generating test cases with AI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 3000,
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
        testCases: [
          {
            input: "1",
            expectedOutput: "1",
            description: "Basic test case",
            category: "basic",
            difficulty: "easy",
            points: 2,
            isVisible: true,
            explanation: "Simple test to verify basic functionality",
            inputSize: "small",
            timeComplexityNote: "O(1)"
          }
        ],
        starterCodeTemplate: `// Write your solution here\nfunction solution(input) {\n    // Your code here\n    return input;\n}`,
        hints: ["Consider the problem constraints", "Think about edge cases"],
        commonMistakes: ["Not handling empty inputs", "Missing return statement"],
        optimizationTips: ["Consider using built-in methods", "Avoid nested loops if possible"]
      };
    }

    console.log('Generated test cases:', result);

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
    console.error('Error in generate-test-cases function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Test case generation failed', 
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});