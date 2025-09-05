-- Remove foreign key constraint and make creator_id nullable for public access
ALTER TABLE public.assessments DROP CONSTRAINT IF EXISTS fk_assessments_creator;
ALTER TABLE public.assessments ALTER COLUMN creator_id DROP NOT NULL;