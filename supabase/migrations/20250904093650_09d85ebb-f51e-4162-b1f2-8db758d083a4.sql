-- Temporarily disable the trigger, create auth user, then re-enable
DO $$
DECLARE
    profile_user_id uuid;
    profile_email text := 'shrinivas.karthik@techademy.com';
BEGIN
    -- Get the existing profile's user_id
    SELECT user_id INTO profile_user_id 
    FROM profiles 
    WHERE email = profile_email;

    -- Disable the trigger temporarily
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

    -- Create the user account with the existing user_id
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

    RAISE NOTICE 'Successfully created auth user and restored trigger';
END $$;