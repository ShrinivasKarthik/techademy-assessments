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
    const { sourceQuestionId, targetQuestionId, overwrite = false } = await req.json();

    if (!sourceQuestionId || !targetQuestionId) {
      return new Response(JSON.stringify({ error: 'sourceQuestionId and targetQuestionId are required' }), {
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

    // Check if target already has files
    const { data: existingTargetFiles, error: targetErr } = await supabase
      .from('project_files')
      .select('id')
      .eq('question_id', targetQuestionId)
      .limit(1);

    if (targetErr) {
      console.error('Target check error:', targetErr);
      return new Response(JSON.stringify({ error: 'Failed to check target files' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (existingTargetFiles && existingTargetFiles.length > 0 && !overwrite) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Target already has files. Skipping clone (set overwrite=true to force).',
        clonedCount: 0
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Optionally clear target if overwrite requested
    if (overwrite) {
      await supabase.from('project_files').delete().eq('question_id', targetQuestionId);
    }

    // Fetch all source files
    const { data: sourceFiles, error: srcErr } = await supabase
      .from('project_files')
      .select('*')
      .eq('question_id', sourceQuestionId)
      .order('order_index', { ascending: true });

    if (srcErr) {
      console.error('Source fetch error:', srcErr);
      return new Response(JSON.stringify({ error: 'Failed to load source files' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const files = sourceFiles || [];
    if (files.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No source files to clone', clonedCount: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Clone folders first, then files to preserve parent relationships
    const folders = files.filter(f => f.is_folder);
    const regularFiles = files.filter(f => !f.is_folder);

    const idMap = new Map<string, string>();
    let clonedCount = 0;

    const insertAndMap = async (file: any) => {
      const payload: any = {
        question_id: targetQuestionId,
        file_name: file.file_name,
        file_path: file.file_path,
        file_content: file.file_content,
        file_language: file.file_language,
        is_folder: file.is_folder,
        is_main_file: file.is_main_file,
        order_index: file.order_index,
        parent_folder_id: file.parent_folder_id ? idMap.get(file.parent_folder_id) || null : null,
      };

      const { data, error } = await supabase
        .from('project_files')
        .insert(payload)
        .select('id')
        .single();

      if (error) throw error;
      idMap.set(file.id, data.id);
      clonedCount += 1;
    };

    try {
      for (const folder of folders) {
        await insertAndMap(folder);
      }
      for (const f of regularFiles) {
        await insertAndMap(f);
      }
    } catch (e) {
      console.error('Clone failure:', e);
      return new Response(JSON.stringify({ error: 'Failed to clone project files' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, clonedCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('clone-project-files error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});