import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduledReport {
  id: string;
  name: string;
  templateId: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  schedule: string; // cron expression
  recipients: string[];
  isActive: boolean;
  lastRun?: string;
  nextRun: string;
  createdBy: string;
  reportConfig: any;
}

interface ReportExecution {
  id: string;
  scheduledReportId: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  downloadUrl?: string;
  error?: string;
}

// In-memory storage (in production, use a database)
const scheduledReports = new Map<string, ScheduledReport>();
const reportExecutions = new Map<string, ReportExecution>();

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

    const { action, ...params } = await req.json();

    switch (action) {
      case 'create_schedule':
        return await createSchedule(params.schedule);
      
      case 'update_schedule':
        return await updateSchedule(params.scheduleId, params.updates);
      
      case 'delete_schedule':
        return await deleteSchedule(params.scheduleId);
      
      case 'list_schedules':
        return await listSchedules(params.userId);
      
      case 'trigger_report':
        return await triggerReport(params.scheduleId, supabaseClient);
      
      case 'check_due_reports':
        return await checkDueReports(supabaseClient);
      
      case 'get_executions':
        return await getExecutions(params.scheduleId);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Error in report scheduler:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function createSchedule(scheduleData: Partial<ScheduledReport>) {
  const schedule: ScheduledReport = {
    id: crypto.randomUUID(),
    name: scheduleData.name!,
    templateId: scheduleData.templateId!,
    frequency: scheduleData.frequency!,
    schedule: generateCronExpression(scheduleData.frequency!),
    recipients: scheduleData.recipients || [],
    isActive: true,
    nextRun: calculateNextRun(scheduleData.frequency!),
    createdBy: scheduleData.createdBy!,
    reportConfig: scheduleData.reportConfig || {}
  };

  scheduledReports.set(schedule.id, schedule);

  console.log(`Created scheduled report: ${schedule.name} (${schedule.id})`);

  return new Response(
    JSON.stringify({ schedule }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function updateSchedule(scheduleId: string, updates: Partial<ScheduledReport>) {
  const schedule = scheduledReports.get(scheduleId);
  
  if (!schedule) {
    return new Response(
      JSON.stringify({ error: 'Schedule not found' }),
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  const updatedSchedule = { ...schedule, ...updates };
  
  // Recalculate next run if frequency changed
  if (updates.frequency) {
    updatedSchedule.schedule = generateCronExpression(updates.frequency);
    updatedSchedule.nextRun = calculateNextRun(updates.frequency);
  }

  scheduledReports.set(scheduleId, updatedSchedule);

  return new Response(
    JSON.stringify({ schedule: updatedSchedule }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function deleteSchedule(scheduleId: string) {
  const deleted = scheduledReports.delete(scheduleId);
  
  if (!deleted) {
    return new Response(
      JSON.stringify({ error: 'Schedule not found' }),
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function listSchedules(userId?: string) {
  const schedules = Array.from(scheduledReports.values());
  const filteredSchedules = userId 
    ? schedules.filter(s => s.createdBy === userId)
    : schedules;

  return new Response(
    JSON.stringify({ schedules: filteredSchedules }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function triggerReport(scheduleId: string, supabaseClient: any) {
  const schedule = scheduledReports.get(scheduleId);
  
  if (!schedule) {
    return new Response(
      JSON.stringify({ error: 'Schedule not found' }),
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  const execution: ReportExecution = {
    id: crypto.randomUUID(),
    scheduledReportId: scheduleId,
    status: 'running',
    startedAt: new Date().toISOString()
  };

  reportExecutions.set(execution.id, execution);

  try {
    // Generate the report
    const { data, error } = await supabaseClient.functions.invoke('enhanced-report-generator', {
      body: {
        templateId: schedule.templateId,
        config: schedule.reportConfig,
        scheduled: true,
        recipients: schedule.recipients
      }
    });

    if (error) {
      throw new Error(error.message);
    }

    // Update execution with success
    execution.status = 'completed';
    execution.completedAt = new Date().toISOString();
    execution.downloadUrl = data.downloadUrl;

    // Update schedule with last run info
    schedule.lastRun = new Date().toISOString();
    schedule.nextRun = calculateNextRun(schedule.frequency);
    scheduledReports.set(scheduleId, schedule);

    console.log(`Report generated successfully for schedule ${scheduleId}`);

    // Send email notifications if recipients are configured
    if (schedule.recipients.length > 0) {
      await sendReportNotifications(schedule, execution, data);
    }

  } catch (error) {
    console.error(`Report generation failed for schedule ${scheduleId}:`, error);
    
    execution.status = 'failed';
    execution.completedAt = new Date().toISOString();
    execution.error = error.message;
  }

  reportExecutions.set(execution.id, execution);

  return new Response(
    JSON.stringify({ execution }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function checkDueReports(supabaseClient: any) {
  const now = new Date();
  const dueReports = Array.from(scheduledReports.values()).filter(schedule => {
    if (!schedule.isActive) return false;
    
    const nextRun = new Date(schedule.nextRun);
    return nextRun <= now;
  });

  const results = [];

  for (const schedule of dueReports) {
    try {
      const response = await triggerReport(schedule.id, supabaseClient);
      const { execution } = await response.json();
      results.push({ scheduleId: schedule.id, success: true, execution });
    } catch (error) {
      console.error(`Failed to trigger scheduled report ${schedule.id}:`, error);
      results.push({ scheduleId: schedule.id, success: false, error: error.message });
    }
  }

  return new Response(
    JSON.stringify({ processedReports: results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getExecutions(scheduleId?: string) {
  const executions = Array.from(reportExecutions.values());
  const filteredExecutions = scheduleId 
    ? executions.filter(e => e.scheduledReportId === scheduleId)
    : executions;

  // Sort by start time, most recent first
  filteredExecutions.sort((a, b) => 
    new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  return new Response(
    JSON.stringify({ executions: filteredExecutions }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function generateCronExpression(frequency: ScheduledReport['frequency']): string {
  switch (frequency) {
    case 'daily':
      return '0 9 * * *'; // 9 AM daily
    case 'weekly':
      return '0 9 * * 1'; // 9 AM every Monday
    case 'monthly':
      return '0 9 1 * *'; // 9 AM on the 1st of each month
    case 'quarterly':
      return '0 9 1 */3 *'; // 9 AM on the 1st of every 3rd month
    default:
      throw new Error(`Unknown frequency: ${frequency}`);
  }
}

function calculateNextRun(frequency: ScheduledReport['frequency']): string {
  const now = new Date();
  let nextRun = new Date(now);

  switch (frequency) {
    case 'daily':
      nextRun.setDate(now.getDate() + 1);
      nextRun.setHours(9, 0, 0, 0);
      break;
    case 'weekly':
      const daysUntilMonday = (1 - now.getDay() + 7) % 7;
      nextRun.setDate(now.getDate() + (daysUntilMonday || 7));
      nextRun.setHours(9, 0, 0, 0);
      break;
    case 'monthly':
      nextRun.setMonth(now.getMonth() + 1, 1);
      nextRun.setHours(9, 0, 0, 0);
      break;
    case 'quarterly':
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const nextQuarterMonth = (currentQuarter + 1) * 3;
      if (nextQuarterMonth >= 12) {
        nextRun.setFullYear(now.getFullYear() + 1, 0, 1);
      } else {
        nextRun.setMonth(nextQuarterMonth, 1);
      }
      nextRun.setHours(9, 0, 0, 0);
      break;
  }

  return nextRun.toISOString();
}

async function sendReportNotifications(
  schedule: ScheduledReport, 
  execution: ReportExecution, 
  reportData: any
) {
  // In production, integrate with an email service like SendGrid, AWS SES, etc.
  console.log(`Sending report notifications for ${schedule.name} to:`, schedule.recipients);
  
  // Mock email sending
  for (const recipient of schedule.recipients) {
    console.log(`Sending email to ${recipient}: Report "${schedule.name}" is ready`);
    // await sendEmail({
    //   to: recipient,
    //   subject: `Automated Report: ${schedule.name}`,
    //   body: `Your scheduled report "${schedule.name}" has been generated and is ready for download.`,
    //   attachment: reportData.downloadUrl
    // });
  }
}