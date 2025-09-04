-- Create admin user using Supabase auth functions
SELECT auth.create_user(
  'shrinivas.karthik@techademy.com'::text,  -- email
  'admin123'::text,                         -- password  
  '{"full_name": "Shrinivas Karthik", "role": "admin"}'::jsonb  -- user_metadata
);