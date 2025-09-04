import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
} from 'recharts';
import { 
  TrendingUp,
  Target,
  AlertTriangle,
  CheckCircle,
  Brain,
  BookOpen,
  Award,
  Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SkillAnalytics {
  skill_name: string;
  total_questions: number;
  usage_frequency: number;
  performance_score: number;
  avg_difficulty_score: number;
  analytics_data: any;
}

interface SkillGap {
  skill: string;
  coverage: number;
  demand: number;
  gap: number;
  priority: 'high' | 'medium' | 'low';
  recommendations: string[];
}

export default function SkillGapAnalysis() {
  const [skillAnalytics, setSkillAnalytics] = useState<SkillAnalytics[]>([]);
  const [skillGaps, setSkillGaps] = useState<SkillGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [timeframe, setTimeframe] = useState('30d');

  const { toast } = useToast();

  useEffect(() => {
    fetchSkillAnalytics();
    analyzeSkillGaps();
  }, [timeframe, selectedCategory]);

  const fetchSkillAnalytics = async () => {
    try {
      const { data, error } = await supabase
        .from('skill_analytics')
        .select('*')
        .order('usage_frequency', { ascending: false });

      if (error) throw error;
      setSkillAnalytics(data || []);
    } catch (error) {
      console.error('Error fetching skill analytics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch skill analytics",
        variant: "destructive",
      });
    }
  };

  const analyzeSkillGaps = async () => {
    try {
      setLoading(true);
      
      // Simulate skill gap analysis
      // In a real implementation, this would analyze question coverage vs. industry demand
      const mockGaps: SkillGap[] = [
        {
          skill: 'Machine Learning',
          coverage: 25,
          demand: 85,
          gap: 60,
          priority: 'high',
          recommendations: [
            'Add more ML algorithm questions',
            'Include practical implementation scenarios',
            'Focus on model evaluation techniques'
          ]
        },
        {
          skill: 'Cloud Computing',
          coverage: 45,
          demand: 75,
          gap: 30,
          priority: 'medium',
          recommendations: [
            'Add AWS/Azure specific questions',
            'Include containerization scenarios',
            'Cover serverless architectures'
          ]
        },
        {
          skill: 'Data Structures',
          coverage: 80,
          demand: 70,
          gap: -10,
          priority: 'low',
          recommendations: [
            'Maintain current coverage',
            'Add advanced algorithm challenges'
          ]
        },
        {
          skill: 'System Design',
          coverage: 35,
          demand: 90,
          gap: 55,
          priority: 'high',
          recommendations: [
            'Add scalability questions',
            'Include distributed systems scenarios',
            'Cover microservices architecture'
          ]
        }
      ];

      setSkillGaps(mockGaps);
    } catch (error) {
      console.error('Error analyzing skill gaps:', error);
      toast({
        title: "Error",
        description: "Failed to analyze skill gaps",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = async () => {
    toast({
      title: "Generating Recommendations",
      description: "AI-powered recommendations will be generated based on skill gaps",
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getGapColor = (gap: number) => {
    if (gap > 40) return '#ef4444'; // red
    if (gap > 20) return '#f59e0b'; // yellow
    if (gap >= 0) return '#10b981'; // green
    return '#6b7280'; // gray (over-covered)
  };

  const chartData = skillGaps.map(gap => ({
    skill: gap.skill,
    coverage: gap.coverage,
    demand: gap.demand,
    gap: Math.abs(gap.gap)
  }));

  const pieData = skillGaps.map((gap, index) => ({
    name: gap.skill,
    value: gap.demand,
    color: ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c'][index % 4]
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Skill Gap Analysis</h2>
          <p className="text-muted-foreground">
            Identify gaps between current question coverage and industry demand
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={generateRecommendations}>
            <Brain className="h-4 w-4 mr-2" />
            AI Recommendations
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Skills</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{skillGaps.length}</div>
            <p className="text-xs text-muted-foreground">
              Skills analyzed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority Gaps</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {skillGaps.filter(gap => gap.priority === 'high').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Coverage</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(skillGaps.reduce((acc, gap) => acc + gap.coverage, 0) / skillGaps.length)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Across all skills
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Well Covered</CardTitle>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {skillGaps.filter(gap => gap.gap <= 10).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Skills with good coverage
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Coverage vs Demand Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="skill" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="coverage" fill="#8884d8" name="Current Coverage" />
                <Bar dataKey="demand" fill="#82ca9d" name="Industry Demand" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Skill Demand Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Skill Gap Details */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Skill Gap Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {skillGaps.map((gap, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h4 className="font-medium">{gap.skill}</h4>
                    <Badge variant={getPriorityColor(gap.priority) as any}>
                      {gap.priority} priority
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Gap: {gap.gap > 0 ? '+' : ''}{gap.gap}%
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Current Coverage</span>
                      <span>{gap.coverage}%</span>
                    </div>
                    <Progress value={gap.coverage} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Industry Demand</span>
                      <span>{gap.demand}%</span>
                    </div>
                    <Progress value={gap.demand} className="h-2" />
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-medium mb-2">Recommendations:</h5>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {gap.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}