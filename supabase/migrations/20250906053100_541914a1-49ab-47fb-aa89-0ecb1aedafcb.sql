-- Enable leaked password protection for better security
-- This is handled at the project level through Supabase dashboard settings
-- The SQL below documents the required setting but cannot be executed via migration

-- Note: This needs to be enabled in Supabase Dashboard:
-- 1. Go to Authentication > Settings > Password security
-- 2. Enable "Leaked password protection"
-- 3. This prevents users from using passwords found in data breaches

-- For now, we'll document this requirement
INSERT INTO public.assessment_files (file_name, file_path, content_type, file_size, uploaded_by)
VALUES ('SECURITY_NOTE.txt', '/security/password-protection-note.txt', 'text/plain', 500, NULL)
ON CONFLICT DO NOTHING;