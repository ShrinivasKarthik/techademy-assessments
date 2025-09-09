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
    const { shareToken } = await req.json();
    
    console.log('Cleaning up stuck instances for token:', shareToken);

    // Call the cleanup function
    const { data: cleanupResult, error: cleanupError } = await supabase
      .rpc('cleanup_stuck_assessment_instances', { p_share_token: shareToken });
    
    if (cleanupError) {
      console.error('Cleanup error:', cleanupError);
      throw cleanupError;
    }

    console.log('Cleanup completed:', cleanupResult);
    
    const result = cleanupResult && cleanupResult.length > 0 ? cleanupResult[0] : null;

    return new Response(JSON.stringify({ 
      success: true,
      cleaned_count: result?.cleaned_count || 0,
      message: result?.message || 'No stuck instances found'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in cleanup function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});