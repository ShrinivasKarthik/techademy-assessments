-- Update RLS policies for anonymous proctored assessments

-- Allow anonymous proctoring sessions for shared assessments
CREATE POLICY "Anonymous proctoring sessions for shared assessments" 
ON public.proctoring_sessions 
FOR ALL 
USING (
  participant_id LIKE 'anon_%' OR 
  EXISTS (
    SELECT 1 FROM assessment_instances ai 
    WHERE ai.id = proctoring_sessions.assessment_instance_id 
    AND ai.is_anonymous = true 
    AND ai.share_token IS NOT NULL
  )
) 
WITH CHECK (
  participant_id LIKE 'anon_%' OR 
  EXISTS (
    SELECT 1 FROM assessment_instances ai 
    WHERE ai.id = proctoring_sessions.assessment_instance_id 
    AND ai.is_anonymous = true 
    AND ai.share_token IS NOT NULL
  )
);