import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0'
import { corsHeaders } from '../_shared/cors.ts'

interface UserCreationRequest {
  email: string
  password: string
  fullName: string
  role: string
}

async function findUserByEmail(supabaseAdmin: ReturnType<typeof createClient>, email: string) {
  const target = email.toLowerCase()
  let page = 1
  const perPage = 200

  while (true) {
    const { data, error } = await (supabaseAdmin as any).auth.admin.listUsers({ page, perPage })
    if (error) throw error

    const found = data?.users?.find((u: any) => (u.email || '').toLowerCase() === target)
    if (found) return found

    if (!data || data.users.length < perPage) break
    page += 1
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { email, password, fullName, role }: UserCreationRequest = await req.json()
    if (!email || !password || !fullName || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    // Auth client bound to the caller to verify identity
    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: me, error: meError } = await supabaseAuth.auth.getUser()
    if (meError || !me?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Admin client for privileged actions
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Enforce admin-only access via profiles.role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', me.user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: admin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Try to create user (bypasses email verification)
    const { data: createdData, error: createError } = await (supabaseAdmin as any).auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    })

    if (!createError && createdData?.user) {
      // Ensure profile exists/updated
      await supabaseAdmin
        .from('profiles')
        .upsert({
          user_id: createdData.user.id,
          email,
          full_name: fullName || email,
          role,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })

      return new Response(
        JSON.stringify({
          success: true,
          action: 'created',
          user: createdData.user,
          message: 'User created and confirmed successfully',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If creation failed, check if user already exists and update/confirm
    const existing = await findUserByEmail(supabaseAdmin, email)
    if (!existing) {
      // Could not create or find user
      return new Response(
        JSON.stringify({ error: createError?.message || 'Failed to create user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update existing user: confirm email and set password/metadata
    const { data: updatedData, error: updateError } = await (supabaseAdmin as any).auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    })

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Ensure profile exists/updated
    await supabaseAdmin
      .from('profiles')
      .upsert({
        user_id: existing.id,
        email,
        full_name: fullName || email,
        role,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    return new Response(
      JSON.stringify({
        success: true,
        action: 'updated',
        user: updatedData?.user ?? existing,
        message: 'Existing user confirmed and password set',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('create-user-direct error:', error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})