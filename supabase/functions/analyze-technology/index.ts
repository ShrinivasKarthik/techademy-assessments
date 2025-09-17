import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { technology, problemDescription } = await req.json();
    
    if (!technology) {
      return new Response(
        JSON.stringify({ error: 'Technology input is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Analyzing technology:', technology);

    const systemPrompt = `You are a technology analysis expert. Analyze the given technology/skill input and return a structured analysis.

CRITICAL: Respond ONLY with valid JSON. No markdown, no explanations, just the JSON object.

Required format:
{
  "primaryLanguage": "main programming language (e.g., javascript, python, java)",
  "framework": "main framework if any (e.g., react, django, spring)",
  "category": "project category (e.g., web_frontend, web_backend, mobile, desktop, data_science, devops)",
  "fileStructure": {
    "rootFiles": ["list of root level files"],
    "folders": [
      {
        "name": "folder name",
        "files": ["files in this folder"],
        "subfolders": ["subfolder names if any"]
      }
    ]
  },
  "evaluationCriteria": [
    "criterion 1 for evaluation",
    "criterion 2 for evaluation"
  ],
  "testScenarios": [
    "scenario 1 to test",
    "scenario 2 to test"
  ],
  "suggestedFiles": [
    {
      "name": "filename with extension",
      "path": "relative/path/to/file",
      "purpose": "what this file is for",
      "isMainFile": true/false
    }
  ]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Analyze this technology: "${technology}"${problemDescription ? `\nProblem context: ${problemDescription}` : ''}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = data.choices[0].message.content;

    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', analysisText);
      // Fallback analysis
      analysis = {
        primaryLanguage: technology.toLowerCase().includes('python') ? 'python' : 
                        technology.toLowerCase().includes('java') ? 'java' : 'javascript',
        framework: '',
        category: 'web_frontend',
        fileStructure: {
          rootFiles: ['README.md', 'package.json'],
          folders: [{ name: 'src', files: ['main.js'], subfolders: [] }]
        },
        evaluationCriteria: ['Code structure and organization', 'Implementation quality'],
        testScenarios: ['Basic functionality test', 'Error handling test'],
        suggestedFiles: [
          { name: 'main.js', path: 'src/main.js', purpose: 'Main entry point', isMainFile: true }
        ]
      };
    }

    console.log('Technology analysis completed:', analysis);

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-technology function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});