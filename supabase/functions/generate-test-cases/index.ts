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
    console.log('=== Test Case Generation Started ===');
    const requestBody = await req.json();
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    const { problemDescription, language, technology, difficulty, existingTestCases } = requestBody;

    // Enhanced input validation
    if (!problemDescription || !language || !difficulty) {
      console.error('Missing required parameters:', { problemDescription: !!problemDescription, language: !!language, difficulty: !!difficulty });
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: problemDescription, language, and difficulty are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Request payload:', { problemDescription, language, difficulty });

    // Validate problem description quality
    const descriptionWords = problemDescription.trim().split(/\s+/).length;
    if (descriptionWords < 5) {
      return new Response(
        JSON.stringify({ 
          error: 'Problem description too short. Please provide at least 5 words describing the coding challenge.',
          suggestion: 'Include details like: input format, expected output, constraints, and examples.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if description contains coding-specific terms
    const codingKeywords = ['algorithm', 'function', 'method', 'input', 'output', 'array', 'string', 'number', 'return', 'implement', 'solve', 'calculate', 'find', 'search', 'sort', 'data structure', 'time complexity', 'space complexity'];
    const hasCodeTerms = codingKeywords.some(keyword => problemDescription.toLowerCase().includes(keyword.toLowerCase()));
    
    if (!hasCodeTerms && descriptionWords < 15) {
      return new Response(
        JSON.stringify({ 
          error: 'Problem description seems too high-level for a coding challenge.',
          suggestion: 'Please specify: What should the function/method do? What are the inputs and expected outputs? Include specific algorithmic requirements.',
          example: 'Write a function that takes an array of integers and returns the two numbers that add up to a target sum.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key not found');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an expert programming instructor creating comprehensive test cases for coding problems.

CRITICAL: Always respond with valid JSON. Do not include markdown code blocks or any text outside the JSON.

If the problem description is vague or high-level (like "build an application"), interpret it as a specific algorithmic coding challenge:
- Convert architectural requirements into specific programming functions
- Focus on data structures, algorithms, and computational problems
- Create concrete input/output specifications

For each test case, provide:
- Clear input description (specific data format)
- Expected output (exact format)
- Test case category (basic/edge/corner/performance/error)
- Difficulty level (easy/medium/hard)
- Points weight (1-10 based on complexity)
- Whether it should be visible to students
- Explanation of what the test case validates

Respond ONLY with this JSON structure (no markdown, no additional text):
{
  "testCases": [
    {
      "input": "string (specific input format)",
      "expectedOutput": "string (exact expected output)",
      "description": "string (brief description)",
      "category": "basic"|"edge"|"corner"|"performance"|"error",
      "difficulty": "easy"|"medium"|"hard",
      "points": 1-10,
      "isVisible": true|false,
      "explanation": "string (what this validates)",
      "inputSize": "small"|"medium"|"large",
      "timeComplexityNote": "string"
    }
  ],
  "starterCodeTemplate": "string (basic function template)",
  "hints": ["string"],
  "commonMistakes": ["string"],
  "optimizationTips": ["string"]
}`;

    // Enhanced user prompt with specific instructions
    const userPrompt = `
Technology/Programming Language: ${technology || language}
Difficulty Level: ${difficulty}
Problem Description: ${problemDescription}

${existingTestCases?.length ? `Existing Test Cases (to avoid duplication):
${existingTestCases.map((tc: any, i: number) => `${i + 1}. Input: ${tc.input}, Output: ${tc.expectedOutput}`).join('\n')}` : ''}

INSTRUCTIONS:
1. If this is a high-level description (like "build an app"), convert it to a specific coding function
2. Create a concrete algorithmic challenge with clear input/output
3. Generate 8-12 comprehensive test cases
4. Include basic, edge, corner, and performance test cases
5. Make test cases appropriate for ${difficulty} level
6. Ensure all inputs and outputs are specific and testable

Example conversion:
"Build a dog walking app" → "Implement a function that manages dog walking schedules: takes dogs array, walkers array, and time slots, returns optimal assignments"

Focus on the core algorithmic challenge within the broader problem.`;

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
            model: 'gpt-4.1-2025-04-14',
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
            const waitTime = Math.pow(2, attempt) * 1000;
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
          // Clean the response - remove any markdown formatting
          let cleanContent = generatedContent.trim();
          
          // Remove markdown code blocks if present
          const jsonMatch = cleanContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            cleanContent = jsonMatch[1].trim();
          }
          
          // Remove any leading/trailing non-JSON content
          const startIndex = cleanContent.indexOf('{');
          const endIndex = cleanContent.lastIndexOf('}');
          if (startIndex !== -1 && endIndex !== -1) {
            cleanContent = cleanContent.substring(startIndex, endIndex + 1);
          }
          
          result = JSON.parse(cleanContent);
          
          // Comprehensive validation
          if (!result || typeof result !== 'object') {
            throw new Error('Response is not a valid object');
          }
          
          if (!result.testCases || !Array.isArray(result.testCases) || result.testCases.length === 0) {
            throw new Error('Invalid test cases structure or empty test cases array');
          }
          
          // Validate required properties in response
          const requiredProps = ['starterCodeTemplate', 'hints', 'commonMistakes', 'optimizationTips'];
          for (const prop of requiredProps) {
            if (!result[prop]) {
              console.warn(`Missing property: ${prop}, adding default`);
              if (prop === 'starterCodeTemplate') {
                result[prop] = getStarterCode(language);
              } else {
                result[prop] = [];
              }
            }
          }
          
          // Validate each test case has required properties
          result.testCases = result.testCases.map((tc: any, index: number) => ({
            input: tc.input || `test_input_${index}`,
            expectedOutput: tc.expectedOutput || `expected_output_${index}`,
            description: tc.description || `Test case ${index + 1}`,
            category: tc.category || 'basic',
            difficulty: tc.difficulty || difficulty,
            points: tc.points || 2,
            isVisible: tc.isVisible !== false,
            explanation: tc.explanation || `Validates basic functionality`,
            inputSize: tc.inputSize || 'small',
            timeComplexityNote: tc.timeComplexityNote || 'O(n)'
          }));
          
          console.log(`Successfully generated ${result.testCases.length} test cases on attempt ${attempt}`);
          break;
          
        } catch (parseError) {
          console.error(`JSON parsing failed on attempt ${attempt}:`, parseError);
          lastError = parseError;
          
          if (attempt === maxRetries) {
            console.log('All attempts failed, using fallback response');
            break;
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      } catch (error) {
        console.error(`OpenAI request failed on attempt ${attempt}:`, error);
        lastError = error;
        
        if (attempt === maxRetries) {
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    // Helper function for language-specific starter code
    function getStarterCode(lang: string): string {
      switch (lang.toLowerCase()) {
        case 'python':
          return `def solution():\n    # Implement your solution here\n    pass\n\nif __name__ == "__main__":\n    # Test your solution\n    result = solution()\n    print(result)`;
        case 'javascript':
          return `function solution() {\n    // Implement your solution here\n    return null;\n}\n\n// Test your solution\nconst result = solution();\nconsole.log(result);`;
        case 'java':
          return `public class Solution {\n    public static void main(String[] args) {\n        // Implement your solution here\n    }\n}`;
        case 'cpp':
        case 'c++':
          return `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Implement your solution here\n    return 0;\n}`;
        default:
          return `// ${lang} solution template\n// Implement your solution here`;
      }
    }

    // Enhanced fallback for failed attempts
    if (!result) {
      console.log('Using enhanced fallback due to AI generation failure');
      
      result = {
        testCases: [
          {
            input: "sample_input",
            expectedOutput: "sample_output",
            description: `Basic test case for ${language} problem`,
            category: "basic",
            difficulty: difficulty,
            points: 2,
            isVisible: true,
            explanation: "Simple test to verify basic functionality",
            inputSize: "small",
            timeComplexityNote: "O(1)"
          }
        ],
        starterCodeTemplate: getStarterCode(language),
        hints: [
          "Break down the problem into smaller steps", 
          "Consider input validation and edge cases",
          "Think about the expected time and space complexity"
        ],
        commonMistakes: [
          "Not handling empty or null inputs", 
          "Missing return statements or incorrect return types",
          "Not considering edge cases like boundary values"
        ],
        optimizationTips: [
          `Use ${language}-specific built-in methods when possible`, 
          "Avoid unnecessary nested loops",
          "Consider memory usage for large inputs"
        ]
      };
      
      console.log('Final generated test cases:', JSON.stringify(result, null, 2));
      return new Response(JSON.stringify({
        ...result,
        warning: "AI generation failed. Using basic template. Please provide a more specific problem description with algorithmic requirements."
      }), {
        status: 206,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Final generated test cases:', JSON.stringify(result, null, 2));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-test-cases function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});