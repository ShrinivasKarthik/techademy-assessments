import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  MessageCircle, 
  Users, 
  Target, 
  TrendingUp,
  Star,
  AlertCircle,
  Award,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface InterviewAnalyticsDisplayProps {
  instanceId: string;
}

interface PerformanceMetrics {
  overall_score: number;
  communication_score: number;
  technical_score: number;
  behavioral_score: number;
  response_relevance_score: number;
  structure_score: number;
  time_management_score: number;
  engagement_score: number;
  strengths: string[];
  improvement_areas: string[];
}

interface ConversationIntelligence {
  conversation_quality_score: number;
  conversation_flow_score: number;
  skills_demonstrated: string[];
  competency_analysis: Record<string, number>;
  personality_insights: Record<string, number>;
  communication_patterns: Record<string, number>;
  engagement_metrics: Record<string, number>;
  ai_insights: {
    key_observations: string[];
    behavioral_patterns: string[];
    decision_making_style: string;
    leadership_potential: string;
  };
  recommendations: string[];
}

interface SentimentAnalysis {
  sentiment_score: number;
  emotion_detected: string;
  confidence_level: number;
  emotional_evolution: any[];
  tone_analysis: Record<string, number>;
}

const InterviewAnalyticsDisplay: React.FC<InterviewAnalyticsDisplayProps> = ({ instanceId }) => {
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [conversationIntelligence, setConversationIntelligence] = useState<ConversationIntelligence | null>(null);
  const [sentimentAnalysis, setSentimentAnalysis] = useState<SentimentAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        // First, get the interview session ID
        const { data: sessionData } = await supabase
          .from('interview_sessions')
          .select('id')
          .eq('instance_id', instanceId)
          .limit(1);

        if (sessionData && sessionData.length > 0) {
          const currentSessionId = sessionData[0].id;
          setSessionId(currentSessionId);

          // Fetch performance metrics
          const { data: performanceData } = await supabase
            .from('interview_performance_metrics')
            .select('*')
            .eq('session_id', currentSessionId)
            .order('created_at', { ascending: false })
            .limit(1);

          if (performanceData && performanceData.length > 0) {
            const data = performanceData[0];
            setPerformanceMetrics({
              overall_score: data.overall_score || 0,
              communication_score: data.communication_score || 0,
              technical_score: data.technical_score || 0,
              behavioral_score: data.behavioral_score || 0,
              response_relevance_score: data.response_relevance_score || 0,
              structure_score: data.structure_score || 0,
              time_management_score: data.time_management_score || 0,
              engagement_score: data.engagement_score || 0,
              strengths: Array.isArray(data.strengths) ? 
                data.strengths.filter(item => typeof item === 'string') : [],
              improvement_areas: Array.isArray(data.improvement_areas) ? 
                data.improvement_areas.filter(item => typeof item === 'string') : []
            });
          }

          // Fetch conversation intelligence
          const { data: intelligenceData } = await supabase
            .from('conversation_intelligence')
            .select('*')
            .eq('session_id', currentSessionId)
            .order('created_at', { ascending: false })
            .limit(1);

          if (intelligenceData && intelligenceData.length > 0) {
            const data = intelligenceData[0];
            const parseJsonObject = (obj: any): Record<string, number> => {
              if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
                const result: Record<string, number> = {};
                Object.entries(obj).forEach(([key, value]) => {
                  if (typeof value === 'number') {
                    result[key] = value;
                  }
                });
                return result;
              }
              return {};
            };

            const parseAiInsights = (obj: any) => {
              if (typeof obj === 'object' && obj !== null) {
                return {
                  key_observations: Array.isArray(obj.key_observations) ? 
                    obj.key_observations.filter((item: any) => typeof item === 'string') : [],
                  behavioral_patterns: Array.isArray(obj.behavioral_patterns) ? 
                    obj.behavioral_patterns.filter((item: any) => typeof item === 'string') : [],
                  decision_making_style: typeof obj.decision_making_style === 'string' ? obj.decision_making_style : '',
                  leadership_potential: typeof obj.leadership_potential === 'string' ? obj.leadership_potential : ''
                };
              }
              return {
                key_observations: [],
                behavioral_patterns: [],
                decision_making_style: '',
                leadership_potential: ''
              };
            };

            setConversationIntelligence({
              conversation_quality_score: data.conversation_quality_score || 0,
              conversation_flow_score: data.conversation_flow_score || 0,
              skills_demonstrated: Array.isArray(data.skills_demonstrated) ? 
                data.skills_demonstrated.filter(item => typeof item === 'string') : [],
              competency_analysis: parseJsonObject(data.competency_analysis),
              personality_insights: parseJsonObject(data.personality_insights),
              communication_patterns: parseJsonObject(data.communication_patterns),
              engagement_metrics: parseJsonObject(data.engagement_metrics),
              ai_insights: parseAiInsights(data.ai_insights),
              recommendations: Array.isArray(data.recommendations) ? 
                data.recommendations.filter(item => typeof item === 'string') : []
            });
          }

          // Fetch sentiment analysis
          const { data: sentimentData } = await supabase
            .from('interview_sentiment_analysis')
            .select('*')
            .eq('session_id', currentSessionId)
            .order('created_at', { ascending: false })
            .limit(1);

          if (sentimentData && sentimentData.length > 0) {
            const data = sentimentData[0];
            setSentimentAnalysis({
              sentiment_score: data.sentiment_score || 0,
              emotion_detected: data.emotion_detected || '',
              confidence_level: data.confidence_level || 0,
              emotional_evolution: Array.isArray(data.emotional_progression) ? data.emotional_progression : [],
              tone_analysis: (typeof data.tone_analysis === 'object' && data.tone_analysis !== null && !Array.isArray(data.tone_analysis)) ? 
                Object.fromEntries(
                  Object.entries(data.tone_analysis).filter(([_, value]) => typeof value === 'number')
                ) as Record<string, number> : {}
            });
          }
        }
      } catch (error) {
        console.error('Error fetching interview analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [instanceId]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-primary';
    if (score >= 40) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 85) return { variant: 'default' as const, text: 'Excellent' };
    if (score >= 70) return { variant: 'secondary' as const, text: 'Good' };
    if (score >= 55) return { variant: 'outline' as const, text: 'Average' };
    return { variant: 'destructive' as const, text: 'Needs Improvement' };
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!performanceMetrics && !conversationIntelligence && !sentimentAnalysis) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <div className="text-lg font-medium">No Interview Analytics Available</div>
        <div className="text-sm">Interview analysis has not been completed yet.</div>
      </div>
    );
  }

  const chartData = performanceMetrics ? [
    { name: 'Communication', score: performanceMetrics.communication_score || 0 },
    { name: 'Technical', score: performanceMetrics.technical_score || 0 },
    { name: 'Behavioral', score: performanceMetrics.behavioral_score || 0 },
    { name: 'Structure', score: performanceMetrics.structure_score || 0 },
    { name: 'Engagement', score: performanceMetrics.engagement_score || 0 }
  ] : [];

  return (
    <div className="space-y-6">
      {/* Overall Performance Summary */}
      {performanceMetrics && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Interview Performance Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className={`text-3xl font-bold ${getScoreColor(performanceMetrics.overall_score || 0)}`}>
                  {Math.round(performanceMetrics.overall_score || 0)}%
                </div>
                <div className="text-sm text-muted-foreground">Overall Score</div>
                <Badge {...getScoreBadge(performanceMetrics.overall_score || 0)} className="mt-2">
                  {getScoreBadge(performanceMetrics.overall_score || 0).text}
                </Badge>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {Math.round(performanceMetrics.communication_score || 0)}%
                </div>
                <div className="text-sm text-muted-foreground">Communication</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {Math.round(performanceMetrics.technical_score || 0)}%
                </div>
                <div className="text-sm text-muted-foreground">Technical</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {Math.round(performanceMetrics.behavioral_score || 0)}%
                </div>
                <div className="text-sm text-muted-foreground">Behavioral</div>
              </div>
            </div>
            
            <div className="mt-6">
              <Progress 
                value={performanceMetrics.overall_score || 0} 
                className="h-3"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          {performanceMetrics && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Performance Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                        <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px'
                          }}
                        />
                        <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Response Relevance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-primary">
                      {Math.round(performanceMetrics.response_relevance_score || 0)}%
                    </div>
                    <Progress value={performanceMetrics.response_relevance_score || 0} className="h-2 mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Time Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-primary">
                      {Math.round(performanceMetrics.time_management_score || 0)}%
                    </div>
                    <Progress value={performanceMetrics.time_management_score || 0} className="h-2 mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Structure</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-primary">
                      {Math.round(performanceMetrics.structure_score || 0)}%
                    </div>
                    <Progress value={performanceMetrics.structure_score || 0} className="h-2 mt-2" />
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="intelligence" className="space-y-4">
          {conversationIntelligence && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="w-5 h-5" />
                      Conversation Quality
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Quality Score</span>
                          <span>{Math.round(conversationIntelligence.conversation_quality_score || 0)}%</span>
                        </div>
                        <Progress value={conversationIntelligence.conversation_quality_score || 0} />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Flow Score</span>
                          <span>{Math.round(conversationIntelligence.conversation_flow_score || 0)}%</span>
                        </div>
                        <Progress value={conversationIntelligence.conversation_flow_score || 0} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Skills Demonstrated
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {(conversationIntelligence.skills_demonstrated || []).map((skill, index) => (
                        <Badge key={index} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {conversationIntelligence.competency_analysis && (
                <Card>
                  <CardHeader>
                    <CardTitle>Competency Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {Object.entries(conversationIntelligence.competency_analysis).map(([key, value]) => (
                        <div key={key}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="capitalize">{key.replace('_', ' ')}</span>
                            <span>{Math.round(Number(value) || 0)}%</span>
                          </div>
                          <Progress value={Number(value) || 0} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-success">
                  <Star className="w-5 w-5" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(performanceMetrics?.strengths || []).map((strength, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-success rounded-full" />
                      <span className="text-sm">{strength}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-warning">
                  <TrendingUp className="w-5 h-5" />
                  Areas for Improvement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(performanceMetrics?.improvement_areas || []).map((area, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-warning rounded-full" />
                      <span className="text-sm">{area}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {conversationIntelligence?.ai_insights && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Key Observations</h4>
                  <ul className="space-y-1">
                    {conversationIntelligence.ai_insights.key_observations?.map((observation, index) => (
                      <li key={index} className="text-sm text-muted-foreground">
                        • {observation}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Behavioral Patterns</h4>
                  <div className="flex flex-wrap gap-2">
                    {conversationIntelligence.ai_insights.behavioral_patterns?.map((pattern, index) => (
                      <Badge key={index} variant="outline">{pattern}</Badge>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium">Decision Making:</span>
                    <span className="ml-2 text-sm">{conversationIntelligence.ai_insights.decision_making_style}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Leadership Potential:</span>
                    <span className="ml-2 text-sm">{conversationIntelligence.ai_insights.leadership_potential}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recommendations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                AI-Powered Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {(conversationIntelligence?.recommendations || []).map((recommendation, index) => (
                  <li key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{recommendation}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InterviewAnalyticsDisplay;