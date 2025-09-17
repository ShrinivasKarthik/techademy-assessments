-- Add technology field to questions table for project-based assessments
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS technology TEXT;

-- Update existing project-based questions to have a default technology if none exists
UPDATE public.questions 
SET technology = 'JavaScript/React' 
WHERE question_type = 'project_based' AND technology IS NULL;

-- Add index for better query performance on technology field
CREATE INDEX IF NOT EXISTS idx_questions_technology ON public.questions(technology) WHERE technology IS NOT NULL;