import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  TrendingUp, 
  Star, 
  Clock, 
  Target,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Award
} from "lucide-react";
import { useQuestionBank, Question } from "@/hooks/useQuestionBank";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))', 
  'hsl(var(--accent))',
  'hsl(var(--muted))',
  'hsl(var(--destructive))',
];

export default function QuestionAnalytics() {
  const { questions, loading } = useQuestionBank();
  const [timeRange, setTimeRange] = useState('30');
  const [selectedMetric, setSelectedMetric] = useState('usage');

  const analytics = useMemo(() => {
    if (!questions.length) return null;

    // Basic stats
    const totalQuestions = questions.length;
    const avgUsage = questions.reduce((sum, q) => sum + (q.usage_count || 0), 0) / totalQuestions;
    const avgRating = questions
      .filter(q => q.quality_rating)
      .reduce((sum, q) => sum + (q.quality_rating || 0), 0) / 
      questions.filter(q => q.quality_rating).length || 0;
    
    // Questions by type
    const byType = questions.reduce((acc, q) => {
      acc[q.question_type] = (acc[q.question_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const typeData = Object.entries(byType).map(([type, count]) => ({
      name: type.toUpperCase(),
      value: count,
      percentage: ((count / totalQuestions) * 100).toFixed(1)
    }));

    // Questions by difficulty
    const byDifficulty = questions.reduce((acc, q) => {
      acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const difficultyData = Object.entries(byDifficulty).map(([difficulty, count]) => ({
      name: difficulty,
      count,
      percentage: ((count / totalQuestions) * 100).toFixed(1)
    }));

    // Usage statistics
    const usageRanges = [
      { range: '0', count: questions.filter(q => (q.usage_count || 0) === 0).length },
      { range: '1-5', count: questions.filter(q => (q.usage_count || 0) >= 1 && (q.usage_count || 0) <= 5).length },
      { range: '6-10', count: questions.filter(q => (q.usage_count || 0) >= 6 && (q.usage_count || 0) <= 10).length },
      { range: '11-20', count: questions.filter(q => (q.usage_count || 0) >= 11 && (q.usage_count || 0) <= 20).length },
      { range: '20+', count: questions.filter(q => (q.usage_count || 0) > 20).length },
    ];

    // Quality ratings
    const ratingRanges = [
      { range: '4.5-5.0', count: questions.filter(q => (q.quality_rating || 0) >= 4.5).length },
      { range: '4.0-4.5', count: questions.filter(q => (q.quality_rating || 0) >= 4.0 && (q.quality_rating || 0) < 4.5).length },
      { range: '3.0-4.0', count: questions.filter(q => (q.quality_rating || 0) >= 3.0 && (q.quality_rating || 0) < 4.0).length },
      { range: '2.0-3.0', count: questions.filter(q => (q.quality_rating || 0) >= 2.0 && (q.quality_rating || 0) < 3.0).length },
      { range: 'Below 2.0', count: questions.filter(q => (q.quality_rating || 0) < 2.0 && (q.quality_rating || 0) > 0).length },
      { range: 'Unrated', count: questions.filter(q => !q.quality_rating).length },
    ].filter(item => item.count > 0);

    // Top performing questions
    const topQuestions = questions
      .filter(q => q.usage_count && q.usage_count > 0)
      .sort((a, b) => {
        const scoreA = (a.usage_count || 0) * 0.7 + (a.quality_rating || 0) * 0.3;
        const scoreB = (b.usage_count || 0) * 0.7 + (b.quality_rating || 0) * 0.3;
        return scoreB - scoreA;
      })
      .slice(0, 10);

    // Recent activity (mock data for demonstration)
    const recentActivity = [
      { date: '2024-01-01', created: 2, used: 15 },
      { date: '2024-01-02', created: 1, used: 12 },
      { date: '2024-01-03', created: 3, used: 18 },
      { date: '2024-01-04', created: 0, used: 8 },
      { date: '2024-01-05', created: 2, used: 22 },
      { date: '2024-01-06', created: 1, used: 16 },
      { date: '2024-01-07', created: 4, used: 25 },
    ];

    return {
      totalQuestions,
      avgUsage: avgUsage.toFixed(1),
      avgRating: avgRating.toFixed(1),
      typeData,
      difficultyData,
      usageRanges,
      ratingRanges,
      topQuestions,
      recentActivity
    };
  }, [questions]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse bg-muted h-32 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Analytics Available</h3>
              <p className="text-muted-foreground">
                Create some questions to see analytics and insights
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Question Analytics</h1>
          <p className="text-muted-foreground">
            Insights and performance metrics for your question bank
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 3 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalQuestions}</div>
            <p className="text-xs text-muted-foreground">
              Active in question bank
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Usage</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgUsage}</div>
            <p className="text-xs text-muted-foreground">
              Uses per question
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.avgRating === '0.0' ? 'N/A' : analytics.avgRating}
            </div>
            <p className="text-xs text-muted-foreground">
              Quality score
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.topQuestions[0]?.usage_count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Most used question
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Question Types Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Questions by Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.typeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {analytics.typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any, name, props) => [
                      `${value} questions (${props.payload.percentage}%)`,
                      props.payload.name
                    ]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-4">
                  {analytics.typeData.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <span className="text-sm">{item.name}: {item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Difficulty Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Difficulty Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.difficultyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: any, name) => [
                      `${value} questions`,
                      'Count'
                    ]} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Usage Ranges */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Usage Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics.usageRanges}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => [
                    `${value} questions`,
                    'Count'
                  ]} />
                  <Bar dataKey="count" fill="hsl(var(--secondary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {/* Top Performing Questions */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.topQuestions.map((question, index) => (
                  <div key={question.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <div>
                          <h4 className="font-medium">{question.title}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{question.question_type}</span>
                            <span>•</span>
                            <span>{question.difficulty}</span>
                            <span>•</span>
                            <span>{question.points} pts</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{question.usage_count} uses</div>
                      <div className="text-sm text-muted-foreground">
                        {question.quality_rating ? `${question.quality_rating.toFixed(1)} ★` : 'Not rated'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quality Ratings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Quality Ratings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics.ratingRanges}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => [
                    `${value} questions`,
                    'Count'
                  ]} />
                  <Bar dataKey="count" fill="hsl(var(--accent))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          {/* Activity Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.recentActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="created" 
                    stroke="hsl(var(--primary))" 
                    name="Questions Created"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="used" 
                    stroke="hsl(var(--secondary))" 
                    name="Questions Used"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}