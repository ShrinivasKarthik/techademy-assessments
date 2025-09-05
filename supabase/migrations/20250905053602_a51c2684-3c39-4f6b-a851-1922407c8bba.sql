-- Allow participant_id to be NULL for anonymous assessment instances
-- This is needed for shared assessments where users take assessments without logging in

ALTER TABLE public.assessment_instances 
ALTER COLUMN participant_id DROP NOT NULL;