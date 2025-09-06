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
    const { timeRange, includePatterns, analysisDepth } = await req.json();

    // Mock fraud detection data - in production this would analyze real behavioral patterns
    const activities = [
      {
        id: '1',
        userId: 'user1',
        userName: 'John Doe',
        assessmentId: 'assess1',
        assessmentTitle: 'JavaScript Fundamentals',
        activityType: 'keystroke_anomaly',
        suspicionScore: 85,
        timestamp: new Date().toISOString(),
        details: 'Typing pattern significantly different from baseline',
        evidence: { avgKeystroke: 150, baseline: 200, deviation: 25 },
        status: 'pending'
      },
      {
        id: '2',
        userId: 'user2',
        userName: 'Jane Smith',
        assessmentId: 'assess2',
        assessmentTitle: 'React Development',
        activityType: 'copy_paste',
        suspicionScore: 92,
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        details: 'Multiple large text blocks pasted in coding questions',
        evidence: { pasteCount: 8, avgLength: 250 },
        status: 'pending'
      }
    ];

    const patterns = [
      {
        userId: 'user1',
        userName: 'John Doe',
        keystrokePattern: [180, 190, 175, 200, 160],
        typingSpeed: 45,
        pausePattern: [2.5, 3.1, 2.8, 4.2, 1.9],
        mouseMovements: 150,
        scrollBehavior: 85,
        consistencyScore: 72,
        anomalyFlags: ['irregular_typing_speed', 'unusual_pause_pattern']
      }
    ];

    const metrics = {
      totalFlags: 15,
      highRiskActivities: 3,
      falsePositiveRate: 8.5,
      detectionAccuracy: 91.2,
      averageResponseTime: 2.3
    };

    return new Response(JSON.stringify({
      activities,
      patterns,
      metrics,
      metadata: {
        analysisDate: new Date().toISOString(),
        timeRange,
        detectionsInPeriod: activities.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in fraud-detection-enhanced function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});