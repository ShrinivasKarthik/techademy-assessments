-- Remove the unique constraint that prevents multiple anonymous assessment instances
-- This allows users to make multiple attempts using the same share token
DROP INDEX IF EXISTS public.idx_assessment_instances_anonymous_unique;