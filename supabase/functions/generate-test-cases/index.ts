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

    console.log('Request payload:', { problemDescription: problemDescription?.substring(0, 100), language, difficulty });

    // Enhanced input validation
    if (!problemDescription || problemDescription.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: 'Problem description must be at least 10 characters long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!language || typeof language !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Valid language is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
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

    // Retry logic for OpenAI API calls
    let result;
    let lastError;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt} of ${maxRetries}`);
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4.1-2025-04-14', // Using more stable model
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            max_tokens: 3000,
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error(`OpenAI API error (attempt ${attempt}):`, response.status, errorData);
          
          if (response.status === 429) {
            // Rate limiting - wait before retry
            const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
            console.log(`Rate limited, waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          
          throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
        }

        const data = await response.json();
        const generatedContent = data.choices?.[0]?.message?.content;

        console.log(`Raw AI response (attempt ${attempt}):`, generatedContent?.substring(0, 200) + '...');

        if (!generatedContent || generatedContent.trim().length === 0) {
          throw new Error('OpenAI returned empty response');
        }

        // Parse the JSON response from AI
        try {
          const jsonMatch = generatedContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          const jsonContent = jsonMatch ? jsonMatch[1] : generatedContent;
          result = JSON.parse(jsonContent);
          
          // Validate the result structure
          if (!result.testCases || !Array.isArray(result.testCases) || result.testCases.length === 0) {
            throw new Error('Invalid test cases structure in AI response');
          }
          
          console.log(`Successfully generated ${result.testCases.length} test cases on attempt ${attempt}`);
          break; // Success - exit retry loop
          
        } catch (parseError) {
          console.error(`JSON parsing failed on attempt ${attempt}:`, parseError);
          lastError = parseError;
          
          if (attempt === maxRetries) {
            // Last attempt failed, use fallback
            console.log('All attempts failed, using fallback response');
            result = {
              testCases: [
                {
                  input: "sample_input",
                  expectedOutput: "sample_output", 
                  description: `Basic test case for ${language} problem`,
                  category: "basic",
                  difficulty: difficulty || "easy",
                  points: 2,
                  isVisible: true,
                  explanation: "Simple test to verify basic functionality",
                  inputSize: "small",
                  timeComplexityNote: "O(1)"
                }
              ],
              starterCodeTemplate: language === 'java' 
                ? `public class Solution {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}`
                : `// Write your solution here\nfunction solution(input) {\n    // Your code here\n    return input;\n}`,
              hints: ["Consider the problem constraints", "Think about edge cases"],
              commonMistakes: ["Not handling empty inputs", "Missing return statement"],
              optimizationTips: ["Consider using built-in methods", "Avoid nested loops if possible"]
            };
            break;
          }
          
          // Continue to next attempt
          continue;
        }
        
      } catch (error) {
        console.error(`Error on attempt ${attempt}:`, error);
        lastError = error;
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retry
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    console.log('Final generated test cases:', result);

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
        timestamp: new Date().toISOString(),
        generationAttempts: maxRetries
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in generate-test-cases function:', error);
    
    // Enhanced error response with more context
    const errorResponse = {
      error: 'Test case generation failed',
      details: error.message,
      timestamp: new Date().toISOString(),
      context: {
        language: language || 'unknown',
        difficulty: difficulty || 'unknown',
        hasDescription: !!problemDescription
      }
    };
    
    return new Response(
      JSON.stringify(errorResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});