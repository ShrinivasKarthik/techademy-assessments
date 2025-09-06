import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { assessmentId, shareToken } = await req.json()

    if (!assessmentId || !shareToken) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Assessment ID and share token are required' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Verify share token is valid and active
    const { data: shareData, error: shareError } = await supabaseClient
      .from('assessment_shares')
      .select('assessment_id, is_active, expires_at')
      .eq('share_token', shareToken)
      .eq('assessment_id', assessmentId)
      .eq('is_active', true)
      .maybeSingle()

    if (shareError || !shareData) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid or expired share token' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // Check expiration
    if (shareData.expires_at && new Date(shareData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Share token has expired' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 410 }
      )
    }

    // Fetch full question content
    const { data: questions, error: questionsError } = await supabaseClient
      .from('questions')
      .select('*')
      .eq('assessment_id', assessmentId)
      .eq('is_active', true)
      .order('order_index')

    if (questionsError) {
      console.error('Error fetching questions:', questionsError)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to load questions' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        questions: questions || []
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
        }
      }
    )

  } catch (error) {
    console.error('Error in get-assessment-questions:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})