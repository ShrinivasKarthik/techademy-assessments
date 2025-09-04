-- Update RLS policy to allow users to see AI-generated questions (created_by IS NULL) along with their own questions
DROP POLICY IF EXISTS "Users can view their questions and assessment questions" ON questions;

CREATE POLICY "Users can view their own and AI-generated questions" 
ON questions 
FOR SELECT 
USING (
  (created_by = auth.uid()) OR 
  (created_by IS NULL AND assessment_id IS NULL) OR -- AI-generated standalone questions
  ((assessment_id IS NOT NULL) AND (assessment_id IN ( 
    SELECT assessments.id
    FROM assessments
    WHERE (assessments.creator_id = auth.uid())
  )))
);