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
    const { technology, problemDescription, difficulty = 'intermediate' } = await req.json();
    
    if (!technology || !problemDescription) {
      return new Response(
        JSON.stringify({ error: 'Technology and problem description are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Generating assessment context for:', { technology, difficulty });

    const systemPrompt = `You are an expert assessment designer specializing in problem-driven technology assessments. Create a comprehensive assessment context that bridges the problem requirements with technology-specific implementation.

CRITICAL: Respond ONLY with valid JSON. No markdown, no explanations, just the JSON object.

Required format:
{
  "implementationStrategy": {
    "mainApproach": "primary implementation approach",
    "keyComponents": ["component 1", "component 2"],
    "architecturalPatterns": ["pattern 1", "pattern 2"],
    "dataFlow": "how data flows through the system"
  },
  "testScenarios": [
    {
      "scenario": "test scenario description",
      "expectedBehavior": "what should happen",
      "testType": "functional|integration|unit|performance",
      "priority": "high|medium|low",
      "validationCriteria": ["criteria 1", "criteria 2"]
    }
  ],
  "evaluationCriteria": [
    {
      "category": "Code Quality|Architecture|Functionality|Testing",
      "criterion": "specific evaluation point",
      "weight": 0.0-1.0,
      "description": "detailed description",
      "excellentLevel": "what excellent looks like",
      "goodLevel": "what good looks like",
      "needsImprovementLevel": "what needs improvement looks like"
    }
  ],
  "technicalRequirements": {
    "coreFeatures": ["feature 1", "feature 2"],
    "technologySpecificRequirements": ["requirement 1", "requirement 2"],
    "performanceExpectations": ["expectation 1", "expectation 2"],
    "securityConsiderations": ["consideration 1", "consideration 2"]
  },
  "suggestionPrompts": {
    "implementationHints": ["hint 1", "hint 2"],
    "commonPitfalls": ["pitfall 1", "pitfall 2"],
    "bestPractices": ["practice 1", "practice 2"],
    "extensionIdeas": ["idea 1", "idea 2"]
  }
}`;

    const userPrompt = `Technology: ${technology}
Problem: ${problemDescription}
Difficulty Level: ${difficulty}

Create a comprehensive assessment context that:
1. Maps the problem requirements to ${technology}-specific implementation approaches
2. Defines meaningful test scenarios that validate both problem-solving and technology proficiency
3. Establishes evaluation criteria that assess both technical skill and problem understanding
4. Provides technology-specific guidance and expectations
5. Suggests implementation strategies appropriate for ${difficulty} level`;

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
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const assessmentContextText = data.choices[0].message.content;

    let assessmentContext;
    try {
      assessmentContext = JSON.parse(assessmentContextText);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', assessmentContextText);
      // Fallback assessment context
      assessmentContext = {
        implementationStrategy: {
          mainApproach: `Implement solution using ${technology}`,
          keyComponents: ["Main application logic", "User interface", "Data handling"],
          architecturalPatterns: ["Component-based architecture"],
          dataFlow: "User input → Processing → Output display"
        },
        testScenarios: [
          {
            scenario: "Core functionality validation",
            expectedBehavior: "Application should handle basic use cases correctly",
            testType: "functional",
            priority: "high",
            validationCriteria: ["Correct output", "Error handling", "User experience"]
          }
        ],
        evaluationCriteria: [
          {
            category: "Functionality",
            criterion: "Core features implementation",
            weight: 0.4,
            description: "Assess if the main features work as expected",
            excellentLevel: "All features work perfectly with edge cases handled",
            goodLevel: "Main features work with minor issues",
            needsImprovementLevel: "Some features work but significant issues exist"
          },
          {
            category: "Code Quality",
            criterion: "Code structure and readability",
            weight: 0.3,
            description: "Evaluate code organization and clarity",
            excellentLevel: "Clean, well-organized, and highly readable code",
            goodLevel: "Generally well-structured with good practices",
            needsImprovementLevel: "Code works but lacks proper structure"
          }
        ],
        technicalRequirements: {
          coreFeatures: ["Problem solution implementation"],
          technologySpecificRequirements: [`Use ${technology} best practices`],
          performanceExpectations: ["Reasonable performance for the use case"],
          securityConsiderations: ["Basic input validation"]
        },
        suggestionPrompts: {
          implementationHints: [`Focus on ${technology} strengths for this problem`],
          commonPitfalls: ["Overcomplicating the solution", "Not handling edge cases"],
          bestPractices: [`Follow ${technology} conventions`, "Write clean, readable code"],
          extensionIdeas: ["Add additional features", "Improve user experience"]
        }
      };
    }

    console.log('Assessment context generated successfully');

    return new Response(JSON.stringify({ assessmentContext }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-assessment-context function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});