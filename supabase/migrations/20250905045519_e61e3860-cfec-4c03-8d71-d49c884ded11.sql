-- Create demo admin user in profiles table manually
-- This ensures the user exists when we try to sign in

INSERT INTO public.profiles (
    user_id,
    email,
    full_name,
    role
) 
SELECT 
    au.id,
    'admin@demo.com',
    'Demo Admin',
    'admin'::user_role
FROM auth.users au 
WHERE au.email = 'admin@demo.com'
ON CONFLICT (user_id) 
DO UPDATE SET 
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;