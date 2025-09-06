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

    // Optimized: Combine all database queries using joins for better performance
    const { data: combinedData, error: dataError } = await supabaseClient
      .from('assessment_shares')
      .select(`
        *,
        assessments!inner (
          id, title, description, instructions, duration_minutes, 
          proctoring_enabled, proctoring_config, status
        )
      `)
      .eq('share_token', shareToken)
      .eq('is_active', true)
      .eq('assessments.status', 'published')
      .maybeSingle()

    if (dataError) {
      console.error('Database error fetching data:', dataError)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Database error accessing assessment information' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    if (!combinedData) {
      console.log('No active share or published assessment found for token:', shareToken)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid, expired, or inactive assessment link' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    const shareData = combinedData
    const assessment = combinedData.assessments

    console.log('Share and assessment found:', { 
      shareId: shareData.id, 
      assessmentId: assessment.id,
      assessmentTitle: assessment.title,
      accessCount: shareData.access_count
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

    // Optimized: Only fetch question metadata initially (defer full question content)
    const { data: questions, error: questionsError } = await supabaseClient
      .from('questions')
      .select('id, title, question_type, difficulty, points, order_index')
      .eq('assessment_id', assessment.id)
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
      console.log('No active questions found for assessment:', assessment.id)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Assessment has no available questions' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 422 }
      )
    }

    // Optimized: Check for existing instance in parallel
    const existingInstancePromise = supabaseClient
      .from('assessment_instances')
      .select('id, status, session_state, started_at, time_remaining_seconds, current_question_index, participant_name, participant_email')
      .eq('share_token', shareToken)
      .eq('is_anonymous', true)
      .eq('assessment_id', assessment.id)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    console.log('Questions loaded:', questions.length)

    // Optimized: Wait for existing instance check and increment access count in parallel
    const [existingInstanceResult, accessCountResult] = await Promise.allSettled([
      existingInstancePromise,
      supabaseClient
        .from('assessment_shares')
        .update({ access_count: shareData.access_count + 1 })
        .eq('id', shareData.id)
    ])

    // Handle existing instance result
    let existingInstance = null
    if (existingInstanceResult.status === 'fulfilled' && existingInstanceResult.value.data) {
      existingInstance = existingInstanceResult.value.data
    }

    // Log access count update (don't fail for this)
    if (accessCountResult.status === 'rejected') {
      console.error('Error updating access count:', accessCountResult.reason)
    }

    // Optimized response data with existing instance if found
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
        questions: questions // Only basic question metadata, not full content
      },
      shareConfig: {
        requireName: shareData.require_name || false,
        requireEmail: shareData.require_email || false,
        allowAnonymous: shareData.allow_anonymous !== false,
        maxAttempts: shareData.max_attempts,
        expiresAt: shareData.expires_at,
        accessCount: shareData.access_count + 1,
        completionCount: shareData.completion_count || 0
      },
      existingInstance: existingInstance, // Include existing instance if found
      metadata: {
        accessedAt: new Date().toISOString(),
        remainingAttempts: shareData.max_attempts ? shareData.max_attempts - (shareData.access_count + 1) : null,
        hasExistingInstance: !!existingInstance
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