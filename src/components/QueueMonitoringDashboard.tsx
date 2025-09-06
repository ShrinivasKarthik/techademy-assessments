import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAdvancedQueue } from '@/hooks/useAdvancedQueue';
import { useCircuitBreaker } from '@/hooks/useCircuitBreaker';
import { useToast } from '@/hooks/use-toast';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Trash2, 
  Clock, 
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';

const QueueMonitoringDashboard = () => {
  const { toast } = useToast();
  const {
    jobs,
    metrics,
    isProcessing,
    addJob,
    startProcessing,
    stopProcessing,
    clearCompleted
  } = useAdvancedQueue();

  const circuitBreaker = useCircuitBreaker('queue-processing', {
    failureThreshold: 3,
    recoveryTimeout: 30000,
    monitoringWindow: 60000
  });

  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Auto-refresh happens through the hooks
    }, 2000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleAddTestJob = () => {
    const jobTypes = ['ai_analysis', 'report_generation', 'data_processing', 'performance_analytics'] as const;
    const priorities = ['low', 'medium', 'high', 'critical'] as const;
    
    const randomType = jobTypes[Math.floor(Math.random() * jobTypes.length)];
    const randomPriority = priorities[Math.floor(Math.random() * priorities.length)];
    
    const jobId = addJob(randomType, {
      testData: `Test ${randomType} job`,
      timestamp: Date.now()
    }, randomPriority);

    toast({
      title: "Job Added",
      description: `Test ${randomType} job added with ${randomPriority} priority`,
      variant: "default"
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'processing':
        return <Activity className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'retrying':
        return <RotateCcw className="w-4 h-4 text-orange-500" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'processing': return 'default';
      case 'completed': return 'secondary';
      case 'failed': return 'destructive';
      case 'retrying': return 'secondary';
      default: return 'secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'secondary';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Queue Monitoring</h2>
          <p className="text-muted-foreground">
            Monitor and manage the advanced job processing queue
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto Refresh' : 'Manual'}
          </Button>
          <Button onClick={handleAddTestJob} variant="outline">
            Add Test Job
          </Button>
          {isProcessing ? (
            <Button onClick={stopProcessing} variant="destructive" className="gap-2">
              <Pause className="w-4 h-4" />
              Stop Processing
            </Button>
          ) : (
            <Button onClick={startProcessing} className="gap-2">
              <Play className="w-4 h-4" />
              Start Processing
            </Button>
          )}
        </div>
      </div>

      {/* Queue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalJobs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Jobs</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingJobs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.processingJobs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Throughput</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.throughput}</div>
            <p className="text-xs text-muted-foreground">jobs/minute</p>
          </CardContent>
        </Card>
      </div>

      {/* Circuit Breaker Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Circuit Breaker Status
          </CardTitle>
          <CardDescription>
            Monitors system health and prevents cascade failures
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={circuitBreaker.metrics.state === 'closed' ? 'secondary' : 'destructive'}>
                  {circuitBreaker.metrics.state.toUpperCase()}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  State: {circuitBreaker.metrics.state}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Failures: {circuitBreaker.metrics.failureCount} / Success: {circuitBreaker.metrics.successCount}
              </div>
              <div className="text-sm text-muted-foreground">
                Failure Rate: {(circuitBreaker.metrics.failureRate * 100).toFixed(1)}%
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={circuitBreaker.forceClose}>
                Force Close
              </Button>
              <Button size="sm" variant="outline" onClick={circuitBreaker.reset}>
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job Queue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Job Queue</CardTitle>
            <CardDescription>
              Current jobs in the processing queue
            </CardDescription>
          </div>
          <Button onClick={clearCompleted} variant="outline" size="sm" className="gap-2">
            <Trash2 className="w-4 h-4" />
            Clear Completed
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {jobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No jobs in queue
              </div>
            ) : (
              jobs.slice(0, 10).map((job) => (
                <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(job.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{job.type}</span>
                        <Badge variant={getPriorityColor(job.priority)} className="text-xs">
                          {job.priority}
                        </Badge>
                        <Badge variant={getStatusColor(job.status)} className="text-xs">
                          {job.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Created: {job.createdAt.toLocaleTimeString()}
                        {job.retryCount > 0 && ` • Retry ${job.retryCount}/${job.maxRetries}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {job.status === 'processing' && (
                      <div className="w-24">
                        <Progress value={job.progress} className="h-2" />
                      </div>
                    )}
                    <span className="text-sm font-mono text-muted-foreground">
                      {job.id.slice(0, 8)}
                    </span>
                  </div>
                </div>
              ))
            )}
            {jobs.length > 10 && (
              <div className="text-center text-sm text-muted-foreground">
                ... and {jobs.length - 10} more jobs
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QueueMonitoringDashboard;