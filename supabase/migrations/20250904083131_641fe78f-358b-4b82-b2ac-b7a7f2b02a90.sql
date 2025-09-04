-- Remove foreign key constraint from profiles table to allow manual user creation
-- This allows creating profile records without requiring actual auth.users records
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;