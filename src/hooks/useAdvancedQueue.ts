import React, { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface QueueJob {
  id: string;
  type: 'ai_analysis' | 'report_generation' | 'data_processing' | 'performance_analytics';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  data: any;
  progress: number;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface QueueMetrics {
  totalJobs: number;
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  throughput: number; // jobs per minute
}

export const useAdvancedQueue = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [metrics, setMetrics] = useState<QueueMetrics>({
    totalJobs: 0,
    pendingJobs: 0,
    processingJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    averageProcessingTime: 0,
    throughput: 0
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const processingInterval = useRef<NodeJS.Timeout | null>(null);

  const addJob = useCallback((
    type: QueueJob['type'],
    data: any,
    priority: QueueJob['priority'] = 'medium',
    maxRetries: number = 3
  ) => {
    const newJob: QueueJob = {
      id: crypto.randomUUID(),
      type,
      priority,
      status: 'pending',
      data,
      progress: 0,
      retryCount: 0,
      maxRetries,
      createdAt: new Date()
    };

    setJobs(prev => {
      const updated = [...prev, newJob];
      // Sort by priority: critical > high > medium > low
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return updated.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
    });

    return newJob.id;
  }, []);

  const updateJobStatus = useCallback((
    jobId: string,
    status: QueueJob['status'],
    progress?: number,
    error?: string
  ) => {
    setJobs(prev => prev.map(job => {
      if (job.id === jobId) {
        const updatedJob = {
          ...job,
          status,
          progress: progress ?? job.progress,
          error
        };

        if (status === 'processing' && !job.startedAt) {
          updatedJob.startedAt = new Date();
        }

        if (status === 'completed' || status === 'failed') {
          updatedJob.completedAt = new Date();
        }

        return updatedJob;
      }
      return job;
    }));
  }, []);

  const retryJob = useCallback((jobId: string) => {
    setJobs(prev => prev.map(job => {
      if (job.id === jobId && job.retryCount < job.maxRetries) {
        return {
          ...job,
          status: 'pending',
          retryCount: job.retryCount + 1,
          error: undefined,
          progress: 0
        };
      }
      return job;
    }));
  }, []);

  const processJob = useCallback(async (job: QueueJob): Promise<void> => {
    updateJobStatus(job.id, 'processing', 0);

    try {
      let result;
      
      switch (job.type) {
        case 'ai_analysis':
          result = await supabase.functions.invoke('enhanced-ai-generator', {
            body: job.data
          });
          break;
        case 'report_generation':
          result = await supabase.functions.invoke('enhanced-report-generator', {
            body: job.data
          });
          break;
        case 'performance_analytics':
          result = await supabase.functions.invoke('enhanced-performance-analytics', {
            body: job.data
          });
          break;
        case 'data_processing':
          result = await supabase.functions.invoke('enhanced-monitoring-system', {
            body: job.data
          });
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      // Simulate progress updates
      for (let progress = 25; progress <= 100; progress += 25) {
        updateJobStatus(job.id, 'processing', progress);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      updateJobStatus(job.id, 'completed', 100);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (job.retryCount < job.maxRetries) {
        updateJobStatus(job.id, 'retrying', job.progress, errorMessage);
        // Auto-retry after delay
        setTimeout(() => retryJob(job.id), 2000 * Math.pow(2, job.retryCount));
      } else {
        updateJobStatus(job.id, 'failed', job.progress, errorMessage);
      }
    }
  }, [updateJobStatus, retryJob]);

  const startProcessing = useCallback(() => {
    if (isProcessing) return;

    setIsProcessing(true);
    
    processingInterval.current = setInterval(async () => {
      const pendingJob = jobs.find(job => job.status === 'pending');
      
      if (pendingJob) {
        await processJob(pendingJob);
      }
    }, 1000);
  }, [isProcessing, jobs, processJob]);

  const stopProcessing = useCallback(() => {
    setIsProcessing(false);
    
    if (processingInterval.current) {
      clearInterval(processingInterval.current);
      processingInterval.current = null;
    }
  }, []);

  const clearCompleted = useCallback(() => {
    setJobs(prev => prev.filter(job => job.status !== 'completed'));
  }, []);

  const calculateMetrics = useCallback(() => {
    const now = Date.now();
    const lastHour = now - 60 * 60 * 1000;
    
    const recentJobs = jobs.filter(job => job.createdAt.getTime() > lastHour);
    const completedJobs = jobs.filter(job => job.status === 'completed');
    
    const totalProcessingTime = completedJobs.reduce((total, job) => {
      if (job.startedAt && job.completedAt) {
        return total + (job.completedAt.getTime() - job.startedAt.getTime());
      }
      return total;
    }, 0);

    const newMetrics: QueueMetrics = {
      totalJobs: jobs.length,
      pendingJobs: jobs.filter(job => job.status === 'pending').length,
      processingJobs: jobs.filter(job => job.status === 'processing').length,
      completedJobs: completedJobs.length,
      failedJobs: jobs.filter(job => job.status === 'failed').length,
      averageProcessingTime: completedJobs.length > 0 ? totalProcessingTime / completedJobs.length : 0,
      throughput: recentJobs.filter(job => job.status === 'completed').length
    };

    setMetrics(newMetrics);
  }, [jobs]);

  // Update metrics when jobs change
  React.useEffect(() => {
    calculateMetrics();
  }, [jobs, calculateMetrics]);

  return {
    jobs,
    metrics,
    isProcessing,
    addJob,
    updateJobStatus,
    retryJob,
    startProcessing,
    stopProcessing,
    clearCompleted
  };
};