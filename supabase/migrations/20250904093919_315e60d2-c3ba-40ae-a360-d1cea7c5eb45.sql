-- Temporarily disable trigger and create auth user
DO $$
BEGIN
    -- Disable the trigger temporarily
    ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;
    
    -- Create the auth user with the existing profile's user_id
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
        '5fcb742d-42bd-4cb9-bfde-59d9f4001d40',
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
    );

    -- Create identity record
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
        '5fcb742d-42bd-4cb9-bfde-59d9f4001d40',
        '{"sub": "5fcb742d-42bd-4cb9-bfde-59d9f4001d40", "email": "shrinivas.karthik@techademy.com"}'::jsonb,
        'email',
        null,
        now(),
        now()
    );
    
    -- Re-enable the trigger
    ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
    
    RAISE NOTICE 'Successfully created auth user for existing profile';
END $$;