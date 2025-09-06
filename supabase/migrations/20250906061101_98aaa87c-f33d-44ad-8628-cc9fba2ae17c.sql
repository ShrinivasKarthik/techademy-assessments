-- Update user shrinivas.karthik@iiht.com to admin role
UPDATE public.profiles 
SET role = 'admin'::user_role 
WHERE email = 'shrinivas.karthik@iiht.com';