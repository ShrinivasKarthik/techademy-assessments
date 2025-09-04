-- Step 1: Make assessment_id nullable in questions table
ALTER TABLE public.questions ALTER COLUMN assessment_id DROP NOT NULL;

-- Step 2: Update existing placeholder questions to have NULL assessment_id
-- (This will convert any questions with placeholder assessment_id to standalone questions)
UPDATE public.questions 
SET assessment_id = NULL 
WHERE assessment_id IN (
  SELECT id FROM public.assessments 
  WHERE title LIKE '%Question Bank%' OR title LIKE '%Standalone%'
);

-- Step 3: Update RLS policies to handle both standalone and assessment-bound questions
DROP POLICY IF EXISTS "Allow all for development" ON public.questions;

-- Allow users to view questions they created (standalone) or questions from assessments they created
CREATE POLICY "Users can view their questions and assessment questions" 
ON public.questions 
FOR SELECT 
USING (
  created_by = auth.uid() OR 
  (assessment_id IS NOT NULL AND assessment_id IN (
    SELECT id FROM public.assessments WHERE creator_id = auth.uid()
  ))
);

-- Allow users to create standalone questions or questions for their assessments
CREATE POLICY "Users can create questions" 
ON public.questions 
FOR INSERT 
WITH CHECK (
  created_by = auth.uid() AND (
    assessment_id IS NULL OR 
    assessment_id IN (SELECT id FROM public.assessments WHERE creator_id = auth.uid())
  )
);

-- Allow users to update their own questions
CREATE POLICY "Users can update their questions" 
ON public.questions 
FOR UPDATE 
USING (
  created_by = auth.uid() OR 
  (assessment_id IS NOT NULL AND assessment_id IN (
    SELECT id FROM public.assessments WHERE creator_id = auth.uid()
  ))
);

-- Allow users to delete their own questions
CREATE POLICY "Users can delete their questions" 
ON public.questions 
FOR DELETE 
USING (
  created_by = auth.uid() OR 
  (assessment_id IS NOT NULL AND assessment_id IN (
    SELECT id FROM public.assessments WHERE creator_id = auth.uid()
  ))
);