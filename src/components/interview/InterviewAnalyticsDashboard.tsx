import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Target, 
  Award, 
  MessageCircle,
  Brain,
  Users,
  Star
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface PerformanceMetrics {
  overallScore: number;
  communicationScore: number;
  technicalScore: number;
  behavioralScore: number;
  responseRelevanceScore: number;
  structureScore: number;
  timeManagementScore: number;
  engagementScore: number;
  performanceData: any;
  improvementAreas: string[];
  strengths: string[];
}

interface BenchmarkData {
  roleType: string;
  industry: string;
  experienceLevel: string;
  benchmarkData: any;
  performanceThresholds: any;
}

interface InterviewAnalyticsDashboardProps {
  sessionId: string;
  userId?: string;
}

const InterviewAnalyticsDashboard: React.FC<InterviewAnalyticsDashboardProps> = ({
  sessionId,
  userId
}) => {
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData[]>([]);
  const [loading, setLoading] = useState(true);

  const parseBenchmarkData = (dbData: any[]): BenchmarkData[] => {
    return dbData.map(item => ({
      roleType: item.role_type,
      industry: item.industry,
      experienceLevel: item.experience_level,
      benchmarkData: item.benchmark_data,
      performanceThresholds: item.performance_thresholds
    }));
  };

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        // Fetch performance metrics
        const { data: metrics, error: metricsError } = await supabase
          .from('interview_performance_metrics')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (metricsError) {
          console.error('Error fetching performance metrics:', metricsError);
        } else if (metrics && metrics.length > 0) {
          const latest = metrics[0];
          setPerformanceMetrics({
            overallScore: latest.overall_score || 0,
            communicationScore: latest.communication_score || 0,
            technicalScore: latest.technical_score || 0,
            behavioralScore: latest.behavioral_score || 0,
            responseRelevanceScore: latest.response_relevance_score || 0,
            structureScore: latest.structure_score || 0,
            timeManagementScore: latest.time_management_score || 0,
            engagementScore: latest.engagement_score || 0,
            performanceData: latest.performance_data || {},
            improvementAreas: Array.isArray(latest.improvement_areas) ? latest.improvement_areas.filter((item: any) => typeof item === 'string') : [],
            strengths: Array.isArray(latest.strengths) ? latest.strengths.filter((item: any) => typeof item === 'string') : []
          });
        }

        // Fetch benchmark data
        const { data: benchmarks, error: benchmarkError } = await supabase
          .from('interview_benchmarks')
          .select('*')
          .limit(10);

        if (benchmarkError) {
          console.error('Error fetching benchmarks:', benchmarkError);
        } else if (benchmarks) {
          setBenchmarkData(parseBenchmarkData(benchmarks));
        }

      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchAnalyticsData();
    }
  }, [sessionId]);

  const getPerformanceLevel = (score: number) => {
    if (score >= 85) return { level: 'Excellent', color: 'text-success' };
    if (score >= 75) return { level: 'Good', color: 'text-primary' };
    if (score >= 60) return { level: 'Average', color: 'text-warning' };
    return { level: 'Needs Improvement', color: 'text-destructive' };
  };

  const scoreData = performanceMetrics ? [
    { name: 'Communication', score: performanceMetrics.communicationScore },
    { name: 'Technical', score: performanceMetrics.technicalScore },
    { name: 'Behavioral', score: performanceMetrics.behavioralScore },
    { name: 'Relevance', score: performanceMetrics.responseRelevanceScore },
    { name: 'Structure', score: performanceMetrics.structureScore },
    { name: 'Time Mgmt', score: performanceMetrics.timeManagementScore },
    { name: 'Engagement', score: performanceMetrics.engagementScore }
  ] : [];

  const radarData = performanceMetrics ? [
    { skill: 'Communication', score: performanceMetrics.communicationScore, fullMark: 100 },
    { skill: 'Technical', score: performanceMetrics.technicalScore, fullMark: 100 },
    { skill: 'Behavioral', score: performanceMetrics.behavioralScore, fullMark: 100 },
    { skill: 'Structure', score: performanceMetrics.structureScore, fullMark: 100 },
    { skill: 'Engagement', score: performanceMetrics.engagementScore, fullMark: 100 }
  ] : [];

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!performanceMetrics) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No performance metrics available yet. Complete the interview to see your analytics.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Overall Performance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Overall Interview Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="text-3xl font-bold text-primary">
              {performanceMetrics.overallScore.toFixed(0)}%
            </div>
            <Badge variant="outline" className={getPerformanceLevel(performanceMetrics.overallScore).color}>
              {getPerformanceLevel(performanceMetrics.overallScore).level}
            </Badge>
          </div>
          <Progress value={performanceMetrics.overallScore} className="h-3" />
        </CardContent>
      </Card>

      <Tabs defaultValue="scores" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="scores">Detailed Scores</TabsTrigger>
          <TabsTrigger value="radar">Skills Radar</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
        </TabsList>

        <TabsContent value="scores" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Performance Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scoreData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis 
                      domain={[0, 100]}
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                    />
                    <Bar 
                      dataKey="score" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Individual Score Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Communication
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {performanceMetrics.communicationScore.toFixed(0)}%
                </div>
                <Progress value={performanceMetrics.communicationScore} className="h-2 mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Technical
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {performanceMetrics.technicalScore.toFixed(0)}%
                </div>
                <Progress value={performanceMetrics.technicalScore} className="h-2 mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Behavioral
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {performanceMetrics.behavioralScore.toFixed(0)}%
                </div>
                <Progress value={performanceMetrics.behavioralScore} className="h-2 mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {performanceMetrics.timeManagementScore.toFixed(0)}%
                </div>
                <Progress value={performanceMetrics.timeManagementScore} className="h-2 mt-2" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="radar">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Skills Assessment Radar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis 
                      dataKey="skill" 
                      tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                    />
                    <PolarRadiusAxis 
                      angle={90} 
                      domain={[0, 100]} 
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-success">
                  <Star className="h-5 w-5" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {performanceMetrics.strengths.map((strength, index) => (
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
                  <TrendingUp className="h-5 w-5" />
                  Areas for Improvement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {performanceMetrics.improvementAreas.map((area, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-warning rounded-full" />
                      <span className="text-sm">{area}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="benchmarks">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Industry Benchmarks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {benchmarkData.map((benchmark, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium capitalize">
                        {benchmark.roleType.replace('_', ' ')} - {benchmark.experienceLevel}
                      </h4>
                      <Badge variant="outline">{benchmark.industry}</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      {benchmark.benchmarkData && typeof benchmark.benchmarkData === 'object' && 
                        Object.entries(benchmark.benchmarkData).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="capitalize">{key.replace('_', ' ')}:</span>
                            <span className="font-medium">{String(value)}%</span>
                          </div>
                        ))
                      }
                    </div>
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

export default InterviewAnalyticsDashboard;