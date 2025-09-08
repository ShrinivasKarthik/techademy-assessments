-- Update RLS policy to allow anonymous users to insert assessment instances with valid share tokens
DROP POLICY IF EXISTS "Anonymous users can create assessment instances via share token" ON public.assessment_instances;

CREATE POLICY "Anonymous users can create assessment instances via share token"
ON public.assessment_instances 
FOR INSERT 
WITH CHECK (
  (is_anonymous = true) 
  AND (share_token IS NOT NULL) 
  AND (participant_id IS NULL) 
  AND (EXISTS (
    SELECT 1 FROM assessment_shares 
    WHERE assessment_shares.share_token = assessment_instances.share_token 
    AND assessment_shares.is_active = true 
    AND (assessment_shares.expires_at IS NULL OR assessment_shares.expires_at > now())
  ))
);