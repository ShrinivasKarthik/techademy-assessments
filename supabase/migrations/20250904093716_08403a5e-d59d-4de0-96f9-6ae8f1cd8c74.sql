-- Check if user exists in auth and create if needed
DO $$
DECLARE
    existing_user_id uuid;
    profile_user_id uuid;
BEGIN
    -- Get the user_id from profile
    SELECT user_id INTO profile_user_id 
    FROM profiles 
    WHERE email = 'shrinivas.karthik@techademy.com';
    
    -- Check if this user exists in auth.users
    SELECT id INTO existing_user_id 
    FROM auth.users 
    WHERE id = profile_user_id;
    
    -- If user doesn't exist in auth, create it
    IF existing_user_id IS NULL THEN
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
            profile_user_id,
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
            profile_user_id,
            format('{"sub": "%s", "email": "%s"}', profile_user_id, 'shrinivas.karthik@techademy.com')::jsonb,
            'email',
            null,
            now(),
            now()
        );
        
        RAISE NOTICE 'Created auth user for existing profile';
    ELSE
        RAISE NOTICE 'Auth user already exists';
    END IF;
END $$;