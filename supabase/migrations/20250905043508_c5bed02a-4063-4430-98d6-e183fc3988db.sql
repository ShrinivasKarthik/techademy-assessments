-- Clean up duplicate profiles and ensure proper auth setup
-- Delete the old example profiles that don't have corresponding auth users
DELETE FROM public.profiles 
WHERE email IN ('admin@example.com', 'participant@example.com');

-- Update the demo profiles to have the correct emails that match the AuthPage
UPDATE public.profiles 
SET email = 'admin@demo.com'
WHERE email = 'admin@demo.com' AND role = 'admin';

-- Ensure all demo users have proper auth entries by checking auth.users
DO $$
BEGIN
  -- Verify the auth users exist, if not something went wrong
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@demo.com') THEN
    RAISE EXCEPTION 'Admin demo user not found in auth.users';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'teacher@demo.com') THEN
    RAISE EXCEPTION 'Teacher demo user not found in auth.users';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'student@demo.com') THEN
    RAISE EXCEPTION 'Student demo user not found in auth.users';
  END IF;
END $$;