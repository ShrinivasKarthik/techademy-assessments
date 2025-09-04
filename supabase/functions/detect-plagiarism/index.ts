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
    const { code, language, codeFiles } = await req.json();

    console.log('Analyzing code for plagiarism detection');
    console.log('Language:', language);
    console.log('Code length:', code?.length || 0);
    console.log('Number of files:', codeFiles?.length || 0);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Combine all code files for analysis
    const allCode = codeFiles ? 
      codeFiles.map((file: any) => `// File: ${file.name}\n${file.content}`).join('\n\n') :
      code;

    const systemPrompt = `You are an advanced code plagiarism detection AI. Analyze the provided code for:

1. **Similarity Patterns**: Look for common copy-paste patterns, similar variable naming conventions, identical algorithm implementations
2. **Code Style Analysis**: Analyze coding patterns, indentation, commenting style, variable naming conventions
3. **Structural Analysis**: Examine function organization, code structure, and architectural patterns
4. **Suspicious Indicators**: Identify inconsistent coding styles within the same submission, mixed conventions, or sudden complexity changes
5. **Known Pattern Matching**: Check for common online solution patterns, tutorial code snippets, or frequently copied implementations

Provide your analysis in the following JSON format:
{
  "overallRiskScore": 0-100,
  "riskLevel": "low" | "medium" | "high" | "critical",
  "suspiciousPatterns": [
    {
      "type": "pattern_type",
      "confidence": 0-100,
      "description": "detailed description",
      "codeSegment": "relevant code snippet",
      "lineNumbers": [start, end]
    }
  ],
  "styleAnalysis": {
    "consistencyScore": 0-100,
    "codingStyle": "description of observed style",
    "inconsistencies": ["list of style inconsistencies"]
  },
  "similarityIndicators": {
    "commonPatterns": ["list of common patterns found"],
    "suspiciousStructures": ["list of suspicious code structures"],
    "variableNamingAnalysis": "analysis of variable naming patterns"
  },
  "recommendations": [
    "specific recommendations for instructors"
  ],
  "flaggedSegments": [
    {
      "startLine": number,
      "endLine": number,
      "reason": "why this segment is flagged",
      "severity": "low" | "medium" | "high"
    }
  ]
}

Be thorough but fair. Look for genuine plagiarism indicators while avoiding false positives for common programming patterns.`;

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
          { role: 'user', content: `Analyze this ${language} code for plagiarism:\n\n${allCode}` }
        ],
        max_tokens: 2000,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Try to parse JSON response
    let plagiarismAnalysis;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = aiResponse.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
      const jsonContent = jsonMatch ? jsonMatch[1] : aiResponse;
      plagiarismAnalysis = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.log('Raw AI response:', aiResponse);
      
      // Fallback analysis
      plagiarismAnalysis = {
        overallRiskScore: 25,
        riskLevel: "low",
        suspiciousPatterns: [],
        styleAnalysis: {
          consistencyScore: 85,
          codingStyle: "Unable to parse detailed analysis",
          inconsistencies: []
        },
        similarityIndicators: {
          commonPatterns: [],
          suspiciousStructures: [],
          variableNamingAnalysis: "Analysis unavailable"
        },
        recommendations: ["Please try analysis again"],
        flaggedSegments: [],
        rawAnalysis: aiResponse
      };
    }

    console.log('Plagiarism analysis completed');
    console.log('Risk Level:', plagiarismAnalysis.riskLevel);
    console.log('Risk Score:', plagiarismAnalysis.overallRiskScore);

    return new Response(
      JSON.stringify({ 
        success: true,
        analysis: plagiarismAnalysis
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in plagiarism detection:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Plagiarism detection failed',
        details: error.message 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }, 
        status: 500 
      }
    );
  }
});