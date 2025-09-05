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
    // Basic rate limiting - check for recent requests from same IP
    const clientIP = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown'
    console.log('Request from IP:', clientIP)

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    let shareToken: string;
    
    // Handle both URL parameter and request body methods
    const url = new URL(req.url)
    const urlToken = url.pathname.split('/').pop()
    
    if (req.method === 'POST') {
      const body = await req.json()
      shareToken = body.token || urlToken
    } else {
      shareToken = urlToken || ''
    }

    if (!shareToken) {
      return new Response(
        JSON.stringify({ error: 'Share token is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('Retrieving shared assessment with token:', shareToken)

    // Get the share record and validate it
    const { data: shareData, error: shareError } = await supabaseClient
      .from('assessment_shares')
      .select(`
        *,
        assessment:assessments (
          id, title, description, instructions, duration_minutes, 
          proctoring_enabled, proctoring_config,
          questions (*)
        )
      `)
      .eq('share_token', shareToken)
      .eq('is_active', true)
      .single()

    if (shareError || !shareData) {
      console.error('Share not found or inactive:', shareError)
      return new Response(
        JSON.stringify({ error: 'Invalid or expired share link' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Check if share has expired
    if (shareData.expires_at && new Date(shareData.expires_at) < new Date()) {
      console.log('Share has expired:', shareData.expires_at)
      return new Response(
        JSON.stringify({ error: 'This share link has expired' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 410 }
      )
    }

    // Check if max attempts reached
    if (shareData.max_attempts && shareData.access_count >= shareData.max_attempts) {
      console.log('Max attempts reached:', shareData.access_count, '>=', shareData.max_attempts)
      return new Response(
        JSON.stringify({ error: 'Maximum number of attempts reached for this assessment' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      )
    }

    const assessment = shareData.assessment

    if (!assessment) {
      console.error('Assessment not found for share')
      return new Response(
        JSON.stringify({ error: 'Assessment not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Return the assessment data for public access
    const responseData = {
      success: true,
      shareToken: shareToken,
      assessment: {
        id: assessment.id,
        title: assessment.title,
        description: assessment.description,
        instructions: assessment.instructions,
        duration_minutes: assessment.duration_minutes,
        proctoring_enabled: assessment.proctoring_enabled,
        proctoring_config: assessment.proctoring_config,
        question_count: assessment.questions?.length || 0,
        questions: assessment.questions || []
      },
      shareConfig: {
        requireName: shareData.require_name,
        requireEmail: shareData.require_email,
        allowAnonymous: shareData.allow_anonymous,
        maxAttempts: shareData.max_attempts,
        expiresAt: shareData.expires_at,
        accessCount: shareData.access_count,
        completionCount: shareData.completion_count
      }
    }

    console.log('Share retrieved successfully for assessment:', assessment.id)

    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error retrieving shared assessment:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to retrieve shared assessment: ' + error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})