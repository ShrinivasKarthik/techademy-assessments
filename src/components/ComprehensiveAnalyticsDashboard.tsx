import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useAuth } from '@/contexts/AuthContext';
import { useAssessmentState } from '@/contexts/AssessmentStateContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  Target,
  Award,
  AlertTriangle,
  CheckCircle,
  Download,
  Filter,
  Calendar,
  PieChart,
  LineChart,
  Activity
} from "lucide-react";
import { DateRange } from "react-day-picker";

interface AnalyticsData {
  overview: {
    totalAssessments: number;
    totalParticipants: number;
    averageScore: number;
    completionRate: number;
    totalQuestions: number;
    averageDuration: number;
  };
  trends: {
    participationTrend: { date: string; count: number }[];
    scoreTrend: { date: string; average: number }[];
    completionTrend: { date: string; rate: number }[];
  };
  assessmentBreakdown: {
    id: string;
    title: string;
    participants: number;
    averageScore: number;
    completionRate: number;
    totalQuestions: number;
  }[];
  questionAnalytics: {
    questionId: string;
    title: string;
    type: string;
    difficulty: string;
    correctRate: number;
    averageTime: number;
    totalAttempts: number;
  }[];
  participantInsights: {
    topPerformers: { name: string; score: number; assessments: number }[];
    strugglingStudents: { name: string; score: number; assessments: number }[];
    engagementMetrics: { active: number; inactive: number; atRisk: number };
  };
}

const ComprehensiveAnalyticsDashboard = () => {
  const { user, profile } = useAuth();
  const { assessments } = useAssessmentState();
  const { toast } = useToast();
  
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAssessment, setSelectedAssessment] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedAssessment, dateRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Build query filters
      let query = supabase.from('assessment_instances').select(`
        id,
        started_at,
        submitted_at,
        status,
        total_score,
        max_possible_score,
        time_remaining_seconds,
        assessment_id,
        participant_id,
        assessments!inner(id, title, duration_minutes, creator_id),
        profiles!inner(full_name)
      `);

      // Filter by creator for instructors
      if (profile?.role === 'instructor') {
        query = query.eq('assessments.creator_id', user?.id);
      }

      // Filter by assessment if selected
      if (selectedAssessment !== 'all') {
        query = query.eq('assessment_id', selectedAssessment);
      }

      // Filter by date range
      if (dateRange?.from) {
        query = query.gte('started_at', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        query = query.lte('started_at', dateRange.to.toISOString());
      }

      const { data: instances, error } = await query;

      if (error) throw error;

      // Process the data into analytics format
      const processedData = processAnalyticsData(instances || []);
      setAnalyticsData(processedData);

    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (instances: any[]): AnalyticsData => {
    const totalAssessments = new Set(instances.map(i => i.assessment_id)).size;
    const totalParticipants = new Set(instances.map(i => i.participant_id)).size;
    
    const completedInstances = instances.filter(i => i.status === 'submitted' || i.status === 'evaluated');
    const completionRate = instances.length > 0 ? (completedInstances.length / instances.length) * 100 : 0;
    
    const scoresData = completedInstances
      .filter(i => i.total_score !== null && i.max_possible_score !== null)
      .map(i => (i.total_score / i.max_possible_score) * 100);
    
    const averageScore = scoresData.length > 0 
      ? scoresData.reduce((sum, score) => sum + score, 0) / scoresData.length 
      : 0;

    // Generate trends (mock data for demonstration)
    const participationTrend = generateTrendData('participation', 30);
    const scoreTrend = generateTrendData('score', 30);
    const completionTrend = generateTrendData('completion', 30);

    // Assessment breakdown
    const assessmentMap = new Map();
    instances.forEach(instance => {
      const assessmentId = instance.assessment_id;
      if (!assessmentMap.has(assessmentId)) {
        assessmentMap.set(assessmentId, {
          id: assessmentId,
          title: instance.assessments.title,
          participants: new Set(),
          scores: [],
          completed: 0,
          total: 0
        });
      }
      
      const assessment = assessmentMap.get(assessmentId);
      assessment.participants.add(instance.participant_id);
      assessment.total++;
      
      if (instance.status === 'submitted' || instance.status === 'evaluated') {
        assessment.completed++;
        if (instance.total_score !== null && instance.max_possible_score !== null) {
          assessment.scores.push((instance.total_score / instance.max_possible_score) * 100);
        }
      }
    });

    const assessmentBreakdown = Array.from(assessmentMap.values()).map(assessment => ({
      id: assessment.id,
      title: assessment.title,
      participants: assessment.participants.size,
      averageScore: assessment.scores.length > 0 
        ? assessment.scores.reduce((sum: number, score: number) => sum + score, 0) / assessment.scores.length 
        : 0,
      completionRate: assessment.total > 0 ? (assessment.completed / assessment.total) * 100 : 0,
      totalQuestions: 0 // Would need to fetch question data
    }));

    return {
      overview: {
        totalAssessments,
        totalParticipants,
        averageScore,
        completionRate,
        totalQuestions: 0,
        averageDuration: 0
      },
      trends: {
        participationTrend,
        scoreTrend,
        completionTrend
      },
      assessmentBreakdown,
      questionAnalytics: [],
      participantInsights: {
        topPerformers: [],
        strugglingStudents: [],
        engagementMetrics: { active: 0, inactive: 0, atRisk: 0 }
      }
    };
  };

  const generateTrendData = (type: string, days: number) => {
    const data = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const value = Math.floor(Math.random() * 100) + 
        (type === 'score' ? 50 : 0) + 
        (type === 'completion' ? 20 : 0);
      
      data.push({
        date: date.toISOString().split('T')[0],
        [type === 'participation' ? 'count' : type === 'score' ? 'average' : 'rate']: value
      });
    }
    
    return data;
  };

  const exportData = () => {
    if (!analyticsData) return;
    
    const csvData = analyticsData.assessmentBreakdown.map(assessment => ({
      'Assessment Title': assessment.title,
      'Participants': assessment.participants,
      'Average Score': assessment.averageScore.toFixed(2),
      'Completion Rate': assessment.completionRate.toFixed(2)
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'assessment-analytics.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading analytics...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">Advanced Analytics</h1>
            <p className="text-muted-foreground">
              Comprehensive insights into assessment performance and engagement
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={exportData} className="gap-2">
              <Download className="w-4 h-4" />
              Export Data
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Assessment</label>
                <Select value={selectedAssessment} onValueChange={setSelectedAssessment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select assessment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assessments</SelectItem>
                    {assessments.map(assessment => (
                      <SelectItem key={assessment.id} value={assessment.id}>
                        {assessment.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Date Range</label>
                <div className="flex gap-2">
                  <Input 
                    type="date" 
                    value={dateRange?.from?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setDateRange(prev => ({ 
                      ...prev, 
                      from: e.target.value ? new Date(e.target.value) : undefined 
                    }))}
                    placeholder="From date"
                  />
                  <Input 
                    type="date" 
                    value={dateRange?.to?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setDateRange(prev => ({ 
                      ...prev, 
                      to: e.target.value ? new Date(e.target.value) : undefined 
                    }))}
                    placeholder="To date"
                  />
                </div>
              </div>
              
              <div className="flex items-end">
                <Button variant="outline" onClick={loadAnalyticsData} className="gap-2">
                  <Activity className="w-4 h-4" />
                  Refresh Data
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overview Cards */}
        {analyticsData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Total Assessments</p>
                    <p className="text-2xl font-bold">{analyticsData.overview.totalAssessments}</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Total Participants</p>
                    <p className="text-2xl font-bold">{analyticsData.overview.totalParticipants}</p>
                  </div>
                  <Users className="w-8 h-8 text-info" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Average Score</p>
                    <p className="text-2xl font-bold">{analyticsData.overview.averageScore.toFixed(1)}%</p>
                  </div>
                  <Award className="w-8 h-8 text-success" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">Completion Rate</p>
                    <p className="text-2xl font-bold">{analyticsData.overview.completionRate.toFixed(1)}%</p>
                  </div>
                  <Target className="w-8 h-8 text-warning" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Analytics Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="assessments">Assessments</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {analyticsData && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Participation Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      <LineChart className="w-16 h-16 mb-4" />
                      <span>Participation trend chart would go here</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="w-5 h-5" />
                      Score Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      <PieChart className="w-16 h-16 mb-4" />
                      <span>Score distribution chart would go here</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="assessments" className="space-y-6">
            {analyticsData && (
              <Card>
                <CardHeader>
                  <CardTitle>Assessment Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData.assessmentBreakdown.map(assessment => (
                      <div key={assessment.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold">{assessment.title}</h4>
                          <Badge variant="secondary">{assessment.participants} participants</Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Average Score</p>
                            <div className="flex items-center gap-2">
                              <Progress value={assessment.averageScore} className="flex-1" />
                              <span className="font-medium">{assessment.averageScore.toFixed(1)}%</span>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-muted-foreground">Completion Rate</p>
                            <div className="flex items-center gap-2">
                              <Progress value={assessment.completionRate} className="flex-1" />
                              <span className="font-medium">{assessment.completionRate.toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="participants" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Top Performers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-16 h-16 mx-auto mb-4" />
                    <p>Participant performance data will be displayed here</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Students Needing Support
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="w-16 h-16 mx-auto mb-4" />
                    <p>Students requiring attention will be listed here</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  AI-Powered Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="w-16 h-16 mx-auto mb-4" />
                  <p>AI-generated insights and recommendations will appear here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ComprehensiveAnalyticsDashboard;