-- Create a simplified RLS policy for public assessment results access using email + token
DROP POLICY IF EXISTS "Allow public access to evaluated assessment instances via share" ON public.assessment_instances;

-- Create new policy that allows access with both share token and participant email
CREATE POLICY "Public access to evaluation results with email verification" 
ON public.assessment_instances 
FOR SELECT 
USING (
  share_token IS NOT NULL 
  AND participant_email IS NOT NULL 
  AND status = 'evaluated'
  AND EXISTS (
    SELECT 1 FROM assessment_shares 
    WHERE assessment_shares.share_token = assessment_instances.share_token 
    AND assessment_shares.is_active = true 
    AND (assessment_shares.expires_at IS NULL OR assessment_shares.expires_at > now())
  )
);