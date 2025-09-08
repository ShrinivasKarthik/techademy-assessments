-- Add RLS policy to allow public access to assessment results via share token
CREATE POLICY "Allow public access to evaluated assessment instances via share token" 
ON public.assessment_instances 
FOR SELECT 
USING (
  (share_token IS NOT NULL) 
  AND (status = 'evaluated')
  AND (EXISTS (
    SELECT 1 FROM assessment_shares 
    WHERE assessment_shares.share_token = assessment_instances.share_token 
    AND assessment_shares.is_active = true 
    AND (assessment_shares.expires_at IS NULL OR assessment_shares.expires_at > now())
  ))
);