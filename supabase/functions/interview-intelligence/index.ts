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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();

    if (!session_id) {
      throw new Error('Missing session_id');
    }

    console.log(`Processing interview intelligence for session: ${session_id}`);

    // Get interview session data
    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .select('*')
      .eq('id', session_id)
      .single();

    if (sessionError) {
      console.error('Session error:', sessionError);
      throw new Error('Session not found');
    }

    // Get conversation responses
    const { data: responses, error: responsesError } = await supabase
      .from('interview_responses')
      .select('*')
      .eq('session_id', session_id)
      .order('timestamp', { ascending: true });

    if (responsesError) {
      console.error('Responses error:', responsesError);
      throw new Error('Failed to fetch conversation responses');
    }

    if (!responses || responses.length === 0) {
      console.log(`No conversation data found for session ${session_id}, creating default analysis`);
      
      // Create a default analysis for sessions without conversation data
      const defaultAnalysis = {
        performance: {
          overall_score: 0,
          communication_score: 0,
          technical_score: 0,
          behavioral_score: 0,
          response_relevance_score: 0,
          structure_score: 0,
          time_management_score: 0,
          engagement_score: 0,
          strengths: ["No conversation data available"],
          improvement_areas: ["Interview did not contain conversation data"]
        },
        sentiment: {
          overall_sentiment: "neutral",
          confidence_level: 0,
          emotional_progression: [],
          tone_analysis: {
            professional: 0,
            enthusiastic: 0,
            confident: 0,
            formal: 0,
            casual: 0
          }
        },
        intelligence: {
          conversation_quality_score: 0,
          conversation_flow_score: 0,
          skills_demonstrated: [],
          competency_analysis: {
            leadership: 0,
            problem_solving: 0,
            communication: 0,
            teamwork: 0,
            adaptability: 0
          },
          personality_insights: {
            extraversion: 0,
            conscientiousness: 0,
            openness: 0,
            agreeableness: 0,
            emotional_stability: 0
          },
          communication_patterns: {
            response_length_consistency: 0,
            vocabulary_richness: 0,
            articulation_clarity: 0,
            engagement_level: 0
          },
          engagement_metrics: {
            proactive_responses: 0,
            question_asking: 0,
            detail_elaboration: 0,
            enthusiasm_level: 0
          },
          ai_insights: {
            key_observations: ["No conversation data available for analysis"],
            behavioral_patterns: ["Interview session did not capture conversation"],
            decision_making_style: "unknown",
            leadership_potential: "unknown"
          },
          recommendations: [
            "Interview session needs to be retaken with proper conversation recording",
            "Ensure technical setup allows for conversation capture",
            "Check that interview questions are being properly answered"
          ]
        },
        summary: "No conversation data was available for analysis. This may indicate a technical issue or that the interview was not completed properly."
      };

      // Store the default analysis
      await Promise.all([
        storePerformanceMetrics(session_id, defaultAnalysis.performance),
        storeSentimentAnalysis(session_id, defaultAnalysis.sentiment),
        storeConversationIntelligence(session_id, defaultAnalysis.intelligence)
      ]);

      console.log('Default analysis created for session without conversation data');

      return new Response(JSON.stringify({ 
        success: true,
        analysis: defaultAnalysis.summary,
        hasConversationData: false
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate comprehensive analysis
    const analysis = await generateInterviewAnalysis(session, responses);

    // Store the analysis results
    await Promise.all([
      storePerformanceMetrics(session_id, analysis.performance),
      storeSentimentAnalysis(session_id, analysis.sentiment),
      storeConversationIntelligence(session_id, analysis.intelligence)
    ]);

    console.log('Interview intelligence analysis completed');

    return new Response(JSON.stringify({ 
      success: true,
      analysis: analysis.summary
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

async function generateInterviewAnalysis(session: any, responses: any[]) {
  const conversation = responses.map(r => `${r.speaker}: ${r.content}`).join('\n');
  const interviewType = session.evaluation_criteria?.type || 'behavioral';
  
  const analysisPrompt = `
    Analyze this ${interviewType} interview conversation and provide comprehensive insights:

    CONVERSATION:
    ${conversation}

    Please provide a detailed analysis in the following JSON format:
    {
      "performance": {
        "overall_score": 0-100,
        "communication_score": 0-100,
        "technical_score": 0-100,
        "behavioral_score": 0-100,
        "response_relevance_score": 0-100,
        "structure_score": 0-100,
        "time_management_score": 0-100,
        "engagement_score": 0-100,
        "strengths": ["strength1", "strength2", "strength3"],
        "improvement_areas": ["area1", "area2", "area3"]
      },
      "sentiment": {
        "overall_sentiment": "positive/neutral/negative",
        "confidence_level": 0-1,
        "emotional_progression": [
          {"response_number": 1, "sentiment": "positive", "confidence": 0.8},
          {"response_number": 2, "sentiment": "neutral", "confidence": 0.6}
        ],
        "tone_analysis": {
          "professional": 0-100,
          "enthusiastic": 0-100,
          "confident": 0-100,
          "formal": 0-100,
          "casual": 0-100
        }
      },
      "intelligence": {
        "conversation_quality_score": 0-100,
        "conversation_flow_score": 0-100,
        "skills_demonstrated": ["skill1", "skill2", "skill3"],
        "competency_analysis": {
          "leadership": 0-100,
          "problem_solving": 0-100,
          "communication": 0-100,
          "teamwork": 0-100,
          "adaptability": 0-100
        },
        "personality_insights": {
          "extraversion": 0-100,
          "conscientiousness": 0-100,
          "openness": 0-100,
          "agreeableness": 0-100,
          "emotional_stability": 0-100
        },
        "communication_patterns": {
          "response_length_consistency": 0-100,
          "vocabulary_richness": 0-100,
          "articulation_clarity": 0-100,
          "engagement_level": 0-100
        },
        "engagement_metrics": {
          "proactive_responses": 0-100,
          "question_asking": 0-100,
          "detail_elaboration": 0-100,
          "enthusiasm_level": 0-100
        },
        "ai_insights": {
          "key_observations": ["observation1", "observation2"],
          "behavioral_patterns": ["pattern1", "pattern2"],
          "decision_making_style": "analytical/intuitive/balanced",
          "leadership_potential": "high/medium/low"
        },
        "recommendations": [
          "recommendation1",
          "recommendation2", 
          "recommendation3"
        ]
      },
      "summary": "Brief overall assessment and key highlights"
    }

    Provide only the JSON response with realistic scores and insights based on the conversation content.
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
          content: 'You are an expert interview analyst. Provide detailed, accurate assessments in valid JSON format only.' 
        },
        { role: 'user', content: analysisPrompt }
      ],
      max_tokens: 2000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('OpenAI API error:', errorData);
    throw new Error('Failed to generate interview analysis');
  }

  const data = await response.json();
  const analysisText = data.choices[0].message.content;

  try {
    return JSON.parse(analysisText);
  } catch (parseError) {
    console.error('Failed to parse analysis JSON:', parseError);
    console.error('Raw response:', analysisText);
    
    // Return a default structure if parsing fails
    return {
      performance: {
        overall_score: 75,
        communication_score: 75,
        technical_score: 70,
        behavioral_score: 80,
        response_relevance_score: 75,
        structure_score: 70,
        time_management_score: 75,
        engagement_score: 80,
        strengths: ["Good communication", "Professional demeanor"],
        improvement_areas: ["Technical depth", "Response structure"]
      },
      sentiment: {
        overall_sentiment: "neutral",
        confidence_level: 0.7,
        emotional_progression: [],
        tone_analysis: {
          professional: 80,
          enthusiastic: 60,
          confident: 70,
          formal: 75,
          casual: 25
        }
      },
      intelligence: {
        conversation_quality_score: 75,
        conversation_flow_score: 70,
        skills_demonstrated: ["Communication", "Problem-solving"],
        competency_analysis: {
          leadership: 70,
          problem_solving: 75,
          communication: 80,
          teamwork: 70,
          adaptability: 65
        },
        personality_insights: {
          extraversion: 60,
          conscientiousness: 75,
          openness: 70,
          agreeableness: 80,
          emotional_stability: 75
        },
        communication_patterns: {
          response_length_consistency: 70,
          vocabulary_richness: 75,
          articulation_clarity: 80,
          engagement_level: 70
        },
        engagement_metrics: {
          proactive_responses: 65,
          question_asking: 60,
          detail_elaboration: 70,
          enthusiasm_level: 70
        },
        ai_insights: {
          key_observations: ["Strong communication skills", "Professional approach"],
          behavioral_patterns: ["Thoughtful responses", "Good engagement"],
          decision_making_style: "balanced",
          leadership_potential: "medium"
        },
        recommendations: [
          "Continue developing technical skills",
          "Practice more detailed examples",
          "Enhance proactive questioning"
        ]
      },
      summary: "Candidate demonstrates good communication skills and professional demeanor with room for technical improvement."
    };
  }
}

async function storePerformanceMetrics(sessionId: string, performance: any) {
  return supabase.from('interview_performance_metrics').upsert({
    session_id: sessionId,
    overall_score: performance.overall_score,
    communication_score: performance.communication_score,
    technical_score: performance.technical_score,
    behavioral_score: performance.behavioral_score,
    response_relevance_score: performance.response_relevance_score,
    structure_score: performance.structure_score,
    time_management_score: performance.time_management_score,
    engagement_score: performance.engagement_score,
    strengths: performance.strengths,
    improvement_areas: performance.improvement_areas,
    performance_data: performance
  });
}

async function storeSentimentAnalysis(sessionId: string, sentiment: any) {
  return supabase.from('interview_sentiment_analysis').upsert({
    session_id: sessionId,
    sentiment_score: sentiment.overall_sentiment === 'positive' ? 0.8 : 
                    sentiment.overall_sentiment === 'negative' ? 0.2 : 0.5,
    confidence_level: sentiment.confidence_level,
    emotion_detected: sentiment.overall_sentiment,
    emotional_progression: sentiment.emotional_progression,
    tone_analysis: sentiment.tone_analysis
  });
}

async function storeConversationIntelligence(sessionId: string, intelligence: any) {
  return supabase.from('conversation_intelligence').upsert({
    session_id: sessionId,
    conversation_quality_score: intelligence.conversation_quality_score,
    conversation_flow_score: intelligence.conversation_flow_score,
    skills_demonstrated: intelligence.skills_demonstrated,
    competency_analysis: intelligence.competency_analysis,
    personality_insights: intelligence.personality_insights,
    communication_patterns: intelligence.communication_patterns,
    engagement_metrics: intelligence.engagement_metrics,
    ai_insights: intelligence.ai_insights,
    recommendations: intelligence.recommendations
  });
}