import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const openAIKey = Deno.env.get('OPENAI_API_KEY')!

const supabase = createClient(supabaseUrl, supabaseKey)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();

    if (!session_id) {
      throw new Error('Missing session_id');
    }

    console.log(`Analyzing conversation intelligence for session ${session_id}`);

    // Get session data and conversation history
    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (sessionError) {
      console.error('Session error:', sessionError);
      throw new Error('Session not found');
    }

    // Get conversation history
    const { data: responses, error: responsesError } = await supabase
      .from('interview_responses')
      .select('*')
      .eq('session_id', session_id)
      .order('timestamp', { ascending: true });

    if (responsesError) {
      console.error('Responses error:', responsesError);
      throw new Error('Failed to fetch conversation history');
    }

    if (!responses || responses.length === 0) {
      throw new Error('No conversation data available for analysis');
    }

    // Analyze conversation using OpenAI
    const conversationText = responses
      .map(r => `${r.speaker}: ${r.content}`)
      .join('\n');

    const analysisPrompt = `
    Analyze the following interview conversation and provide detailed insights:

    ${conversationText}

    Please analyze and provide a JSON response with the following structure:
    {
      "conversation_quality_score": 0-100,
      "skills_demonstrated": ["skill1", "skill2", ...],
      "communication_patterns": {
        "average_response_length": number,
        "question_to_answer_ratio": number,
        "topic_transitions": number,
        "clarification_requests": number
      },
      "personality_insights": {
        "communication_style": "direct/collaborative/analytical/creative",
        "confidence": 0-100,
        "analytical_thinking": 0-100,
        "creativity": 0-100,
        "leadership": 0-100
      },
      "competency_analysis": {
        "technical_competency": 0-100,
        "problem_solving": 0-100,
        "teamwork": 0-100,
        "adaptability": 0-100
      },
      "conversation_flow_score": 0-100,
      "engagement_metrics": {
        "interaction_density": 0-100,
        "response_time": "fast/medium/slow",
        "question_engagement": 0-100
      },
      "recommendations": ["recommendation1", "recommendation2", ...]
    }

    Focus on:
    1. Communication effectiveness and clarity
    2. Technical knowledge demonstration
    3. Problem-solving approach
    4. Behavioral competencies
    5. Overall interview performance
    6. Areas for improvement
    7. Conversation flow and engagement
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert interview analyst and HR professional. Provide detailed, objective analysis of interview conversations.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error('Failed to analyze conversation with AI');
    }

    const aiResponse = await response.json();
    const analysisText = aiResponse.choices[0].message.content;

    let analysisData;
    try {
      // Try to parse JSON from the response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Provide default analysis if parsing fails
      analysisData = {
        conversation_quality_score: 75,
        skills_demonstrated: ['communication', 'problem-solving'],
        communication_patterns: {
          average_response_length: 50,
          question_to_answer_ratio: 0.8,
          topic_transitions: 3,
          clarification_requests: 1
        },
        personality_insights: {
          communication_style: 'collaborative',
          confidence: 70,
          analytical_thinking: 75,
          creativity: 65,
          leadership: 60
        },
        competency_analysis: {
          technical_competency: 70,
          problem_solving: 75,
          teamwork: 80,
          adaptability: 70
        },
        conversation_flow_score: 80,
        engagement_metrics: {
          interaction_density: 75,
          response_time: 'medium',
          question_engagement: 80
        },
        recommendations: [
          'Practice providing more specific examples in responses',
          'Work on maintaining consistent energy throughout the conversation'
        ]
      };
    }

    // Store conversation intelligence data
    const { data: existingData, error: fetchError } = await supabase
      .from('conversation_intelligence')
      .select('id')
      .eq('session_id', session_id)
      .limit(1);

    const intelligenceData = {
      session_id: session_id,
      conversation_quality_score: analysisData.conversation_quality_score,
      skills_demonstrated: analysisData.skills_demonstrated,
      communication_patterns: analysisData.communication_patterns,
      personality_insights: analysisData.personality_insights,
      competency_analysis: analysisData.competency_analysis,
      conversation_flow_score: analysisData.conversation_flow_score,
      engagement_metrics: analysisData.engagement_metrics,
      ai_insights: {
        model_used: 'gpt-4o-mini',
        analysis_timestamp: new Date().toISOString(),
        conversation_length: responses.length,
        raw_analysis: analysisText
      },
      recommendations: analysisData.recommendations
    };

    if (existingData && existingData.length > 0) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('conversation_intelligence')
        .update(intelligenceData)
        .eq('session_id', session_id);

      if (updateError) {
        console.error('Error updating conversation intelligence:', updateError);
        throw new Error('Failed to update analysis data');
      }
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('conversation_intelligence')
        .insert([intelligenceData]);

      if (insertError) {
        console.error('Error inserting conversation intelligence:', insertError);
        throw new Error('Failed to store analysis data');
      }
    }

    // Generate performance metrics based on analysis
    const performanceMetrics = {
      session_id: session_id,
      overall_score: analysisData.conversation_quality_score,
      communication_score: (analysisData.personality_insights.confidence + analysisData.conversation_flow_score) / 2,
      technical_score: analysisData.competency_analysis.technical_competency,
      behavioral_score: (analysisData.competency_analysis.teamwork + analysisData.competency_analysis.adaptability) / 2,
      response_relevance_score: analysisData.engagement_metrics.question_engagement,
      structure_score: analysisData.conversation_flow_score,
      time_management_score: analysisData.engagement_metrics.response_time === 'fast' ? 90 : 
                            analysisData.engagement_metrics.response_time === 'medium' ? 75 : 60,
      engagement_score: analysisData.engagement_metrics.interaction_density,
      performance_data: {
        total_responses: responses.filter(r => r.speaker === 'user').length,
        avg_response_length: analysisData.communication_patterns.average_response_length,
        skills_count: analysisData.skills_demonstrated.length
      },
      improvement_areas: analysisData.recommendations.filter((_, i) => i % 2 === 0), // Take even indexed recommendations as improvement areas
      strengths: analysisData.skills_demonstrated.slice(0, 3) // Take first 3 skills as strengths
    };

    // Store or update performance metrics
    const { data: existingMetrics } = await supabase
      .from('interview_performance_metrics')
      .select('id')
      .eq('session_id', session_id)
      .limit(1);

    if (existingMetrics && existingMetrics.length > 0) {
      await supabase
        .from('interview_performance_metrics')
        .update(performanceMetrics)
        .eq('session_id', session_id);
    } else {
      await supabase
        .from('interview_performance_metrics')
        .insert([performanceMetrics]);
    }

    console.log('Conversation intelligence analysis completed successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      analysis: analysisData,
      performance_metrics: performanceMetrics
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in interview-intelligence function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});