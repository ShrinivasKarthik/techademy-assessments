import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, analysisDepth, includeCareerPaths } = await req.json();

    // Mock AI-generated learning paths
    const skills = [
      {
        id: '1',
        name: 'JavaScript',
        category: 'Programming',
        proficiencyLevel: 75,
        targetLevel: 90,
        gapSize: 'small',
        priority: 'high'
      },
      {
        id: '2',
        name: 'React',
        category: 'Frontend',
        proficiencyLevel: 60,
        targetLevel: 85,
        gapSize: 'medium',
        priority: 'high'
      }
    ];

    const learningPaths = [
      {
        id: '1',
        userId: userId || 'current',
        title: 'Full-Stack JavaScript Mastery',
        description: 'Complete path to become proficient in modern JavaScript development',
        estimatedDuration: 120,
        difficulty: 'intermediate',
        skills: ['JavaScript', 'React', 'Node.js'],
        modules: [
          {
            id: '1',
            title: 'Advanced JavaScript Concepts',
            type: 'theory',
            duration: 20,
            prerequisites: [],
            skills: ['JavaScript'],
            completed: false
          }
        ],
        progress: 15,
        aiConfidence: 92
      }
    ];

    const recommendations = [
      {
        type: 'skill_gap',
        title: 'Focus on React Proficiency',
        description: 'Your React skills need improvement to reach your target level',
        priority: 1,
        estimatedBenefit: '25% improvement in frontend development speed',
        actionItems: [
          'Complete advanced React hooks tutorial',
          'Build 3 practice projects using React',
          'Study React performance optimization'
        ]
      }
    ];

    return new Response(JSON.stringify({
      skills,
      learningPaths,
      recommendations,
      metadata: {
        analysisDate: new Date().toISOString(),
        confidence: 0.89,
        personalizationLevel: analysisDepth || 'standard'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in learning-path-generator function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});