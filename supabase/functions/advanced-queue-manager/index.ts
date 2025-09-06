import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QueueJob {
  id: string;
  type: 'ai_analysis' | 'report_generation' | 'data_processing' | 'performance_analytics';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  data: any;
  userId: string;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

// In-memory job queue (in production, use Redis or similar)
const jobQueue: QueueJob[] = [];
const activeJobs = new Map<string, boolean>();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { action, job, jobId } = await req.json();

    switch (action) {
      case 'enqueue':
        return await enqueueJob(job);
      
      case 'dequeue':
        return await dequeueJob();
      
      case 'status':
        return await getJobStatus(jobId);
      
      case 'retry':
        return await retryJob(jobId);
      
      case 'cancel':
        return await cancelJob(jobId);
      
      case 'metrics':
        return await getQueueMetrics();
      
      case 'process':
        return await processJobs(supabaseClient);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Error in queue manager:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function enqueueJob(jobData: Partial<QueueJob>) {
  const job: QueueJob = {
    id: crypto.randomUUID(),
    type: jobData.type!,
    priority: jobData.priority || 'medium',
    status: 'pending',
    data: jobData.data,
    userId: jobData.userId!,
    retryCount: 0,
    maxRetries: jobData.maxRetries || 3,
    createdAt: new Date().toISOString()
  };

  // Insert job in priority order
  const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
  let insertIndex = jobQueue.length;
  
  for (let i = 0; i < jobQueue.length; i++) {
    if (priorityOrder[job.priority] > priorityOrder[jobQueue[i].priority]) {
      insertIndex = i;
      break;
    }
  }
  
  jobQueue.splice(insertIndex, 0, job);

  console.log(`Job ${job.id} enqueued with priority ${job.priority}`);

  return new Response(
    JSON.stringify({ jobId: job.id, position: insertIndex }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function dequeueJob() {
  const job = jobQueue.find(j => j.status === 'pending');
  
  if (!job) {
    return new Response(
      JSON.stringify({ job: null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  job.status = 'processing';
  job.startedAt = new Date().toISOString();
  activeJobs.set(job.id, true);

  return new Response(
    JSON.stringify({ job }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getJobStatus(jobId: string) {
  const job = jobQueue.find(j => j.id === jobId);
  
  if (!job) {
    return new Response(
      JSON.stringify({ error: 'Job not found' }),
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  return new Response(
    JSON.stringify({ job }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function retryJob(jobId: string) {
  const job = jobQueue.find(j => j.id === jobId);
  
  if (!job) {
    return new Response(
      JSON.stringify({ error: 'Job not found' }),
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  if (job.retryCount >= job.maxRetries) {
    return new Response(
      JSON.stringify({ error: 'Max retries exceeded' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  job.status = 'pending';
  job.retryCount += 1;
  job.error = undefined;
  delete job.startedAt;
  delete job.completedAt;

  console.log(`Job ${job.id} scheduled for retry (attempt ${job.retryCount})`);

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function cancelJob(jobId: string) {
  const jobIndex = jobQueue.findIndex(j => j.id === jobId);
  
  if (jobIndex === -1) {
    return new Response(
      JSON.stringify({ error: 'Job not found' }),
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  const job = jobQueue[jobIndex];
  
  if (job.status === 'processing') {
    return new Response(
      JSON.stringify({ error: 'Cannot cancel job in progress' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  jobQueue.splice(jobIndex, 1);
  activeJobs.delete(jobId);

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getQueueMetrics() {
  const metrics = {
    totalJobs: jobQueue.length,
    pendingJobs: jobQueue.filter(j => j.status === 'pending').length,
    processingJobs: jobQueue.filter(j => j.status === 'processing').length,
    completedJobs: jobQueue.filter(j => j.status === 'completed').length,
    failedJobs: jobQueue.filter(j => j.status === 'failed').length,
    retryingJobs: jobQueue.filter(j => j.status === 'retrying').length,
    averageWaitTime: calculateAverageWaitTime(),
    throughput: calculateThroughput()
  };

  return new Response(
    JSON.stringify({ metrics }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function processJobs(supabaseClient: any) {
  const processedJobs = [];
  
  // Process up to 3 jobs concurrently
  const maxConcurrent = 3;
  const processingJobs = jobQueue.filter(j => j.status === 'processing').length;
  const availableSlots = Math.max(0, maxConcurrent - processingJobs);
  
  const pendingJobs = jobQueue
    .filter(j => j.status === 'pending')
    .slice(0, availableSlots);

  for (const job of pendingJobs) {
    try {
      const result = await executeJob(job, supabaseClient);
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      processedJobs.push({ jobId: job.id, status: 'completed', result });
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);
      
      if (job.retryCount < job.maxRetries) {
        job.status = 'retrying';
        job.error = error.message;
        // Schedule retry with exponential backoff
        setTimeout(() => {
          job.status = 'pending';
          job.retryCount += 1;
        }, Math.pow(2, job.retryCount) * 1000);
      } else {
        job.status = 'failed';
        job.error = error.message;
        job.completedAt = new Date().toISOString();
      }
      
      processedJobs.push({ jobId: job.id, status: job.status, error: error.message });
    }
    
    activeJobs.delete(job.id);
  }

  return new Response(
    JSON.stringify({ processedJobs }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function executeJob(job: QueueJob, supabaseClient: any) {
  console.log(`Executing job ${job.id} of type ${job.type}`);
  
  job.status = 'processing';
  job.startedAt = new Date().toISOString();
  
  let functionName: string;
  
  switch (job.type) {
    case 'ai_analysis':
      functionName = 'enhanced-ai-generator';
      break;
    case 'report_generation':
      functionName = 'enhanced-report-generator';
      break;
    case 'performance_analytics':
      functionName = 'enhanced-performance-analytics';
      break;
    case 'data_processing':
      functionName = 'enhanced-monitoring-system';
      break;
    default:
      throw new Error(`Unknown job type: ${job.type}`);
  }

  const { data, error } = await supabaseClient.functions.invoke(functionName, {
    body: job.data
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

function calculateAverageWaitTime(): number {
  const completedJobs = jobQueue.filter(j => j.status === 'completed' && j.startedAt && j.createdAt);
  
  if (completedJobs.length === 0) return 0;
  
  const totalWaitTime = completedJobs.reduce((sum, job) => {
    const waitTime = new Date(job.startedAt!).getTime() - new Date(job.createdAt).getTime();
    return sum + waitTime;
  }, 0);
  
  return totalWaitTime / completedJobs.length;
}

function calculateThroughput(): number {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCompletedJobs = jobQueue.filter(j => 
    j.status === 'completed' && 
    j.completedAt && 
    new Date(j.completedAt) > oneHourAgo
  );
  
  return recentCompletedJobs.length; // jobs per hour
}