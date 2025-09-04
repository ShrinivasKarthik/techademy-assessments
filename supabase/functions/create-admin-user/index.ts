import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Create admin user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'shrinivas.karthik@techademy.com',
      password: 'admin123',
      email_confirm: true,
      user_metadata: {
        full_name: 'Shrinivas Karthik',
        role: 'admin'
      }
    })

    if (authError) {
      console.error('Auth error:', authError)
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Update profile with admin role
    if (authData.user) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          role: 'admin',
          full_name: 'Shrinivas Karthik'
        })
        .eq('user_id', authData.user.id)

      if (profileError) {
        console.error('Profile update error:', profileError)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Admin user created successfully',
        user: {
          email: authData.user?.email,
          id: authData.user?.id
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})