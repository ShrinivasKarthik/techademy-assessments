-- Fix confirmation_token column issue in auth schema
-- This addresses the "converting NULL to string is unsupported" error

-- First, let's check if there are any NULL confirmation_token values and clean them up
UPDATE auth.users 
SET confirmation_token = '' 
WHERE confirmation_token IS NULL;

-- Also clean up any other potential NULL string columns that might cause scanning issues
UPDATE auth.users 
SET recovery_token = COALESCE(recovery_token, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change_token_current = COALESCE(email_change_token_current, '');

-- Ensure the demo users exist with proper data
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change_token_current,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    last_sign_in_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@demo.com',
    crypt('demo123', gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Demo Admin"}',
    false,
    now()
) ON CONFLICT (email) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    confirmation_token = '',
    recovery_token = '',
    email_change_token_new = '',
    email_change_token_current = '',
    updated_at = now();