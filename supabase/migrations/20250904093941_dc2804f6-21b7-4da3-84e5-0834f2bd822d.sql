-- Create auth user without email in identities (it's generated)
DO $$
DECLARE
    profile_user_id uuid;
    profile_email text := 'shrinivas.karthik@techademy.com';
    identity_id uuid;
BEGIN
    -- Get the existing profile's user_id
    SELECT user_id INTO profile_user_id 
    FROM profiles 
    WHERE email = profile_email;
    
    identity_id := gen_random_uuid();

    -- Check if user already exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = profile_user_id) THEN
        -- Disable the trigger temporarily
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

        -- Create the user account
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
            profile_email,
            crypt('admin123', gen_salt('bf')),
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

        -- Create identity record (email is generated column)
        INSERT INTO auth.identities (
            id,
            provider_id,
            user_id,
            identity_data,
            provider,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            identity_id,
            profile_user_id::text,
            profile_user_id,
            format('{"sub": "%s", "email": "%s"}', profile_user_id, profile_email)::jsonb,
            'email',
            null,
            now(),
            now()
        );

        -- Re-enable the trigger
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

        RAISE NOTICE 'Created auth user for %', profile_email;
    END IF;
END $$;