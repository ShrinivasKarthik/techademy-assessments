-- Create an edge function for manual user creation that uses admin API
-- This will be implemented as an edge function to securely create users without email verification

-- For now, let's ensure we have proper triggers for profile creation
-- The existing handle_new_user trigger should work, but let's make sure it handles manual creation

-- Update the handle_new_user function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public 
AS $$
BEGIN
  -- Insert profile with data from auth.users metadata
  INSERT INTO public.profiles (
    user_id, 
    email, 
    full_name, 
    role
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'user'::user_role)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role = COALESCE(EXCLUDED.role, profiles.role),
    updated_at = now();
  
  RETURN NEW;
END;
$$;