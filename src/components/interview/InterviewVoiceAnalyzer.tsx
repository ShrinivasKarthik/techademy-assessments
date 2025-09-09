import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Mic, Volume2, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStableRealtime } from '@/hooks/useStableRealtime';

interface VoiceMetrics {
  speechRate: number;
  pauseFrequency: number;
  volumeConsistency: number;
  clarityScore: number;
  confidenceScore: number;
  fillerWordCount: number;
  voiceQualityScore: number;
}

interface InterviewVoiceAnalyzerProps {
  sessionId: string;
  isActive?: boolean;
  onMetricsUpdate?: (metrics: VoiceMetrics) => void;
}

const InterviewVoiceAnalyzer: React.FC<InterviewVoiceAnalyzerProps> = ({
  sessionId,
  isActive = false,
  onMetricsUpdate
}) => {
  const [voiceMetrics, setVoiceMetrics] = useState<VoiceMetrics>({
    speechRate: 0,
    pauseFrequency: 0,
    volumeConsistency: 0,
    clarityScore: 0,
    confidenceScore: 0,
    fillerWordCount: 0,
    voiceQualityScore: 0
  });

  const [realTimeData, setRealTimeData] = useState({
    currentVolume: 0,
    currentPitch: 0,
    isUserSpeaking: false
  });

  useEffect(() => {
    if (!sessionId) return;

  // Real-time subscription for voice analysis updates  
  useStableRealtime({
    table: 'interview_voice_metrics',
    filter: `session_id=eq.${sessionId}`,
    onInsert: (payload) => {
      const newMetrics = payload.new;
      setVoiceMetrics({
        speechRate: newMetrics.speech_rate || 0,
        pauseFrequency: newMetrics.pause_frequency || 0,
        volumeConsistency: newMetrics.volume_consistency || 0,
        clarityScore: newMetrics.clarity_score || 0,
        confidenceScore: newMetrics.confidence_score || 0,
        fillerWordCount: newMetrics.filler_word_count || 0,
        voiceQualityScore: newMetrics.voice_quality_score || 0
      });
      
      if (onMetricsUpdate) {
        onMetricsUpdate({
          speechRate: newMetrics.speech_rate || 0,
          pauseFrequency: newMetrics.pause_frequency || 0,
          volumeConsistency: newMetrics.volume_consistency || 0,
          clarityScore: newMetrics.clarity_score || 0,
          confidenceScore: newMetrics.confidence_score || 0,
          fillerWordCount: newMetrics.filler_word_count || 0,
          voiceQualityScore: newMetrics.voice_quality_score || 0
        });
      }
    }
  });
  }, [sessionId, onMetricsUpdate]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  const formatSpeechRate = (rate: number) => {
    return `${rate.toFixed(0)} WPM`;
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Mic className="h-5 w-5 text-primary" />
          Voice Analysis
        </CardTitle>
        {isActive && (
          <Badge variant="secondary" className="animate-pulse">
            <div className="w-2 h-2 bg-success rounded-full mr-2" />
            Live
          </Badge>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Overall Voice Quality */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Voice Quality</span>
            <span className={`text-sm font-bold ${getScoreColor(voiceMetrics.voiceQualityScore)}`}>
              {voiceMetrics.voiceQualityScore.toFixed(0)}%
            </span>
          </div>
          <Progress value={voiceMetrics.voiceQualityScore} className="h-2" />
          <Badge variant="outline" className="text-xs">
            {getScoreBadge(voiceMetrics.voiceQualityScore)}
          </Badge>
        </div>

        {/* Voice Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Speech Rate */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Speech Rate</span>
            </div>
            <div className="text-2xl font-bold text-primary">
              {formatSpeechRate(voiceMetrics.speechRate)}
            </div>
            <Progress value={Math.min((voiceMetrics.speechRate / 200) * 100, 100)} className="h-1" />
          </div>

          {/* Clarity Score */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Clarity</span>
            </div>
            <div className="text-2xl font-bold text-primary">
              {voiceMetrics.clarityScore.toFixed(0)}%
            </div>
            <Progress value={voiceMetrics.clarityScore} className="h-1" />
          </div>

          {/* Confidence Score */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Confidence</span>
            </div>
            <div className="text-2xl font-bold text-primary">
              {voiceMetrics.confidenceScore.toFixed(0)}%
            </div>
            <Progress value={voiceMetrics.confidenceScore} className="h-1" />
          </div>

          {/* Volume Consistency */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Volume Consistency</span>
            </div>
            <div className="text-2xl font-bold text-primary">
              {voiceMetrics.volumeConsistency.toFixed(0)}%
            </div>
            <Progress value={voiceMetrics.volumeConsistency} className="h-1" />
          </div>
        </div>

        {/* Filler Words Alert */}
        {voiceMetrics.fillerWordCount > 5 && (
          <div className="flex items-center gap-2 p-3 bg-warning/10 rounded-lg border border-warning/20">
            <AlertCircle className="h-4 w-4 text-warning" />
            <span className="text-sm text-warning">
              High filler word usage detected ({voiceMetrics.fillerWordCount} times). 
              Try to pause instead of using "um", "uh", or "like".
            </span>
          </div>
        )}

        {/* Real-time Indicators */}
        {isActive && (
          <div className="space-y-2 pt-4 border-t">
            <h4 className="text-sm font-medium text-muted-foreground">Real-time Feedback</h4>
            <div className="flex items-center justify-between">
              <span className="text-sm">Speaking Status</span>
              <Badge variant={realTimeData.isUserSpeaking ? "default" : "secondary"}>
                {realTimeData.isUserSpeaking ? "Speaking" : "Silent"}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InterviewVoiceAnalyzer;