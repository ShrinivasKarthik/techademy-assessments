import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const { instanceId, status, submitted_at, time_remaining_seconds, duration_taken_seconds } = JSON.parse(body);
    
    console.log('Auto-submitting assessment for instance:', instanceId);

    // Update instance status to submitted
    const { error: updateError } = await supabase
      .from('assessment_instances')
      .update({
        status: 'submitted',
        submitted_at,
        time_remaining_seconds,
        duration_taken_seconds,
      })
      .eq('id', instanceId)
      .eq('status', 'in_progress'); // Only update if still in progress

    if (updateError) {
      console.error('Error updating instance:', updateError);
      throw updateError;
    }

    // Trigger evaluation in the background
    EdgeRuntime.waitUntil(
      supabase.functions.invoke('auto-evaluate-assessment', {
        body: { instanceId }
      })
    );

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error auto-submitting assessment:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});