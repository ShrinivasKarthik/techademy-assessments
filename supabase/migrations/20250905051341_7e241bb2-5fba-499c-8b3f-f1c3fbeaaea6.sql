-- Add public access policy for shared assessments 
-- This allows the edge function to read active shared assessments without authentication

CREATE POLICY "Public access to active shared assessments" 
ON public.assessment_shares 
FOR SELECT 
USING (
  is_active = true AND 
  (expires_at IS NULL OR expires_at > now())
);

-- We also need to ensure the assessments table can be read publicly for shared assessments
-- Since it already has "Anyone can view assessments" policy, this should be fine

-- And questions table needs public access for shared assessments  
-- Since it already has "Anyone can view questions" policy, this should be fine