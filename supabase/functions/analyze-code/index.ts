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
    const { code, language, questionContext, testCases } = await req.json();

    if (!code || !language) {
      return new Response(
        JSON.stringify({ error: 'Code and language are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Enhanced system prompt for comprehensive code analysis
    const systemPrompt = `You are an expert code analyst and educator. Analyze the provided code thoroughly and provide detailed feedback in the following areas:

1. **Syntax Analysis**: Check for syntax errors, missing imports, undefined variables
2. **Logic Flow**: Analyze the algorithm logic and correctness 
3. **Code Quality**: Assess naming conventions, structure, readability, and best practices
4. **Performance**: Estimate time/space complexity and identify optimization opportunities
5. **Security**: Scan for potential vulnerabilities and security issues
6. **Test Case Validation**: Predict how the code will perform against provided test cases

Provide your response as a JSON object with this structure:
{
  "syntaxErrors": [{"line": number, "message": string, "severity": "error"|"warning"}],
  "logicAnalysis": {
    "correctness": number (0-100),
    "algorithmApproach": string,
    "potentialIssues": [string],
    "suggestions": [string]
  },
  "codeQuality": {
    "score": number (0-100),
    "namingConventions": number (0-100),
    "structure": number (0-100),
    "readability": number (0-100),
    "bestPractices": [string],
    "improvements": [string]
  },
  "performance": {
    "timeComplexity": string,
    "spaceComplexity": string,
    "optimizationSuggestions": [string]
  },
  "security": {
    "vulnerabilities": [{"type": string, "severity": "low"|"medium"|"high", "description": string}],
    "recommendations": [string]
  },
  "testCasePredictions": [{"input": string, "expectedOutput": string, "predictedOutput": string, "willPass": boolean, "confidence": number}],
  "overallScore": number (0-100),
  "summary": string
}`;

    const userPrompt = `
Language: ${language}
${questionContext ? `Question Context: ${questionContext}` : ''}

Code to analyze:
\`\`\`${language}
${code}
\`\`\`

${testCases ? `Test Cases:
${testCases.map((tc: any, i: number) => `Test ${i + 1}: Input: ${tc.input}, Expected: ${tc.expectedOutput}`).join('\n')}` : ''}

Please provide a comprehensive analysis following the JSON structure specified.`;

    console.log('Sending code analysis request to OpenAI...');

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
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysisContent = data.choices[0].message.content;

    console.log('Raw AI response:', analysisContent);

    // Parse the JSON response from AI
    let analysis;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = analysisContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonContent = jsonMatch ? jsonMatch[1] : analysisContent;
      analysis = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Fallback response structure
      analysis = {
        syntaxErrors: [],
        logicAnalysis: {
          correctness: 70,
          algorithmApproach: "Analysis failed - could not parse AI response",
          potentialIssues: ["Unable to complete full analysis"],
          suggestions: ["Please try again"]
        },
        codeQuality: {
          score: 70,
          namingConventions: 70,
          structure: 70,
          readability: 70,
          bestPractices: [],
          improvements: []
        },
        performance: {
          timeComplexity: "Unknown",
          spaceComplexity: "Unknown",
          optimizationSuggestions: []
        },
        security: {
          vulnerabilities: [],
          recommendations: []
        },
        testCasePredictions: testCases?.map((tc: any) => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          predictedOutput: "Analysis incomplete",
          willPass: false,
          confidence: 0
        })) || [],
        overallScore: 70,
        summary: "Code analysis completed with partial results due to parsing error."
      };
    }

    console.log('Processed analysis:', analysis);

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in analyze-code function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Code analysis failed', 
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});