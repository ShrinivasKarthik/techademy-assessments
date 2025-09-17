-- First add the project_based value to the question_type enum
ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'project_based';

-- Add technology field to questions table for project-based assessments
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS technology TEXT;

-- Add index for better query performance on technology field
CREATE INDEX IF NOT EXISTS idx_questions_technology ON public.questions(technology) WHERE technology IS NOT NULL;