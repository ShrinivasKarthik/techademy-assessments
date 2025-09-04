-- Replace description with question_text in questions table
ALTER TABLE public.questions 
DROP COLUMN IF EXISTS description;

ALTER TABLE public.questions 
ADD COLUMN question_text TEXT;