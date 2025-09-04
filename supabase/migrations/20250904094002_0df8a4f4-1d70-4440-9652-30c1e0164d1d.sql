-- Delete existing orphaned profile and let auth trigger create new one
DELETE FROM profiles WHERE email = 'shrinivas.karthik@techademy.com';

-- Note: We'll need to create the user through normal signup process
-- This migration just cleans up the orphaned profile