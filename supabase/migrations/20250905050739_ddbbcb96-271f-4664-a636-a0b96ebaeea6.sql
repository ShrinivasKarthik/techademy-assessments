-- Fix RLS policies on assessment_shares to allow sharing demo assessments (creator_id = null)

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can create shares for their assessments" ON public.assessment_shares;

-- Create a new INSERT policy that allows sharing assessments with null creator_id
CREATE POLICY "Users can create shares for their assessments or demo assessments" 
ON public.assessment_shares 
FOR INSERT 
WITH CHECK (
  (created_by = auth.uid()) AND 
  (EXISTS (
    SELECT 1 FROM public.assessments 
    WHERE assessments.id = assessment_shares.assessment_id 
    AND (assessments.creator_id = auth.uid() OR assessments.creator_id IS NULL)
  ))
);

-- Update the SELECT policy to match the same logic for consistency
DROP POLICY IF EXISTS "Users can view their own shared assessments" ON public.assessment_shares;

CREATE POLICY "Users can view their own shared assessments" 
ON public.assessment_shares 
FOR SELECT 
USING (
  created_by = auth.uid() OR 
  (EXISTS (
    SELECT 1 FROM public.assessments 
    WHERE assessments.id = assessment_shares.assessment_id 
    AND assessments.creator_id IS NULL
  ))
);

-- Update the UPDATE policy for consistency
DROP POLICY IF EXISTS "Users can update their own shared assessments" ON public.assessment_shares;

CREATE POLICY "Users can update their own shared assessments" 
ON public.assessment_shares 
FOR UPDATE 
USING (
  created_by = auth.uid() OR 
  (EXISTS (
    SELECT 1 FROM public.assessments 
    WHERE assessments.id = assessment_shares.assessment_id 
    AND assessments.creator_id IS NULL
  ))
);

-- Update the DELETE policy for consistency  
DROP POLICY IF EXISTS "Users can delete their own shared assessments" ON public.assessment_shares;

CREATE POLICY "Users can delete their own shared assessments" 
ON public.assessment_shares 
FOR DELETE 
USING (
  created_by = auth.uid() OR 
  (EXISTS (
    SELECT 1 FROM public.assessments 
    WHERE assessments.id = assessment_shares.assessment_id 
    AND assessments.creator_id IS NULL
  ))
);