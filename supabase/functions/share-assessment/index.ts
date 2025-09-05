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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !user) {
      console.error('Authentication error:', userError)
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const { assessmentId, expiresIn, maxAttempts, requireName, requireEmail, allowAnonymous, settings } = await req.json()

    console.log('Creating share for assessment:', { 
      assessmentId, 
      userId: user.id,
      expiresIn, 
      maxAttempts, 
      requireName, 
      requireEmail, 
      allowAnonymous 
    })

    // Validate that the user owns or has permission to share this assessment
    const { data: assessment, error: assessmentError } = await supabaseClient
      .from('assessments')
      .select('id, title, creator_id')
      .eq('id', assessmentId)
      .single()

    if (assessmentError || !assessment) {
      console.error('Assessment not found:', assessmentError)
      return new Response(
        JSON.stringify({ error: 'Assessment not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    if (assessment.creator_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions to share this assessment' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    // Generate unique share token
    const shareToken = `ast_${crypto.randomUUID().replace(/-/g, '')}`

    // Calculate expiration date
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000).toISOString() : null

    // Create the share record
    const { data: shareData, error: shareError } = await supabaseClient
      .from('assessment_shares')
      .insert({
        assessment_id: assessmentId,
        share_token: shareToken,
        created_by: user.id,
        expires_at: expiresAt,
        max_attempts: maxAttempts || null,
        require_name: requireName || false,
        require_email: requireEmail || false,
        allow_anonymous: allowAnonymous !== false,
        settings: settings || {}
      })
      .select()
      .single()

    if (shareError) {
      console.error('Error creating share:', shareError)
      return new Response(
        JSON.stringify({ error: 'Failed to create share link' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const baseUrl = req.headers.get('origin') || 'https://axdwgxtukqqzupboojmx.supabase.co'
    const shareLink = `${baseUrl}/public/assessment/${shareToken}`

    const responseData = {
      success: true,
      shareId: shareData.id,
      shareToken: shareToken,
      shareLink: shareLink,
      assessmentTitle: assessment.title,
      expiresAt: expiresAt,
      maxAttempts: maxAttempts,
      requireName: requireName || false,
      requireEmail: requireEmail || false,
      allowAnonymous: allowAnonymous !== false
    }

    console.log('Share created successfully:', responseData)

    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error sharing assessment:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to share assessment: ' + error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})