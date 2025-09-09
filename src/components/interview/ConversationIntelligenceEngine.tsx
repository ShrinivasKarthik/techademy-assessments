import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  MessageSquare, 
  Lightbulb, 
  TrendingUp, 
  User, 
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ConversationIntelligenceData {
  conversationQualityScore: number;
  skillsDemonstrated: string[];
  communicationPatterns: {
    averageResponseLength: number;
    questionToAnswerRatio: number;
    topicTransitions: number;
    clarificationRequests: number;
  };
  personalityInsights: {
    communicationStyle: string;
    confidence: number;
    analyticalThinking: number;
    creativity: number;
    leadership: number;
  };
  competencyAnalysis: {
    technicalCompetency: number;
    problemSolving: number;
    teamwork: number;
    adaptability: number;
  };
  conversationFlowScore: number;
  engagementMetrics: {
    interactionDensity: number;
    responseTime: number;
    questionEngagement: number;
  };
  aiInsights: any;
  recommendations: string[];
}

interface ConversationIntelligenceEngineProps {
  sessionId: string;
  onInsightsUpdate?: (insights: ConversationIntelligenceData) => void;
}

const ConversationIntelligenceEngine: React.FC<ConversationIntelligenceEngineProps> = ({
  sessionId,
  onInsightsUpdate
}) => {
  const [intelligenceData, setIntelligenceData] = useState<ConversationIntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const parseDbData = (dbData: any): ConversationIntelligenceData => {
    return {
      conversationQualityScore: dbData?.conversation_quality_score || 0,
      skillsDemonstrated: Array.isArray(dbData?.skills_demonstrated) 
        ? dbData.skills_demonstrated.filter((item: any) => typeof item === 'string') 
        : [],
      communicationPatterns: dbData?.communication_patterns && typeof dbData.communication_patterns === 'object' 
        ? {
            averageResponseLength: dbData.communication_patterns.averageResponseLength || 0,
            questionToAnswerRatio: dbData.communication_patterns.questionToAnswerRatio || 0,
            topicTransitions: dbData.communication_patterns.topicTransitions || 0,
            clarificationRequests: dbData.communication_patterns.clarificationRequests || 0
          }
        : {
            averageResponseLength: 0,
            questionToAnswerRatio: 0,
            topicTransitions: 0,
            clarificationRequests: 0
          },
      personalityInsights: dbData?.personality_insights && typeof dbData.personality_insights === 'object'
        ? {
            communicationStyle: dbData.personality_insights.communicationStyle || 'unknown',
            confidence: dbData.personality_insights.confidence || 0,
            analyticalThinking: dbData.personality_insights.analyticalThinking || 0,
            creativity: dbData.personality_insights.creativity || 0,
            leadership: dbData.personality_insights.leadership || 0
          }
        : {
            communicationStyle: 'unknown',
            confidence: 0,
            analyticalThinking: 0,
            creativity: 0,
            leadership: 0
          },
      competencyAnalysis: dbData?.competency_analysis && typeof dbData.competency_analysis === 'object'
        ? {
            technicalCompetency: dbData.competency_analysis.technicalCompetency || 0,
            problemSolving: dbData.competency_analysis.problemSolving || 0,
            teamwork: dbData.competency_analysis.teamwork || 0,
            adaptability: dbData.competency_analysis.adaptability || 0
          }
        : {
            technicalCompetency: 0,
            problemSolving: 0,
            teamwork: 0,
            adaptability: 0
          },
      conversationFlowScore: dbData?.conversation_flow_score || 0,
      engagementMetrics: dbData?.engagement_metrics && typeof dbData.engagement_metrics === 'object'
        ? {
            interactionDensity: dbData.engagement_metrics.interactionDensity || 0,
            responseTime: dbData.engagement_metrics.responseTime || 0,
            questionEngagement: dbData.engagement_metrics.questionEngagement || 0
          }
        : {
            interactionDensity: 0,
            responseTime: 0,
            questionEngagement: 0
          },
      aiInsights: dbData?.ai_insights || {},
      recommendations: Array.isArray(dbData?.recommendations) 
        ? dbData.recommendations.filter((item: any) => typeof item === 'string') 
        : []
    };
  };

  useEffect(() => {
    const fetchIntelligenceData = async () => {
      try {
        const { data, error } = await supabase
          .from('conversation_intelligence')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Error fetching conversation intelligence:', error);
        } else if (data && data.length > 0) {
          const parsedData = parseDbData(data[0]);
          setIntelligenceData(parsedData);
        }
      } catch (error) {
        console.error('Error fetching intelligence data:', error);
      } finally {
        setLoading(false);
      }
    };

    const triggerAnalysis = async () => {
      setAnalyzing(true);
      try {
        const { error } = await supabase.functions.invoke('interview-intelligence', {
          body: { session_id: sessionId }
        });
        
        if (error) {
          console.error('Error triggering analysis:', error);
        }
      } catch (error) {
        console.error('Error calling analysis function:', error);
      } finally {
        setAnalyzing(false);
      }
    };

    if (sessionId) {
      fetchIntelligenceData();
      
      // Subscribe to real-time updates
      const channel = supabase
        .channel('intelligence-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'conversation_intelligence',
            filter: `session_id=eq.${sessionId}`
          },
          (payload) => {
            if (payload.new && typeof payload.new === 'object') {
              const updatedData = parseDbData(payload.new);
              setIntelligenceData(updatedData);
              
              if (onInsightsUpdate) {
                onInsightsUpdate(updatedData);
              }
            }
          }
        )
        .subscribe();

      // Trigger analysis if no data exists
      if (!intelligenceData) {
        triggerAnalysis();
      }

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [sessionId, onInsightsUpdate]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-primary';
    if (score >= 40) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Average';
    return 'Needs Work';
  };

  if (loading || analyzing) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32 space-x-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="text-muted-foreground">
              {analyzing ? 'Analyzing conversation...' : 'Loading intelligence data...'}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!intelligenceData) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No conversation intelligence data available yet.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Overall Conversation Quality */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Conversation Intelligence Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Conversation Quality</span>
                <span className={`text-sm font-bold ${getScoreColor(intelligenceData.conversationQualityScore)}`}>
                  {intelligenceData.conversationQualityScore.toFixed(0)}%
                </span>
              </div>
              <Progress value={intelligenceData.conversationQualityScore} className="h-3 mb-2" />
              <Badge variant="outline">{getScoreBadge(intelligenceData.conversationQualityScore)}</Badge>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Conversation Flow</span>
                <span className={`text-sm font-bold ${getScoreColor(intelligenceData.conversationFlowScore)}`}>
                  {intelligenceData.conversationFlowScore.toFixed(0)}%
                </span>
              </div>
              <Progress value={intelligenceData.conversationFlowScore} className="h-3 mb-2" />
              <Badge variant="outline">{getScoreBadge(intelligenceData.conversationFlowScore)}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="skills" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="personality">Personality</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="recommendations">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="skills" className="space-y-4">
          {/* Skills Demonstrated */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                Skills Demonstrated
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {intelligenceData.skillsDemonstrated.map((skill, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Competency Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Competency Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Technical Competency</span>
                    <span className="text-sm font-medium">
                      {intelligenceData.competencyAnalysis.technicalCompetency.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={intelligenceData.competencyAnalysis.technicalCompetency} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Problem Solving</span>
                    <span className="text-sm font-medium">
                      {intelligenceData.competencyAnalysis.problemSolving.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={intelligenceData.competencyAnalysis.problemSolving} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Teamwork</span>
                    <span className="text-sm font-medium">
                      {intelligenceData.competencyAnalysis.teamwork.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={intelligenceData.competencyAnalysis.teamwork} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Adaptability</span>
                    <span className="text-sm font-medium">
                      {intelligenceData.competencyAnalysis.adaptability.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={intelligenceData.competencyAnalysis.adaptability} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personality">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Personality Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Communication Style</h4>
                  <Badge variant="outline" className="capitalize">
                    {intelligenceData.personalityInsights.communicationStyle}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Confidence</span>
                      <span className="text-sm font-medium">
                        {intelligenceData.personalityInsights.confidence.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={intelligenceData.personalityInsights.confidence} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Analytical Thinking</span>
                      <span className="text-sm font-medium">
                        {intelligenceData.personalityInsights.analyticalThinking.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={intelligenceData.personalityInsights.analyticalThinking} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Creativity</span>
                      <span className="text-sm font-medium">
                        {intelligenceData.personalityInsights.creativity.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={intelligenceData.personalityInsights.creativity} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Leadership</span>
                      <span className="text-sm font-medium">
                        {intelligenceData.personalityInsights.leadership.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={intelligenceData.personalityInsights.leadership} className="h-2" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Communication Patterns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {intelligenceData.communicationPatterns.averageResponseLength}
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Response Length (words)</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {intelligenceData.communicationPatterns.questionToAnswerRatio.toFixed(1)}
                  </div>
                  <div className="text-xs text-muted-foreground">Question to Answer Ratio</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {intelligenceData.communicationPatterns.topicTransitions}
                  </div>
                  <div className="text-xs text-muted-foreground">Topic Transitions</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {intelligenceData.communicationPatterns.clarificationRequests}
                  </div>
                  <div className="text-xs text-muted-foreground">Clarification Requests</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                AI-Powered Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {intelligenceData.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{recommendation}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConversationIntelligenceEngine;