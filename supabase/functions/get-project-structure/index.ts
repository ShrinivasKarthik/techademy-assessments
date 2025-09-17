import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questionId, instanceId, shareToken } = await req.json();

    if (!questionId) {
      return new Response(JSON.stringify({ error: 'questionId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Supabase environment not configured');
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Determine assessment access context
    let allowedAssessmentId: string | null = null;

    if (instanceId) {
      const { data: instance, error: instanceError } = await supabase
        .from('assessment_instances')
        .select('id, assessment_id, share_token')
        .eq('id', instanceId)
        .maybeSingle();

      if (instanceError) {
        console.error('Instance lookup error:', instanceError);
        return new Response(JSON.stringify({ error: 'Failed to validate instance' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!instance) {
        return new Response(JSON.stringify({ error: 'Instance not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      allowedAssessmentId = instance.assessment_id as string;
    } else if (shareToken) {
      // Validate share token is active
      const { data: share, error: shareError } = await supabase
        .from('assessment_shares')
        .select('assessment_id, is_active, expires_at')
        .eq('share_token', shareToken)
        .maybeSingle();

      if (shareError) {
        console.error('Share lookup error:', shareError);
        return new Response(JSON.stringify({ error: 'Failed to validate share token' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const notExpired = !share?.expires_at || new Date(share.expires_at) > new Date();
      if (!share || !share.is_active || !notExpired) {
        return new Response(JSON.stringify({ error: 'Share token is not active' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      allowedAssessmentId = share.assessment_id as string;
    }

    // If we have an assessment context, ensure the question belongs to it
    if (allowedAssessmentId) {
      const { data: question, error: questionError } = await supabase
        .from('questions')
        .select('id, assessment_id')
        .eq('id', questionId)
        .maybeSingle();

      if (questionError) {
        console.error('Question lookup error:', questionError);
        return new Response(JSON.stringify({ error: 'Failed to validate question' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!question || question.assessment_id !== allowedAssessmentId) {
        return new Response(JSON.stringify({ error: 'Question is not part of this assessment' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Fetch project files for the question
    const { data: files, error: filesError } = await supabase
      .from('project_files')
      .select('id, file_name, file_path, file_content, file_language, is_folder, is_main_file, order_index, parent_folder_id')
      .eq('question_id', questionId)
      .order('order_index');

    if (filesError) {
      console.error('Files fetch error:', filesError);
      return new Response(JSON.stringify({ error: 'Failed to load project files' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, files: files || [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('get-project-structure error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
