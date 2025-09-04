import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Target,
  Users,
  Clock,
  Lightbulb,
  Zap,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AIInsights {
  overallPerformance: {
    summary: string;
    strengths: string[];
    concerns: string[];
    trend: 'improving' | 'stable' | 'declining';
    recommendations: string[];
  };
  questionAnalysis: {
    topPerforming: string[];
    strugglingQuestions: string[];
    difficultyBalance: string;
    typeEffectiveness: string;
  };
  participantInsights: {
    engagementLevel: 'high' | 'medium' | 'low';
    completionFactors: string[];
    timeManagement: string;
    skillGaps: string[];
  };
  actionableRecommendations: Array<{
    category: string;
    priority: 'high' | 'medium' | 'low';
    action: string;
    expectedImpact: string;
  }>;
  predictiveInsights: {
    futurePerformance: string;
    riskFactors: string[];
    opportunityAreas: string[];
  };
  metadata?: {
    generatedAt: string;
    assessmentId: string;
    analysisType: string;
    dataPoints: {
      totalParticipants: number;
      completedInstances: number;
      questionsAnalyzed: number;
    };
  };
}

interface AIInsightsDashboardProps {
  assessmentId: string;
}

const AIInsightsDashboard: React.FC<AIInsightsDashboardProps> = ({ assessmentId }) => {
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateInsights = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assessment-insights', {
        body: {
          assessmentId,
          analysisType: 'comprehensive'
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate insights');
      }

      setInsights(data.insights);
      toast({
        title: "AI Insights Generated",
        description: "Comprehensive analysis completed successfully",
      });

    } catch (error) {
      console.error('Error generating insights:', error);
      toast({
        title: "Analysis Failed",
        description: "Could not generate AI insights. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (assessmentId) {
      generateInsights();
    }
  }, [assessmentId]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Target className="w-4 h-4 text-blue-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'text-green-600 bg-green-100';
      case 'declining':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-blue-600 bg-blue-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEngagementColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-green-600';
      case 'low':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <Brain className="w-12 h-12 mx-auto animate-pulse text-primary" />
            <div>
              <h3 className="text-lg font-medium">Generating AI Insights</h3>
              <p className="text-muted-foreground">Analyzing assessment data and performance patterns...</p>
            </div>
            <Progress value={Math.random() * 100} className="w-64 mx-auto" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No Insights Available</h3>
          <p className="text-muted-foreground mb-4">Generate AI-powered insights for this assessment</p>
          <Button onClick={generateInsights}>
            <Zap className="w-4 h-4 mr-2" />
            Generate Insights
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6" />
            AI-Powered Insights
          </h2>
          <p className="text-muted-foreground">
            Generated {insights.metadata?.generatedAt ? 
              new Date(insights.metadata.generatedAt).toLocaleDateString() : 'recently'}
          </p>
        </div>
        <Button onClick={generateInsights} variant="outline" disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Insights
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {getTrendIcon(insights.overallPerformance.trend)}
              <div>
                <div className="text-sm text-muted-foreground">Performance Trend</div>
                <Badge className={getTrendColor(insights.overallPerformance.trend)}>
                  {insights.overallPerformance.trend.toUpperCase()}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className={`w-8 h-8 ${getEngagementColor(insights.participantInsights.engagementLevel)}`} />
              <div>
                <div className="text-sm text-muted-foreground">Engagement Level</div>
                <div className={`text-lg font-bold ${getEngagementColor(insights.participantInsights.engagementLevel)}`}>
                  {insights.participantInsights.engagementLevel.toUpperCase()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-orange-500" />
              <div>
                <div className="text-sm text-muted-foreground">Priority Actions</div>
                <div className="text-lg font-bold">
                  {insights.actionableRecommendations.filter(r => r.priority === 'high').length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="questions">Question Analysis</TabsTrigger>
          <TabsTrigger value="participants">Participant Insights</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Performance Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Overall Performance Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{insights.overallPerformance.summary}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-green-700 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Strengths
                  </h4>
                  <ul className="space-y-1">
                    {insights.overallPerformance.strengths.map((strength, index) => (
                      <li key={index} className="text-sm text-muted-foreground">• {strength}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-orange-700 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Areas of Concern
                  </h4>
                  <ul className="space-y-1">
                    {insights.overallPerformance.concerns.map((concern, index) => (
                      <li key={index} className="text-sm text-muted-foreground">• {concern}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-700">Top Performing Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {insights.questionAnalysis.topPerforming.map((insight, index) => (
                    <li key={index} className="text-sm p-2 bg-green-50 rounded border-l-2 border-green-500">
                      {insight}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-red-700">Struggling Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {insights.questionAnalysis.strugglingQuestions.map((insight, index) => (
                    <li key={index} className="text-sm p-2 bg-red-50 rounded border-l-2 border-red-500">
                      {insight}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Assessment Balance Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Difficulty Balance</h4>
                <p className="text-sm text-muted-foreground">{insights.questionAnalysis.difficultyBalance}</p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Question Type Effectiveness</h4>
                <p className="text-sm text-muted-foreground">{insights.questionAnalysis.typeEffectiveness}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="participants" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Participant Behavior Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Completion Factors</h4>
                  <ul className="space-y-2">
                    {insights.participantInsights.completionFactors.map((factor, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <div className="w-1 h-1 bg-blue-500 rounded-full mt-2"></div>
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Identified Skill Gaps</h4>
                  <ul className="space-y-2">
                    {insights.participantInsights.skillGaps.map((gap, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <div className="w-1 h-1 bg-orange-500 rounded-full mt-2"></div>
                        {gap}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Time Management Analysis</h4>
                <p className="text-sm text-muted-foreground">{insights.participantInsights.timeManagement}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          {insights.actionableRecommendations.map((recommendation, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Lightbulb className="w-5 h-5 text-yellow-500" />
                    <div>
                      <h4 className="font-medium">{recommendation.category}</h4>
                      <Badge className={getPriorityColor(recommendation.priority)}>
                        {recommendation.priority.toUpperCase()} PRIORITY
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm">{recommendation.action}</p>
                  <div className="p-2 bg-muted/50 rounded text-xs">
                    <strong>Expected Impact:</strong> {recommendation.expectedImpact}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Predictive Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-2">Future Performance Prediction</h4>
                <p className="text-sm text-muted-foreground">{insights.predictiveInsights.futurePerformance}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-red-700 mb-3">Risk Factors</h4>
                  <ul className="space-y-2">
                    {insights.predictiveInsights.riskFactors.map((risk, index) => (
                      <li key={index} className="text-sm p-2 bg-red-50 rounded border-l-2 border-red-500">
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-green-700 mb-3">Opportunity Areas</h4>
                  <ul className="space-y-2">
                    {insights.predictiveInsights.opportunityAreas.map((opportunity, index) => (
                      <li key={index} className="text-sm p-2 bg-green-50 rounded border-l-2 border-green-500">
                        {opportunity}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {insights.metadata && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div>
                Analysis based on {insights.metadata.dataPoints.totalParticipants} participants, 
                {insights.metadata.dataPoints.completedInstances} completed instances, 
                and {insights.metadata.dataPoints.questionsAnalyzed} questions
              </div>
              <div>
                Generated: {new Date(insights.metadata.generatedAt).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIInsightsDashboard;