import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  Target,
  Brain,
  PieChart,
  BarChart3,
  LineChart,
  Download,
  Filter,
  Calendar,
  Award
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalAssessments: number;
    totalParticipants: number;
    averageScore: number;
    completionRate: number;
    averageTime: number;
  };
  performance: {
    scoreDistribution: { range: string; count: number; percentage: number }[];
    timeAnalysis: { period: string; averageTime: number; completionRate: number }[];
    difficultyAnalysis: { level: string; averageScore: number; attempts: number }[];
  };
  insights: {
    topPerformers: { name: string; score: number; assessment: string }[];
    strugglingAreas: { topic: string; averageScore: number; improvement: number }[];
    trends: { metric: string; change: number; trend: 'up' | 'down' }[];
  };
}

const AdvancedAnalyticsDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedAssessment, setSelectedAssessment] = useState('all');

  const analyticsData: AnalyticsData = {
    overview: {
      totalAssessments: 156,
      totalParticipants: 2847,
      averageScore: 76.8,
      completionRate: 89.2,
      averageTime: 42 // minutes
    },
    performance: {
      scoreDistribution: [
        { range: '90-100', count: 428, percentage: 25.4 },
        { range: '80-89', count: 612, percentage: 36.3 },
        { range: '70-79', count: 387, percentage: 22.9 },
        { range: '60-69', count: 184, percentage: 10.9 },
        { range: '0-59', count: 76, percentage: 4.5 }
      ],
      timeAnalysis: [
        { period: 'Week 1', averageTime: 45, completionRate: 87 },
        { period: 'Week 2', averageTime: 42, completionRate: 91 },
        { period: 'Week 3', averageTime: 38, completionRate: 89 },
        { period: 'Week 4', averageTime: 41, completionRate: 92 }
      ],
      difficultyAnalysis: [
        { level: 'Easy', averageScore: 89.2, attempts: 856 },
        { level: 'Medium', averageScore: 74.6, attempts: 1247 },
        { level: 'Hard', averageScore: 58.3, attempts: 498 }
      ]
    },
    insights: {
      topPerformers: [
        { name: 'Alice Johnson', score: 97, assessment: 'React Advanced' },
        { name: 'Bob Smith', score: 95, assessment: 'Python Backend' },
        { name: 'Carol Davis', score: 94, assessment: 'Data Structures' }
      ],
      strugglingAreas: [
        { topic: 'Algorithm Optimization', averageScore: 62.4, improvement: -5.2 },
        { topic: 'Database Design', averageScore: 68.1, improvement: 2.1 },
        { topic: 'System Architecture', averageScore: 71.3, improvement: 8.7 }
      ],
      trends: [
        { metric: 'Completion Rate', change: 3.2, trend: 'up' },
        { metric: 'Average Score', change: -1.4, trend: 'down' },
        { metric: 'Time Efficiency', change: 7.8, trend: 'up' }
      ]
    }
  };

  const getTrendIcon = (trend: 'up' | 'down') => {
    return trend === 'up' ? (
      <TrendingUp className="w-4 h-4 text-green-500" />
    ) : (
      <TrendingDown className="w-4 h-4 text-red-500" />
    );
  };

  const getTrendColor = (trend: 'up' | 'down') => {
    return trend === 'up' ? 'text-green-500' : 'text-red-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advanced Analytics Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive insights into assessment performance and trends</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <PieChart className="w-8 h-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{analyticsData.overview.totalAssessments}</div>
                <div className="text-sm text-muted-foreground">Total Assessments</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{analyticsData.overview.totalParticipants.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Participants</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{analyticsData.overview.averageScore}%</div>
                <div className="text-sm text-muted-foreground">Average Score</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{analyticsData.overview.completionRate}%</div>
                <div className="text-sm text-muted-foreground">Completion Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-red-500" />
              <div>
                <div className="text-2xl font-bold">{analyticsData.overview.averageTime}m</div>
                <div className="text-sm text-muted-foreground">Average Time</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance Analysis</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="trends">Trends & Patterns</TabsTrigger>
          <TabsTrigger value="reports">Custom Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Score Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.performance.scoreDistribution.map((item) => (
                    <div key={item.range} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{item.range}%</span>
                        <span>{item.count} students ({item.percentage}%)</span>
                      </div>
                      <Progress value={item.percentage} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Difficulty Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Difficulty Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.performance.difficultyAnalysis.map((item) => (
                    <div key={item.level} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{item.level}</div>
                        <div className="text-sm text-muted-foreground">{item.attempts} attempts</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{item.averageScore}%</div>
                        <Badge variant={item.averageScore > 80 ? 'default' : item.averageScore > 60 ? 'secondary' : 'destructive'}>
                          {item.averageScore > 80 ? 'Good' : item.averageScore > 60 ? 'Fair' : 'Poor'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Time Analysis Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="w-5 h-5" />
                Time Analysis Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Time analysis chart would be rendered here with actual charting library
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.insights.topPerformers.map((performer, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{performer.name}</div>
                        <div className="text-sm text-muted-foreground">{performer.assessment}</div>
                      </div>
                      <Badge variant="default" className="text-lg font-bold">
                        {performer.score}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Struggling Areas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Areas for Improvement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.insights.strugglingAreas.map((area, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{area.topic}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{area.averageScore}%</span>
                          <div className={`flex items-center gap-1 ${area.improvement > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {getTrendIcon(area.improvement > 0 ? 'up' : 'down')}
                            <span className="text-xs">{Math.abs(area.improvement)}%</span>
                          </div>
                        </div>
                      </div>
                      <Progress value={area.averageScore} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI-Generated Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI-Generated Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <h4 className="font-medium text-blue-900 mb-2">Performance Pattern Detected</h4>
                  <p className="text-blue-800 text-sm">
                    Students perform 23% better on coding questions when given hints. Consider adding more guided assistance for complex problems.
                  </p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                  <h4 className="font-medium text-yellow-900 mb-2">Time Allocation Insight</h4>
                  <p className="text-yellow-800 text-sm">
                    Participants spending more than 45 minutes show diminishing returns. Consider optimizing assessment length.
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <h4 className="font-medium text-green-900 mb-2">Success Factor Identified</h4>
                  <p className="text-green-800 text-sm">
                    Questions with practical examples have 31% higher completion rates compared to theoretical ones.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analyticsData.insights.trends.map((trend, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">{trend.metric}</div>
                      <div className="text-2xl font-bold">{Math.abs(trend.change)}%</div>
                    </div>
                    <div className={`flex items-center gap-1 ${getTrendColor(trend.trend)}`}>
                      {getTrendIcon(trend.trend)}
                      <span className="text-sm font-medium">{trend.trend === 'up' ? 'Increase' : 'Decrease'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Historical Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Historical trends chart would be rendered here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Custom Report Builder</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Report Type</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select report type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="performance">Performance Summary</SelectItem>
                        <SelectItem value="detailed">Detailed Analysis</SelectItem>
                        <SelectItem value="comparison">Comparative Report</SelectItem>
                        <SelectItem value="trends">Trend Analysis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date Range</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select date range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7d">Last 7 days</SelectItem>
                        <SelectItem value="30d">Last 30 days</SelectItem>
                        <SelectItem value="90d">Last 90 days</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Format</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF Report</SelectItem>
                        <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                        <SelectItem value="csv">CSV Data</SelectItem>
                        <SelectItem value="json">JSON Export</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button>
                    <Download className="w-4 h-4 mr-2" />
                    Generate Report
                  </Button>
                  <Button variant="outline">
                    Schedule Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedAnalyticsDashboard;