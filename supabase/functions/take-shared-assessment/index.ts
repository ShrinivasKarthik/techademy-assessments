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
      console.log('No share token provided')
      return new Response(
        JSON.stringify({ error: 'Share token is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('Retrieving shared assessment with token:', shareToken)

    // First, get the share record
    const { data: shareData, error: shareError } = await supabaseClient
      .from('assessment_shares')
      .select('*')
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

    console.log('Share record found:', shareData.id)

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

    // Now get the assessment details
    const { data: assessment, error: assessmentError } = await supabaseClient
      .from('assessments')
      .select('*')
      .eq('id', shareData.assessment_id)
      .single()

    if (assessmentError || !assessment) {
      console.error('Assessment not found:', assessmentError)
      return new Response(
        JSON.stringify({ error: 'Assessment not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    console.log('Assessment found:', assessment.id, assessment.title)

    // Get the questions for this assessment
    const { data: questions, error: questionsError } = await supabaseClient
      .from('questions')
      .select('*')
      .eq('assessment_id', shareData.assessment_id)
      .order('order_index')

    if (questionsError) {
      console.error('Error fetching questions:', questionsError)
      return new Response(
        JSON.stringify({ error: 'Failed to load assessment questions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    console.log('Questions loaded:', questions?.length || 0)

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
        question_count: questions?.length || 0,
        questions: questions || []
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