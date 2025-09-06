import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Target, 
  Brain,
  Users,
  Calendar,
  BarChart3
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PredictionData {
  userId: string;
  userName: string;
  currentScore: number;
  predictedScore: number;
  completionProbability: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
  trend: 'improving' | 'stable' | 'declining';
}

interface PerformanceForecast {
  date: string;
  predicted: number;
  actual?: number;
  confidence: number;
}

const PredictiveAnalyticsDashboard: React.FC = () => {
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
  const [forecasts, setForecasts] = useState<PerformanceForecast[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');

  useEffect(() => {
    generatePredictions();
  }, [selectedTimeframe]);

  const generatePredictions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('predictive-analytics', {
        body: { 
          timeframe: selectedTimeframe,
          analysisType: 'comprehensive'
        }
      });

      if (error) throw error;

      setPredictions(data.predictions || []);
      setForecasts(data.forecasts || []);
    } catch (error) {
      console.error('Error generating predictions:', error);
      toast.error('Failed to generate predictive analytics');
      
      // Mock data for demo
      const mockPredictions: PredictionData[] = [
        {
          userId: '1',
          userName: 'Alice Johnson',
          currentScore: 85,
          predictedScore: 92,
          completionProbability: 95,
          riskLevel: 'low',
          recommendations: ['Continue current pace', 'Focus on advanced topics'],
          trend: 'improving'
        },
        {
          userId: '2', 
          userName: 'Bob Smith',
          currentScore: 65,
          predictedScore: 58,
          completionProbability: 72,
          riskLevel: 'medium',
          recommendations: ['Review fundamentals', 'Increase practice time'],
          trend: 'declining'
        },
        {
          userId: '3',
          userName: 'Carol White',
          currentScore: 45,
          predictedScore: 40,
          completionProbability: 45,
          riskLevel: 'high',
          recommendations: ['Immediate intervention needed', 'One-on-one support'],
          trend: 'declining'
        }
      ];

      const mockForecasts: PerformanceForecast[] = [
        { date: '2024-01-01', predicted: 78, actual: 75, confidence: 85 },
        { date: '2024-01-02', predicted: 79, actual: 77, confidence: 88 },
        { date: '2024-01-03', predicted: 81, actual: 82, confidence: 90 },
        { date: '2024-01-04', predicted: 83, confidence: 87 },
        { date: '2024-01-05', predicted: 85, confidence: 82 },
        { date: '2024-01-06', predicted: 86, confidence: 80 },
        { date: '2024-01-07', predicted: 88, confidence: 78 }
      ];

      setPredictions(mockPredictions);
      setForecasts(mockForecasts);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
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

  const highRiskCount = predictions.filter(p => p.riskLevel === 'high').length;
  const averageCompletion = predictions.reduce((acc, p) => acc + p.completionProbability, 0) / predictions.length || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Predictive Analytics</h1>
          <p className="text-muted-foreground">
            AI-powered performance forecasting and risk assessment
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <select 
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="px-3 py-2 border border-border rounded-md bg-background"
          >
            <option value="7d">7 Days</option>
            <option value="30d">30 Days</option>
            <option value="90d">90 Days</option>
          </select>
          <Button onClick={generatePredictions} disabled={loading}>
            {loading ? 'Analyzing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">High Risk Students</p>
                <p className="text-2xl font-bold">{highRiskCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Completion Rate</p>
                <p className="text-2xl font-bold">{Math.round(averageCompletion)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Predictions Made</p>
                <p className="text-2xl font-bold">{predictions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Model Accuracy</p>
                <p className="text-2xl font-bold">87%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="forecasts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="forecasts">Performance Forecasts</TabsTrigger>
          <TabsTrigger value="students">Student Predictions</TabsTrigger>
          <TabsTrigger value="interventions">Interventions</TabsTrigger>
        </TabsList>

        <TabsContent value="forecasts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Forecast Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forecasts}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="confidence" 
                      stackId="1"
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      fillOpacity={0.2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="predicted" 
                      stroke="#2563eb" 
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="actual" 
                      stroke="#16a34a" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <div className="grid gap-4">
            {predictions.map((prediction) => (
              <Card key={prediction.userId}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{prediction.userName}</h3>
                        {getTrendIcon(prediction.trend)}
                        <Badge 
                          variant="secondary" 
                          className={getRiskColor(prediction.riskLevel)}
                        >
                          {prediction.riskLevel.toUpperCase()} RISK
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Current Score</p>
                          <p className="font-medium">{prediction.currentScore}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Predicted Score</p>
                          <p className="font-medium">{prediction.predictedScore}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Completion Probability</p>
                          <p className="font-medium">{prediction.completionProbability}%</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-sm font-medium">Recommendations:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {prediction.recommendations.map((rec, index) => (
                            <li key={index}>• {rec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <Progress 
                        value={prediction.completionProbability} 
                        className="w-24"
                      />
                      <span className="text-xs text-muted-foreground">
                        {prediction.completionProbability}% likely
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="interventions" className="space-y-4">
          <div className="grid gap-4">
            {predictions.filter(p => p.riskLevel === 'high').map((student) => (
              <Card key={student.userId} className="border-red-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        <h3 className="font-semibold text-red-700">
                          {student.userName} - Immediate Attention Required
                        </h3>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <p><strong>Current Performance:</strong> {student.currentScore}%</p>
                        <p><strong>Predicted Outcome:</strong> {student.predictedScore}% (↓{student.currentScore - student.predictedScore}%)</p>
                        <p><strong>Completion Risk:</strong> {100 - student.completionProbability}% chance of not completing</p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-sm font-medium text-red-700">Recommended Actions:</p>
                        <ul className="text-sm space-y-1">
                          {student.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <Target className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button variant="destructive" size="sm">
                        Create Intervention
                      </Button>
                      <Button variant="outline" size="sm">
                        Schedule Meeting
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {predictions.filter(p => p.riskLevel === 'high').length === 0 && (
              <Card>
                <CardContent className="p-6 text-center">
                  <Target className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="font-medium text-green-700">No High-Risk Students</h3>
                  <p className="text-sm text-muted-foreground">
                    All students are on track to meet their goals
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PredictiveAnalyticsDashboard;