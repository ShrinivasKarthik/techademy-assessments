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
      console.log('POST request with token:', shareToken)
    } else {
      shareToken = urlToken || ''
    }

    if (!shareToken || shareToken.length < 10) {
      console.log('Invalid share token provided:', shareToken)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Valid share token is required' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('Processing share token:', shareToken)

    // Validate and fetch share record with enhanced error handling
    const { data: shareData, error: shareError } = await supabaseClient
      .from('assessment_shares')
      .select('*')
      .eq('share_token', shareToken)
      .eq('is_active', true)
      .maybeSingle()

    if (shareError) {
      console.error('Database error fetching share:', shareError)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Database error accessing share information' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    if (!shareData) {
      console.log('No active share found for token:', shareToken)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid, expired, or inactive share link' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    console.log('Share record found:', { 
      id: shareData.id, 
      assessment_id: shareData.assessment_id,
      access_count: shareData.access_count,
      max_attempts: shareData.max_attempts
    })

    // Enhanced expiration check
    if (shareData.expires_at) {
      const expiryDate = new Date(shareData.expires_at)
      const now = new Date()
      if (expiryDate < now) {
        console.log('Share has expired:', shareData.expires_at, 'Current time:', now.toISOString())
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'This assessment link has expired',
            expiredAt: shareData.expires_at
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 410 }
        )
      }
    }

    // Enhanced attempt limit check
    if (shareData.max_attempts && shareData.access_count >= shareData.max_attempts) {
      console.log('Max attempts reached:', shareData.access_count, '>=', shareData.max_attempts)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Maximum number of assessment attempts has been reached',
          attemptsUsed: shareData.access_count,
          maxAttempts: shareData.max_attempts
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      )
    }

    // Fetch assessment with enhanced validation
    const { data: assessment, error: assessmentError } = await supabaseClient
      .from('assessments')
      .select('*')
      .eq('id', shareData.assessment_id)
      .eq('status', 'published')
      .maybeSingle()

    if (assessmentError) {
      console.error('Database error fetching assessment:', assessmentError)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Database error accessing assessment' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    if (!assessment) {
      console.log('No published assessment found for ID:', shareData.assessment_id)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Assessment not found or not available' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    console.log('Assessment found:', { 
      id: assessment.id, 
      title: assessment.title,
      status: assessment.status,
      duration: assessment.duration_minutes
    })

    // Fetch questions with enhanced validation
    const { data: questions, error: questionsError } = await supabaseClient
      .from('questions')
      .select('*')
      .eq('assessment_id', shareData.assessment_id)
      .eq('is_active', true)
      .order('order_index')

    if (questionsError) {
      console.error('Database error fetching questions:', questionsError)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to load assessment questions' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    if (!questions || questions.length === 0) {
      console.log('No active questions found for assessment:', shareData.assessment_id)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Assessment has no available questions' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 422 }
      )
    }

    console.log('Questions loaded:', questions.length)

    // Increment access count
    try {
      const { error: updateError } = await supabaseClient
        .from('assessment_shares')
        .update({ access_count: shareData.access_count + 1 })
        .eq('id', shareData.id)

      if (updateError) {
        console.error('Error updating access count:', updateError)
        // Don't fail the request for this
      }
    } catch (err) {
      console.error('Error incrementing access count:', err)
      // Don't fail the request for this
    }

    // Enhanced response data
    const responseData = {
      success: true,
      shareToken: shareToken,
      assessment: {
        id: assessment.id,
        title: assessment.title,
        description: assessment.description,
        instructions: assessment.instructions,
        duration_minutes: assessment.duration_minutes,
        proctoring_enabled: assessment.proctoring_enabled || false,
        proctoring_config: assessment.proctoring_config || {},
        question_count: questions.length,
        questions: questions
      },
      shareConfig: {
        requireName: shareData.require_name || false,
        requireEmail: shareData.require_email || false,
        allowAnonymous: shareData.allow_anonymous !== false, // Default to true if null
        maxAttempts: shareData.max_attempts,
        expiresAt: shareData.expires_at,
        accessCount: shareData.access_count + 1, // Include incremented count
        completionCount: shareData.completion_count || 0
      },
      metadata: {
        accessedAt: new Date().toISOString(),
        remainingAttempts: shareData.max_attempts ? shareData.max_attempts - (shareData.access_count + 1) : null
      }
    }

    console.log('Response prepared successfully:', {
      success: true,
      assessmentId: assessment.id,
      assessmentTitle: assessment.title,
      questionCount: questions.length,
      shareConfigSummary: {
        requireName: shareData.require_name,
        requireEmail: shareData.require_email,
        allowAnonymous: shareData.allow_anonymous,
        accessCount: shareData.access_count + 1
      }
    })

    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Unexpected error in take-shared-assessment:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error occurred while processing request',
        details: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})