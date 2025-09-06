import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Target,
  Award,
  Clock,
  Zap
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, ScatterChart, Scatter } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Cohort {
  id: string;
  name: string;
  description: string;
  createdDate: string;
  totalStudents: number;
  activeStudents: number;
  completionRate: number;
  averageScore: number;
  benchmarkScore: number;
  trend: 'improving' | 'stable' | 'declining';
}

interface CohortComparison {
  cohortId: string;
  cohortName: string;
  metric: string;
  value: number;
  benchmark: number;
  percentile: number;
}

interface PerformanceMetric {
  date: string;
  cohort1: number;
  cohort2: number;
  cohort3: number;
  benchmark: number;
}

interface StudentProgression {
  studentId: string;
  studentName: string;
  initialScore: number;
  currentScore: number;
  improvement: number;
  timeToComplete: number;
  strugglingAreas: string[];
  strengths: string[];
}

const CohortAnalysisDashboard: React.FC = () => {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [comparisons, setComparisons] = useState<CohortComparison[]>([]);
  const [progressions, setProgressions] = useState<StudentProgression[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCohorts, setSelectedCohorts] = useState<string[]>([]);
  const [analysisType, setAnalysisType] = useState('performance');

  useEffect(() => {
    loadCohortData();
  }, [selectedCohorts, analysisType]);

  const loadCohortData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cohort-analysis', {
        body: { 
          cohorts: selectedCohorts,
          analysisType,
          includeBenchmarks: true
        }
      });

      if (error) throw error;

      setCohorts(data.cohorts || []);
      setComparisons(data.comparisons || []);
      setProgressions(data.progressions || []);
      setPerformanceData(data.performanceData || []);
    } catch (error) {
      console.error('Error loading cohort data:', error);
      toast.error('Failed to load cohort analysis');
      
      // Mock data for demo
      const mockCohorts: Cohort[] = [
        {
          id: '1',
          name: 'Spring 2024 Cohort',
          description: 'Web Development Bootcamp - Spring Session',
          createdDate: '2024-01-15',
          totalStudents: 45,
          activeStudents: 42,
          completionRate: 87,
          averageScore: 82.5,
          benchmarkScore: 78.0,
          trend: 'improving'
        },
        {
          id: '2',
          name: 'Winter 2024 Cohort',
          description: 'Web Development Bootcamp - Winter Session',
          createdDate: '2023-10-01',
          totalStudents: 38,
          activeStudents: 35,
          completionRate: 92,
          averageScore: 79.2,
          benchmarkScore: 78.0,
          trend: 'stable'
        },
        {
          id: '3',
          name: 'Fall 2023 Cohort',
          description: 'Web Development Bootcamp - Fall Session',
          createdDate: '2023-07-15',
          totalStudents: 52,
          activeStudents: 50,
          completionRate: 94,
          averageScore: 85.1,
          benchmarkScore: 78.0,
          trend: 'improving'
        }
      ];

      const mockComparisons: CohortComparison[] = [
        { cohortId: '1', cohortName: 'Spring 2024', metric: 'Average Score', value: 82.5, benchmark: 78.0, percentile: 75 },
        { cohortId: '2', cohortName: 'Winter 2024', metric: 'Average Score', value: 79.2, benchmark: 78.0, percentile: 55 },
        { cohortId: '3', cohortName: 'Fall 2023', metric: 'Average Score', value: 85.1, benchmark: 78.0, percentile: 90 },
        { cohortId: '1', cohortName: 'Spring 2024', metric: 'Completion Rate', value: 87, benchmark: 85, percentile: 65 },
        { cohortId: '2', cohortName: 'Winter 2024', metric: 'Completion Rate', value: 92, benchmark: 85, percentile: 85 },
        { cohortId: '3', cohortName: 'Fall 2023', metric: 'Completion Rate', value: 94, benchmark: 85, percentile: 95 }
      ];

      const mockProgressions: StudentProgression[] = [
        {
          studentId: '1',
          studentName: 'Alice Johnson',
          initialScore: 65,
          currentScore: 85,
          improvement: 20,
          timeToComplete: 8,
          strugglingAreas: ['JavaScript Async', 'React Hooks'],
          strengths: ['HTML/CSS', 'Problem Solving']
        },
        {
          studentId: '2',
          studentName: 'Bob Smith',
          initialScore: 70,
          currentScore: 78,
          improvement: 8,
          timeToComplete: 12,
          strugglingAreas: ['Backend APIs', 'Database Design'],
          strengths: ['Frontend Development', 'UI/UX']
        }
      ];

      const mockPerformanceData: PerformanceMetric[] = [
        { date: 'Week 1', cohort1: 65, cohort2: 68, cohort3: 70, benchmark: 65 },
        { date: 'Week 2', cohort1: 70, cohort2: 72, cohort3: 75, benchmark: 68 },
        { date: 'Week 3', cohort1: 75, cohort2: 74, cohort3: 78, benchmark: 72 },
        { date: 'Week 4', cohort1: 78, cohort2: 76, cohort3: 80, benchmark: 75 },
        { date: 'Week 5', cohort1: 80, cohort2: 78, cohort3: 82, benchmark: 76 },
        { date: 'Week 6', cohort1: 82, cohort2: 79, cohort3: 84, benchmark: 78 }
      ];

      setCohorts(mockCohorts);
      setComparisons(mockComparisons);
      setProgressions(mockProgressions);
      setPerformanceData(mockPerformanceData);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'stable': return <Target className="h-4 w-4 text-blue-600" />;
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return null;
    }
  };

  const getPerformanceColor = (value: number, benchmark: number) => {
    if (value > benchmark * 1.1) return 'text-green-600';
    if (value < benchmark * 0.9) return 'text-red-600';
    return 'text-blue-600';
  };

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 80) return 'bg-green-100 text-green-800';
    if (percentile >= 60) return 'bg-blue-100 text-blue-800';
    if (percentile >= 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cohort Analysis & Benchmarking</h1>
          <p className="text-muted-foreground">
            Compare group performance and track cohort progression
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={analysisType} onValueChange={setAnalysisType}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="performance">Performance</SelectItem>
              <SelectItem value="completion">Completion</SelectItem>
              <SelectItem value="engagement">Engagement</SelectItem>
              <SelectItem value="skills">Skills</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadCohortData} disabled={loading}>
            {loading ? 'Analyzing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Cohort Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cohorts.map((cohort) => (
          <Card key={cohort.id}>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{cohort.name}</h3>
                    <p className="text-sm text-muted-foreground">{cohort.description}</p>
                  </div>
                  {getTrendIcon(cohort.trend)}
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Students</p>
                    <p className="font-medium">{cohort.activeStudents}/{cohort.totalStudents}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Completion</p>
                    <p className="font-medium">{cohort.completionRate}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Avg Score</p>
                    <p className={`font-medium ${getPerformanceColor(cohort.averageScore, cohort.benchmarkScore)}`}>
                      {cohort.averageScore}%
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">vs Benchmark</p>
                    <p className={`font-medium ${getPerformanceColor(cohort.averageScore, cohort.benchmarkScore)}`}>
                      {cohort.averageScore > cohort.benchmarkScore ? '+' : ''}{(cohort.averageScore - cohort.benchmarkScore).toFixed(1)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="comparison" className="space-y-4">
        <TabsList>
          <TabsTrigger value="comparison">Cohort Comparison</TabsTrigger>
          <TabsTrigger value="progression">Performance Trends</TabsTrigger>
          <TabsTrigger value="students">Student Progression</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarking</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cohort Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisons.filter(c => c.metric === 'Average Score')}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="cohortName" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2563eb" name="Cohort Score" />
                    <Bar dataKey="benchmark" fill="#16a34a" name="Benchmark" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['Average Score', 'Completion Rate'].map((metric) => (
              <Card key={metric}>
                <CardHeader>
                  <CardTitle className="text-lg">{metric} Percentiles</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {comparisons
                      .filter(c => c.metric === metric)
                      .sort((a, b) => b.percentile - a.percentile)
                      .map((comparison) => (
                        <div key={comparison.cohortId} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="font-medium">{comparison.cohortName}</span>
                            <Badge 
                              variant="secondary" 
                              className={getPercentileColor(comparison.percentile)}
                            >
                              {comparison.percentile}th percentile
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{comparison.value}{metric === 'Completion Rate' ? '%' : '%'}</p>
                            <p className="text-xs text-muted-foreground">
                              Benchmark: {comparison.benchmark}{metric === 'Completion Rate' ? '%' : '%'}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="progression" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="cohort1" stroke="#2563eb" name="Spring 2024" strokeWidth={2} />
                    <Line type="monotone" dataKey="cohort2" stroke="#dc2626" name="Winter 2024" strokeWidth={2} />
                    <Line type="monotone" dataKey="cohort3" stroke="#16a34a" name="Fall 2023" strokeWidth={2} />
                    <Line type="monotone" dataKey="benchmark" stroke="#6b7280" strokeDasharray="5 5" name="Benchmark" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <div className="grid gap-4">
            {progressions.map((student) => (
              <Card key={student.studentId}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{student.studentName}</h3>
                        <Badge 
                          variant="secondary" 
                          className={student.improvement > 15 ? 'bg-green-100 text-green-800' : 
                                   student.improvement > 5 ? 'bg-blue-100 text-blue-800' : 
                                   'bg-yellow-100 text-yellow-800'}
                        >
                          {student.improvement > 0 ? '+' : ''}{student.improvement}% improvement
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Initial Score</p>
                          <p className="font-medium">{student.initialScore}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Current Score</p>
                          <p className="font-medium">{student.currentScore}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Time to Complete</p>
                          <p className="font-medium">{student.timeToComplete} weeks</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-green-700 mb-1">Strengths:</p>
                          <div className="space-y-1">
                            {student.strengths.map((strength, index) => (
                              <Badge key={index} variant="secondary" className="bg-green-100 text-green-800 mr-1">
                                {strength}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="font-medium text-orange-700 mb-1">Areas to Improve:</p>
                          <div className="space-y-1">
                            {student.strugglingAreas.map((area, index) => (
                              <Badge key={index} variant="secondary" className="bg-orange-100 text-orange-800 mr-1">
                                {area}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {student.improvement > 0 ? '+' : ''}{student.improvement}%
                      </div>
                      <p className="text-xs text-muted-foreground">Total improvement</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="benchmarks" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Industry Benchmarks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Completion Rate</span>
                    <div className="text-right">
                      <p className="font-medium">85%</p>
                      <p className="text-xs text-muted-foreground">Industry avg</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average Score</span>
                    <div className="text-right">
                      <p className="font-medium">78%</p>
                      <p className="text-xs text-muted-foreground">Industry avg</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Time to Complete</span>
                    <div className="text-right">
                      <p className="font-medium">10 weeks</p>
                      <p className="text-xs text-muted-foreground">Industry avg</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart data={[
                      { x: 65, y: 70, z: 45 },
                      { x: 75, y: 80, z: 38 },
                      { x: 85, y: 90, z: 52 }
                    ]}>
                      <CartesianGrid />
                      <XAxis dataKey="x" name="Initial Score" />
                      <YAxis dataKey="y" name="Final Score" />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter dataKey="z" fill="#2563eb" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CohortAnalysisDashboard;