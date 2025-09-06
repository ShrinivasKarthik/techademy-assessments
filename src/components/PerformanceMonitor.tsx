import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Activity, 
  Database, 
  Server, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
  Clock
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface PerformanceMetric {
  timestamp: string;
  responseTime: number;
  throughput: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
}

interface QueryAnalysis {
  query: string;
  avgDuration: number;
  executions: number;
  impact: 'high' | 'medium' | 'low';
  recommendations: string[];
}

const PerformanceMonitor = () => {
  const { toast } = useToast();
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [queryAnalyses, setQueryAnalyses] = useState<QueryAnalysis[]>([]);

  useEffect(() => {
    // Generate mock performance data
    const generateMetrics = () => {
      const now = new Date();
      const newMetrics: PerformanceMetric[] = [];
      
      for (let i = 23; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
        newMetrics.push({
          timestamp: timestamp.toISOString(),
          responseTime: Math.random() * 100 + 50,
          throughput: Math.random() * 1000 + 500,
          errorRate: Math.random() * 5,
          cpuUsage: Math.random() * 80 + 10,
          memoryUsage: Math.random() * 70 + 20
        });
      }
      
      setMetrics(newMetrics);
    };

    // Generate mock query analysis data
    const generateQueryAnalyses = () => {
      setQueryAnalyses([
        {
          query: "SELECT * FROM assessments WHERE status = 'published'",
          avgDuration: 245,
          executions: 1250,
          impact: 'medium',
          recommendations: ['Add index on status column', 'Consider query result caching']
        },
        {
          query: "SELECT submissions.*, questions.title FROM submissions JOIN questions...",
          avgDuration: 890,
          executions: 456,
          impact: 'high',
          recommendations: ['Optimize JOIN query', 'Add composite index', 'Consider query pagination']
        },
        {
          query: "UPDATE assessment_instances SET time_remaining = ?",
          avgDuration: 34,
          executions: 3400,
          impact: 'low',
          recommendations: ['Query is well optimized']
        }
      ]);
    };

    generateMetrics();
    generateQueryAnalyses();

    const interval = setInterval(() => {
      if (isMonitoring) {
        generateMetrics();
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [isMonitoring]);

  const currentMetrics = metrics[metrics.length - 1];
  const avgResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length;
  const avgThroughput = metrics.reduce((sum, m) => sum + m.throughput, 0) / metrics.length;

  const handleOptimizeQuery = (query: string) => {
    toast({
      title: "Query Optimization Started",
      description: `Analyzing and optimizing query: ${query.substring(0, 50)}...`
    });

    setTimeout(() => {
      toast({
        title: "Query Optimized",
        description: "Query performance improved by 40%"
      });
    }, 3000);
  };

  const handleRefreshMetrics = () => {
    toast({
      title: "Refreshing Metrics",
      description: "Collecting latest performance data..."
    });
    
    setTimeout(() => {
      setMetrics(prev => [...prev.slice(1), {
        timestamp: new Date().toISOString(),
        responseTime: Math.random() * 100 + 50,
        throughput: Math.random() * 1000 + 500,
        errorRate: Math.random() * 5,
        cpuUsage: Math.random() * 80 + 10,
        memoryUsage: Math.random() * 70 + 20
      }]);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">Performance Monitor</h1>
              <p className="text-muted-foreground">Database and system performance analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleRefreshMetrics}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button
              variant={isMonitoring ? "destructive" : "default"}
              onClick={() => setIsMonitoring(!isMonitoring)}
              className="flex items-center gap-2"
            >
              {isMonitoring ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
              {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
            </Button>
          </div>
        </div>

        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMetrics ? Math.round(currentMetrics.responseTime) : 0}ms</div>
              <p className="text-xs text-muted-foreground">
                Avg: {Math.round(avgResponseTime)}ms
              </p>
              <Progress value={(currentMetrics?.responseTime || 0) / 2} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Throughput</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMetrics ? Math.round(currentMetrics.throughput) : 0} req/s</div>
              <p className="text-xs text-muted-foreground">
                Avg: {Math.round(avgThroughput)} req/s
              </p>
              <Progress value={(currentMetrics?.throughput || 0) / 15} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMetrics ? currentMetrics.errorRate.toFixed(1) : 0}%</div>
              <p className="text-xs text-muted-foreground">
                Last 24 hours
              </p>
              <Progress value={currentMetrics?.errorRate || 0} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMetrics ? Math.round(currentMetrics.cpuUsage) : 0}%</div>
              <p className="text-xs text-muted-foreground">
                Memory: {currentMetrics ? Math.round(currentMetrics.memoryUsage) : 0}%
              </p>
              <Progress value={currentMetrics?.cpuUsage || 0} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="performance">Performance Charts</TabsTrigger>
            <TabsTrigger value="queries">Query Analysis</TabsTrigger>
            <TabsTrigger value="optimization">Optimization</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Response Time Trend</CardTitle>
                  <CardDescription>Average response time over the last 24 hours</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={metrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleString()}
                        formatter={(value: number) => [`${Math.round(value)}ms`, 'Response Time']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="responseTime" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Throughput & Error Rate</CardTitle>
                  <CardDescription>Request throughput and error rate metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={metrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleString()}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="throughput" 
                        stroke="hsl(var(--secondary))" 
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="errorRate" 
                        stroke="hsl(var(--destructive))" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="queries" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Slow Query Analysis
                </CardTitle>
                <CardDescription>
                  Identify and optimize performance bottlenecks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {queryAnalyses.map((analysis, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            analysis.impact === 'high' ? 'destructive' :
                            analysis.impact === 'medium' ? 'secondary' : 'default'
                          }>
                            {analysis.impact} impact
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {analysis.avgDuration}ms avg
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {analysis.executions} executions
                          </span>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => handleOptimizeQuery(analysis.query)}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Optimize
                        </Button>
                      </div>
                      
                      <div className="bg-muted p-3 rounded font-mono text-sm">
                        {analysis.query}
                      </div>
                      
                      <div>
                        <h5 className="font-medium mb-2">Recommendations:</h5>
                        <ul className="space-y-1">
                          {analysis.recommendations.map((rec, recIndex) => (
                            <li key={recIndex} className="text-sm text-muted-foreground flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-success" />
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
          </TabsContent>

          <TabsContent value="optimization" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Cache Performance</CardTitle>
                  <CardDescription>Database and application cache hit rates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Query Cache Hit Rate</span>
                      <span className="font-medium">94.2%</span>
                    </div>
                    <Progress value={94.2} />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Buffer Pool Hit Rate</span>
                      <span className="font-medium">98.7%</span>
                    </div>
                    <Progress value={98.7} />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Connection Pool Usage</span>
                      <span className="font-medium">67.3%</span>
                    </div>
                    <Progress value={67.3} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Optimization Suggestions</CardTitle>
                  <CardDescription>Automated performance recommendations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 border rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                      <div>
                        <h5 className="font-medium">Add Database Index</h5>
                        <p className="text-sm text-muted-foreground">
                          Consider adding an index on assessments.status for better query performance
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 border rounded-lg">
                      <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                      <div>
                        <h5 className="font-medium">Enable Query Caching</h5>
                        <p className="text-sm text-muted-foreground">
                          Implement Redis caching for frequently accessed assessment data
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 border rounded-lg">
                      <TrendingUp className="h-5 w-5 text-info mt-0.5" />
                      <div>
                        <h5 className="font-medium">Connection Pool Optimization</h5>
                        <p className="text-sm text-muted-foreground">
                          Increase connection pool size during peak hours
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default PerformanceMonitor;