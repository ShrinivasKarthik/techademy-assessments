-- Add specific policy for anonymous users to view assessment instances via share tokens

CREATE POLICY "Anonymous users can view their assessment instances via share tokens" 
ON public.assessment_instances 
FOR SELECT 
USING (
  -- Allow anonymous users to view instances when:
  -- 1. They're marked as anonymous
  -- 2. They have a valid share token  
  -- 3. The share token corresponds to an active, non-expired share
  (is_anonymous = true) AND 
  (share_token IS NOT NULL) AND 
  (participant_id IS NULL) AND
  (EXISTS (
    SELECT 1 FROM public.assessment_shares 
    WHERE assessment_shares.share_token = assessment_instances.share_token 
    AND assessment_shares.is_active = true 
    AND (assessment_shares.expires_at IS NULL OR assessment_shares.expires_at > now())
  ))
);