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
    const { files, questionContext, expectedOutput } = await req.json();

    if (!files || files.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Code files are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Check if this is a UI-related project
    const hasUIFiles = files.some((file: any) => 
      file.language === 'html' || 
      file.language === 'css' || 
      file.language === 'javascript' ||
      file.name.endsWith('.html') || 
      file.name.endsWith('.css') || 
      file.name.endsWith('.js')
    );

    if (!hasUIFiles) {
      return new Response(
        JSON.stringify({ 
          success: true,
          preview: {
            isUIProject: false,
            message: "This project doesn't contain UI files. Preview generation is only available for HTML, CSS, and JavaScript projects."
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Enhanced system prompt for UI preview generation
    const systemPrompt = `You are an expert web developer and UI/UX analyst. Analyze the provided HTML, CSS, and JavaScript code and generate a comprehensive UI preview analysis.

Your tasks:
1. **Visual Mockup Description**: Describe exactly how the UI will look
2. **Layout Analysis**: Analyze the structure, positioning, and responsive design
3. **Styling Assessment**: Evaluate CSS styles, colors, typography, and visual appeal
4. **Functionality Analysis**: Assess JavaScript functionality and interactivity
5. **Accessibility Compliance**: Check for accessibility best practices
6. **Cross-browser Compatibility**: Identify potential compatibility issues
7. **Performance Assessment**: Evaluate loading performance and optimization
8. **Mobile Responsiveness**: Analyze mobile-first design principles

Provide your response as a JSON object with this structure:
{
  "isUIProject": true,
  "visualMockup": {
    "description": string,
    "layout": string,
    "components": [{"name": string, "description": string, "styling": string}],
    "colorScheme": [string],
    "typography": string,
    "screenshots": string // Base64 encoded mock screenshot if possible
  },
  "layoutAnalysis": {
    "structure": string,
    "positioning": string,
    "responsive": boolean,
    "breakpoints": [string],
    "gridSystem": string
  },
  "stylingAssessment": {
    "cssQuality": number (0-100),
    "designConsistency": number (0-100),
    "visualAppeal": number (0-100),
    "modernityScore": number (0-100),
    "improvements": [string]
  },
  "functionality": {
    "jsFeatures": [string],
    "interactivity": string,
    "eventHandlers": [string],
    "functionality": number (0-100)
  },
  "accessibility": {
    "score": number (0-100),
    "issues": [{"severity": "low"|"medium"|"high", "description": string}],
    "recommendations": [string]
  },
  "compatibility": {
    "browserSupport": [string],
    "potentialIssues": [string],
    "fallbacks": [string]
  },
  "performance": {
    "score": number (0-100),
    "loadTime": string,
    "optimizations": [string],
    "bottlenecks": [string]
  },
  "responsiveness": {
    "mobileReady": boolean,
    "tabletReady": boolean,
    "desktopOptimized": boolean,
    "improvements": [string]
  },
  "overallScore": number (0-100),
  "summary": string,
  "comparisonWithExpected": {
    "matches": boolean,
    "differences": [string],
    "score": number (0-100)
  }
}`;

    const filesContent = files.map((file: any) => 
      `File: ${file.name} (${file.language})
\`\`\`${file.language}
${file.content}
\`\`\`
`
    ).join('\n\n');

    const userPrompt = `
${questionContext ? `Project Context: ${questionContext}` : ''}
${expectedOutput ? `Expected UI Output: ${expectedOutput}` : ''}

Code Files:
${filesContent}

Please analyze these files and generate a comprehensive UI preview analysis following the JSON structure. Be detailed and specific about the visual appearance and functionality.`;

    console.log('Sending UI preview generation request to OpenAI...');

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
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const previewContent = data.choices[0].message.content;

    console.log('Raw UI preview response:', previewContent);

    // Parse the JSON response from AI
    let previewAnalysis;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = previewContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonContent = jsonMatch ? jsonMatch[1] : previewContent;
      previewAnalysis = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Fallback response structure
      previewAnalysis = {
        isUIProject: true,
        visualMockup: {
          description: "UI preview generation failed due to parsing error",
          layout: "Unknown",
          components: [],
          colorScheme: [],
          typography: "Unknown",
          screenshots: null
        },
        layoutAnalysis: {
          structure: "Analysis incomplete",
          positioning: "Unknown",
          responsive: false,
          breakpoints: [],
          gridSystem: "Unknown"
        },
        stylingAssessment: {
          cssQuality: 50,
          designConsistency: 50,
          visualAppeal: 50,
          modernityScore: 50,
          improvements: ["Analysis could not be completed"]
        },
        functionality: {
          jsFeatures: [],
          interactivity: "Unknown",
          eventHandlers: [],
          functionality: 50
        },
        accessibility: {
          score: 50,
          issues: [],
          recommendations: ["Complete analysis required"]
        },
        compatibility: {
          browserSupport: [],
          potentialIssues: ["Analysis incomplete"],
          fallbacks: []
        },
        performance: {
          score: 50,
          loadTime: "Unknown",
          optimizations: [],
          bottlenecks: ["Analysis incomplete"]
        },
        responsiveness: {
          mobileReady: false,
          tabletReady: false,
          desktopOptimized: false,
          improvements: ["Analysis required"]
        },
        overallScore: 50,
        summary: "UI preview generation failed due to response parsing error.",
        comparisonWithExpected: {
          matches: false,
          differences: ["Could not complete analysis"],
          score: 0
        }
      };
    }

    console.log('Processed UI preview analysis:', previewAnalysis);

    return new Response(
      JSON.stringify({
        success: true,
        preview: previewAnalysis,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in generate-ui-preview function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'UI preview generation failed', 
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});