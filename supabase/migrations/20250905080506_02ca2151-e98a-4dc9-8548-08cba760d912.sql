-- Drop the foreign key constraint that prevents anonymous users
ALTER TABLE public.assessment_instances 
DROP CONSTRAINT IF EXISTS fk_instances_participant;