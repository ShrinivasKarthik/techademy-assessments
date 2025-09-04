import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, language, testCases, questionContext } = await req.json();

    if (!code || !language || !testCases || testCases.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Code, language, and test cases are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Enhanced system prompt for code execution simulation
    const systemPrompt = `You are an expert code execution simulator. Your job is to mentally execute the provided code step-by-step and predict the exact output for each test case.

For each test case:
1. Trace through the code execution line by line
2. Track variable states and memory allocation
3. Predict the exact output format and content
4. Identify any runtime errors that would occur
5. Estimate execution time and memory usage
6. Provide detailed debugging information if the code fails

Be extremely precise with output formatting, data types, and edge cases.

Respond with a JSON object in this exact format:
{
  "executionResults": [
    {
      "testCaseIndex": number,
      "input": string,
      "expectedOutput": string,
      "predictedOutput": string,
      "actualOutput": string,
      "passed": boolean,
      "executionTime": number,
      "memoryUsage": number,
      "runtimeError": string | null,
      "executionTrace": [
        {
          "line": number,
          "operation": string,
          "variables": object,
          "output": string
        }
      ],
      "debuggingHints": [string]
    }
  ],
  "overallSuccess": boolean,
  "totalExecutionTime": number,
  "codeAnalysis": {
    "syntaxValid": boolean,
    "logicCorrect": boolean,
    "handlesEdgeCases": boolean,
    "efficiency": string
  },
  "suggestions": [string]
}`;

    const testCaseDetails = testCases.map((tc: any, index: number) => 
      `Test Case ${index + 1}:
Input: ${tc.input}
Expected Output: ${tc.expectedOutput}
${tc.description ? `Description: ${tc.description}` : ''}`
    ).join('\n\n');

    const userPrompt = `
Language: ${language}
${questionContext ? `Problem Context: ${questionContext}` : ''}

Code to execute:
\`\`\`${language}
${code}
\`\`\`

Test Cases:
${testCaseDetails}

Please simulate the execution of this code for each test case and provide detailed results following the JSON structure. Be extremely precise with output formatting and consider all edge cases.`;

    console.log('Sending code execution simulation request to OpenAI...');

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
        temperature: 0.1, // Very low temperature for consistent execution simulation
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const simulationContent = data.choices[0].message.content;

    console.log('Raw execution simulation response:', simulationContent);

    // Parse the JSON response from AI
    let simulationResults;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = simulationContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonContent = jsonMatch ? jsonMatch[1] : simulationContent;
      simulationResults = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Fallback response structure
      simulationResults = {
        executionResults: testCases.map((tc: any, index: number) => ({
          testCaseIndex: index,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          predictedOutput: "Execution simulation failed",
          actualOutput: "Error: Could not simulate execution",
          passed: false,
          executionTime: 0,
          memoryUsage: 0,
          runtimeError: "Simulation parsing error",
          executionTrace: [],
          debuggingHints: ["Please try running the simulation again"]
        })),
        overallSuccess: false,
        totalExecutionTime: 0,
        codeAnalysis: {
          syntaxValid: false,
          logicCorrect: false,
          handlesEdgeCases: false,
          efficiency: "Unknown"
        },
        suggestions: ["Simulation could not be completed due to parsing error"]
      };
    }

    console.log('Processed execution simulation:', simulationResults);

    return new Response(
      JSON.stringify({
        success: true,
        simulation: simulationResults,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in simulate-execution function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Code execution simulation failed', 
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});