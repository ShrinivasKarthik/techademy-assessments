import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  Trophy, 
  Clock, 
  Target, 
  TrendingUp, 
  Brain,
  Code,
  CheckCircle,
  AlertCircle,
  Download,
  Calendar,
  Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AssessmentResult {
  id: string;
  participant_name: string;
  total_score: number;
  max_score: number;
  time_taken_minutes: number;
  submitted_at: string;
  questions_answered: number;
  total_questions: number;
  skill_breakdown: Record<string, number>;
}

interface AnalyticsData {
  overview: {
    totalParticipants: number;
    averageScore: number;
    completionRate: number;
    averageTimeSpent: number;
  };
  scoreDistribution: Array<{ range: string, count: number }>;
  skillAnalysis: Array<{ skill: string, averageScore: number, maxScore: number }>;
  timeAnalysis: Array<{ timeRange: string, count: number }>;
  questionPerformance: Array<{ question: string, averageScore: number, difficulty: string }>;
  participantProgress: Array<{ participant: string, score: number, timeSpent: number }>;
}

interface AssessmentAnalyticsDashboardProps {
  assessmentId: string;
}

const AssessmentAnalyticsDashboard: React.FC<AssessmentAnalyticsDashboardProps> = ({
  assessmentId
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadAnalytics();
  }, [assessmentId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch assessment instances and compute results
      const { data: instancesData, error: instancesError } = await supabase
        .from('assessment_instances')
        .select(`
          id,
          participant_id,
          total_score,
          max_possible_score,
          started_at,
          submitted_at,
          time_remaining_seconds
        `)
        .eq('assessment_id', assessmentId)
        .eq('status', 'submitted');

      if (instancesError) throw instancesError;

      // Transform instances to results format
      const transformedResults = (instancesData || []).map((instance, index) => ({
        id: instance.id,
        participant_name: `Participant ${index + 1}`,
        total_score: instance.total_score || 0,
        max_score: instance.max_possible_score || 100,
        time_taken_minutes: Math.round(((instance.submitted_at ? new Date(instance.submitted_at).getTime() : Date.now()) - new Date(instance.started_at).getTime()) / 60000),
        submitted_at: instance.submitted_at || new Date().toISOString(),
        questions_answered: 5, // Mock data
        total_questions: 5, // Mock data
        skill_breakdown: {} // Mock data
      }));

      setResults(transformedResults);

      // Calculate analytics
      if (transformedResults.length) {
        const analyticsData = calculateAnalytics(transformedResults);
        setAnalytics(analyticsData);
      }

    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Error loading analytics",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (results: AssessmentResult[]): AnalyticsData => {
    const totalParticipants = results.length;
    const averageScore = results.reduce((sum, r) => sum + (r.total_score / r.max_score * 100), 0) / totalParticipants;
    const completionRate = results.filter(r => r.questions_answered === r.total_questions).length / totalParticipants * 100;
    const averageTimeSpent = results.reduce((sum, r) => sum + r.time_taken_minutes, 0) / totalParticipants;

    // Score distribution
    const scoreRanges = ['0-20', '21-40', '41-60', '61-80', '81-100'];
    const scoreDistribution = scoreRanges.map(range => {
      const [min, max] = range.split('-').map(Number);
      const count = results.filter(r => {
        const percentage = (r.total_score / r.max_score) * 100;
        return percentage >= min && percentage <= max;
      }).length;
      return { range, count };
    });

    // Skill analysis
    const allSkills = new Set<string>();
    results.forEach(r => {
      if (r.skill_breakdown) {
        Object.keys(r.skill_breakdown).forEach(skill => allSkills.add(skill));
      }
    });

    const skillAnalysis = Array.from(allSkills).map(skill => {
      const skillScores = results
        .filter(r => r.skill_breakdown?.[skill] !== undefined)
        .map(r => r.skill_breakdown[skill]);
      
      const averageScore = skillScores.length > 0 
        ? skillScores.reduce((sum, score) => sum + score, 0) / skillScores.length 
        : 0;
      
      return { skill, averageScore, maxScore: 100 };
    });

    // Time analysis
    const timeRanges = ['0-30', '31-60', '61-90', '91-120', '120+'];
    const timeAnalysis = timeRanges.map(range => {
      let count = 0;
      if (range === '120+') {
        count = results.filter(r => r.time_taken_minutes > 120).length;
      } else {
        const [min, max] = range.split('-').map(Number);
        count = results.filter(r => r.time_taken_minutes >= min && r.time_taken_minutes <= max).length;
      }
      return { timeRange: range + ' min', count };
    });

    // Mock question performance data
    const questionPerformance = [
      { question: 'Q1: Algorithm Design', averageScore: 78, difficulty: 'Medium' },
      { question: 'Q2: Code Optimization', averageScore: 65, difficulty: 'Hard' },
      { question: 'Q3: Data Structures', averageScore: 82, difficulty: 'Easy' },
      { question: 'Q4: System Design', averageScore: 59, difficulty: 'Hard' },
    ];

    // Participant progress
    const participantProgress = results.map(r => ({
      participant: r.participant_name,
      score: (r.total_score / r.max_score) * 100,
      timeSpent: r.time_taken_minutes
    }));

    return {
      overview: {
        totalParticipants,
        averageScore,
        completionRate,
        averageTimeSpent
      },
      scoreDistribution,
      skillAnalysis,
      timeAnalysis,
      questionPerformance,
      participantProgress
    };
  };

  const exportResults = async () => {
    try {
      const csvContent = [
        ['Participant', 'Score (%)', 'Time (min)', 'Completion', 'Submitted At'].join(','),
        ...results.map(r => [
          r.participant_name,
          ((r.total_score / r.max_score) * 100).toFixed(1),
          r.time_taken_minutes,
          r.questions_answered === r.total_questions ? 'Complete' : 'Partial',
          new Date(r.submitted_at).toLocaleDateString()
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assessment-results-${assessmentId}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: "Results have been downloaded as CSV."
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Could not export results.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No Results Yet</h3>
          <p className="text-muted-foreground">Analytics will appear once participants submit their assessments.</p>
        </CardContent>
      </Card>
    );
  }

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Assessment Analytics</h2>
          <p className="text-muted-foreground">Comprehensive insights and performance metrics</p>
        </div>
        <Button onClick={exportResults} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Results
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Participants</p>
                <p className="text-2xl font-bold">{analytics.overview.totalParticipants}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Average Score</p>
                <p className="text-2xl font-bold">{analytics.overview.averageScore.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold">{analytics.overview.completionRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Avg. Time</p>
                <p className="text-2xl font-bold">{analytics.overview.averageTimeSpent.toFixed(0)}m</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Score Distribution</TabsTrigger>
          <TabsTrigger value="skills">Skills Analysis</TabsTrigger>
          <TabsTrigger value="performance">Question Performance</TabsTrigger>
          <TabsTrigger value="participants">Participants</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="w-5 h-5" />
                  Score Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.scoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Time Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Time Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.timeAnalysis}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ timeRange, count }) => `${timeRange}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analytics.timeAnalysis.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="skills" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Skills Performance Radar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={analytics.skillAnalysis}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="skill" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar
                    name="Average Score"
                    dataKey="averageScore"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.3}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Question Performance Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analytics.questionPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="question" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="averageScore" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="participants" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Participant Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={result.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{result.participant_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Submitted {new Date(result.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">{((result.total_score / result.max_score) * 100).toFixed(1)}%</p>
                        <p className="text-sm text-muted-foreground">{result.time_taken_minutes}m</p>
                      </div>
                      <Badge 
                        variant={result.questions_answered === result.total_questions ? "default" : "secondary"}
                      >
                        {result.questions_answered}/{result.total_questions} answered
                      </Badge>
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

export default AssessmentAnalyticsDashboard;