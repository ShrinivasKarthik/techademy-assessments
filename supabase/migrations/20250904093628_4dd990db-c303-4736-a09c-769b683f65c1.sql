-- Create the user in auth system and link to existing profile
DO $$
DECLARE
    new_user_id uuid;
BEGIN
    -- First, let's create a user account in auth for the existing profile
    -- We'll use a simple password that can be changed later
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        confirmation_sent_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change,
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
        'shrinivas.karthik@techademy.com',
        crypt('admin123', gen_salt('bf')),  -- Password: admin123
        now(),
        now(),
        '',
        '',
        '',
        '',
        now(),
        now(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Shrinivas Karthik"}',
        false,
        null
    )
    RETURNING id INTO new_user_id;

    -- Update the existing profile to link to the new user
    UPDATE profiles 
    SET user_id = new_user_id 
    WHERE email = 'shrinivas.karthik@techademy.com';

    -- Also create identity record
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        new_user_id,
        format('{"sub": "%s", "email": "%s"}', new_user_id, 'shrinivas.karthik@techademy.com')::jsonb,
        'email',
        null,
        now(),
        now()
    );
END $$;