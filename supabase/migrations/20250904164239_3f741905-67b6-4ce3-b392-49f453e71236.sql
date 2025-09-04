-- Update the delete policy to allow users to delete AI-generated questions from the question bank
DROP POLICY IF EXISTS "Users can delete their questions" ON public.questions;

CREATE POLICY "Users can delete their questions and AI-generated questions" 
ON public.questions 
FOR DELETE 
USING (
  -- Users can delete their own questions
  (created_by = auth.uid()) 
  OR 
  -- Users can delete questions in assessments they own
  ((assessment_id IS NOT NULL) AND (assessment_id IN ( 
    SELECT assessments.id 
    FROM assessments 
    WHERE (assessments.creator_id = auth.uid())
  )))
  OR
  -- Users can delete AI-generated questions from question bank (not in any assessment)
  ((created_by IS NULL) AND (assessment_id IS NULL))
);