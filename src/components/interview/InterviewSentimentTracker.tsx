import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Heart, Brain, Zap, Smile, Frown, Meh, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SentimentData {
  sentimentScore: number;
  emotionDetected: string;
  confidenceLevel: number;
  emotionalProgression: Array<{
    timestamp: string;
    sentiment: number;
    emotion: string;
  }>;
  toneAnalysis: {
    professional: number;
    casual: number;
    formal: number;
    enthusiastic: number;
  };
}

interface InterviewSentimentTrackerProps {
  sessionId: string;
  isActive?: boolean;
  onSentimentUpdate?: (sentiment: SentimentData) => void;
}

const InterviewSentimentTracker: React.FC<InterviewSentimentTrackerProps> = ({
  sessionId,
  isActive = false,
  onSentimentUpdate
}) => {
  const [sentimentData, setSentimentData] = useState<SentimentData>({
    sentimentScore: 0,
    emotionDetected: 'neutral',
    confidenceLevel: 0,
    emotionalProgression: [],
    toneAnalysis: {
      professional: 0,
      casual: 0,
      formal: 0,
      enthusiastic: 0
    }
  });

  const parseDbSentimentData = (dbData: any): SentimentData => {
    return {
      sentimentScore: dbData?.sentiment_score || 0,
      emotionDetected: dbData?.emotion_detected || 'neutral',
      confidenceLevel: dbData?.confidence_level || 0,
      emotionalProgression: Array.isArray(dbData?.emotional_progression) ? 
        dbData.emotional_progression.filter((item: any) => 
          item && typeof item === 'object' && 
          'timestamp' in item && 
          'sentiment' in item && 
          'emotion' in item
        ) : [],
      toneAnalysis: (dbData?.tone_analysis && typeof dbData.tone_analysis === 'object') ? {
        professional: dbData.tone_analysis.professional || 0,
        casual: dbData.tone_analysis.casual || 0,
        formal: dbData.tone_analysis.formal || 0,
        enthusiastic: dbData.tone_analysis.enthusiastic || 0
      } : {
        professional: 0,
        casual: 0,
        formal: 0,
        enthusiastic: 0
      }
    };
  };

  useEffect(() => {
    if (!sessionId) return;

    // Fetch initial sentiment data
    const fetchSentimentData = async () => {
      const { data, error } = await supabase
        .from('interview_sentiment_analysis')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const parsedData = parseDbSentimentData(data[0]);
        setSentimentData(parsedData);
      }
    };

    fetchSentimentData();

    // Subscribe to real-time sentiment updates
    const channel = supabase
      .channel('sentiment-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interview_sentiment_analysis',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            const updatedSentiment = parseDbSentimentData(payload.new);
            setSentimentData(updatedSentiment);
            
            if (onSentimentUpdate) {
              onSentimentUpdate(updatedSentiment);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, onSentimentUpdate]);

  const getSentimentIcon = (emotion: string) => {
    switch (emotion.toLowerCase()) {
      case 'positive':
      case 'confident':
      case 'enthusiastic':
        return <Smile className="h-4 w-4 text-success" />;
      case 'negative':
      case 'nervous':
      case 'anxious':
        return <Frown className="h-4 w-4 text-destructive" />;
      case 'excited':
      case 'energetic':
        return <Zap className="h-4 w-4 text-warning" />;
      default:
        return <Meh className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSentimentColor = (score: number) => {
    if (score > 0.3) return 'text-success';
    if (score < -0.3) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const getSentimentBadgeVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score > 0.3) return 'default';
    if (score < -0.3) return 'destructive';
    return 'secondary';
  };

  const formatSentimentScore = (score: number) => {
    if (score > 0.3) return 'Positive';
    if (score < -0.3) return 'Negative';
    return 'Neutral';
  };

  const progressValue = ((sentimentData.sentimentScore + 1) / 2) * 100; // Convert -1 to 1 scale to 0-100

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          Sentiment Analysis
        </CardTitle>
        {isActive && (
          <Badge variant="secondary" className="animate-pulse">
            <div className="w-2 h-2 bg-success rounded-full mr-2" />
            Live
          </Badge>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Current Sentiment */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current Sentiment</span>
            <div className="flex items-center gap-2">
              {getSentimentIcon(sentimentData.emotionDetected)}
              <span className={`text-sm font-bold ${getSentimentColor(sentimentData.sentimentScore)}`}>
                {formatSentimentScore(sentimentData.sentimentScore)}
              </span>
            </div>
          </div>
          <Progress value={progressValue} className="h-3" />
          <div className="flex items-center justify-between">
            <Badge variant={getSentimentBadgeVariant(sentimentData.sentimentScore)}>
              {sentimentData.emotionDetected}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Confidence: {(sentimentData.confidenceLevel * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Tone Analysis */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4 text-muted-foreground" />
            Communication Tone
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Professional</span>
                <span>{(sentimentData.toneAnalysis.professional * 100).toFixed(0)}%</span>
              </div>
              <Progress value={sentimentData.toneAnalysis.professional * 100} className="h-1" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Enthusiastic</span>
                <span>{(sentimentData.toneAnalysis.enthusiastic * 100).toFixed(0)}%</span>
              </div>
              <Progress value={sentimentData.toneAnalysis.enthusiastic * 100} className="h-1" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Formal</span>
                <span>{(sentimentData.toneAnalysis.formal * 100).toFixed(0)}%</span>
              </div>
              <Progress value={sentimentData.toneAnalysis.formal * 100} className="h-1" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Casual</span>
                <span>{(sentimentData.toneAnalysis.casual * 100).toFixed(0)}%</span>
              </div>
              <Progress value={sentimentData.toneAnalysis.casual * 100} className="h-1" />
            </div>
          </div>
        </div>

        {/* Emotional Progression Chart */}
        {sentimentData.emotionalProgression.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Emotional Progression
            </h4>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sentimentData.emotionalProgression}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="timestamp" 
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis 
                    domain={[-1, 1]} 
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sentiment" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs text-muted-foreground text-center">
              Real-time sentiment tracking throughout the interview
            </div>
          </div>
        )}

        {/* Insights */}
        {sentimentData.sentimentScore < -0.5 && (
          <div className="p-3 bg-warning/10 rounded-lg border border-warning/20">
            <p className="text-sm text-warning">
              💡 Your tone seems a bit negative. Try to speak more positively and show enthusiasm for the role.
            </p>
          </div>
        )}
        
        {sentimentData.toneAnalysis.professional < 0.3 && (
          <div className="p-3 bg-info/10 rounded-lg border border-info/20">
            <p className="text-sm text-info">
              💼 Consider maintaining a more professional tone to make a stronger impression.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InterviewSentimentTracker;