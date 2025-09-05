-- Create assessment_shares table for managing public links
CREATE TABLE public.assessment_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_attempts INTEGER,
  require_name BOOLEAN NOT NULL DEFAULT false,
  require_email BOOLEAN NOT NULL DEFAULT false,
  allow_anonymous BOOLEAN NOT NULL DEFAULT true,
  access_count INTEGER NOT NULL DEFAULT 0,
  completion_count INTEGER NOT NULL DEFAULT 0,
  settings JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on assessment_shares
ALTER TABLE public.assessment_shares ENABLE ROW LEVEL SECURITY;

-- Create policies for assessment_shares
CREATE POLICY "Users can view their own shared assessments" 
ON public.assessment_shares 
FOR SELECT 
USING (created_by = auth.uid());

CREATE POLICY "Users can create shares for their assessments" 
ON public.assessment_shares 
FOR INSERT 
WITH CHECK (
  created_by = auth.uid() AND 
  EXISTS (
    SELECT 1 FROM public.assessments 
    WHERE id = assessment_id AND creator_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own shared assessments" 
ON public.assessment_shares 
FOR UPDATE 
USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own shared assessments" 
ON public.assessment_shares 
FOR DELETE 
USING (created_by = auth.uid());

-- Add columns to assessment_instances for anonymous participants
ALTER TABLE public.assessment_instances 
ADD COLUMN participant_email TEXT,
ADD COLUMN participant_name TEXT,
ADD COLUMN share_token TEXT,
ADD COLUMN is_anonymous BOOLEAN NOT NULL DEFAULT false;

-- Update RLS policies for assessment_instances to allow public access for shared assessments
DROP POLICY IF EXISTS "Allow all for development" ON public.assessment_instances;

CREATE POLICY "Users can view their own assessment instances" 
ON public.assessment_instances 
FOR SELECT 
USING (
  participant_id = auth.uid() OR
  (share_token IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.assessment_shares 
    WHERE share_token = assessment_instances.share_token 
    AND is_active = true 
    AND (expires_at IS NULL OR expires_at > now())
  ))
);

CREATE POLICY "Users can create their own assessment instances" 
ON public.assessment_instances 
FOR INSERT 
WITH CHECK (
  participant_id = auth.uid() OR
  (is_anonymous = true AND share_token IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.assessment_shares 
    WHERE share_token = assessment_instances.share_token 
    AND is_active = true 
    AND (expires_at IS NULL OR expires_at > now())
  ))
);

CREATE POLICY "Users can update their own assessment instances" 
ON public.assessment_instances 
FOR UPDATE 
USING (
  participant_id = auth.uid() OR
  (is_anonymous = true AND share_token IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.assessment_shares 
    WHERE share_token = assessment_instances.share_token 
    AND is_active = true 
    AND (expires_at IS NULL OR expires_at > now())
  ))
);

-- Update submissions table RLS to allow public access for shared assessments
CREATE POLICY "Public access for shared assessment submissions" 
ON public.submissions 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.assessment_instances ai 
    WHERE ai.id = submissions.instance_id 
    AND (
      ai.participant_id = auth.uid() OR
      (ai.is_anonymous = true AND ai.share_token IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.assessment_shares 
        WHERE share_token = ai.share_token 
        AND is_active = true 
        AND (expires_at IS NULL OR expires_at > now())
      ))
    )
  )
);

-- Update evaluations table RLS to allow public access for shared assessments  
CREATE POLICY "Public access for shared assessment evaluations" 
ON public.evaluations 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.submissions s
    JOIN public.assessment_instances ai ON ai.id = s.instance_id
    WHERE s.id = evaluations.submission_id 
    AND (
      ai.participant_id = auth.uid() OR
      (ai.is_anonymous = true AND ai.share_token IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.assessment_shares 
        WHERE share_token = ai.share_token 
        AND is_active = true 
        AND (expires_at IS NULL OR expires_at > now())
      ))
    )
  )
);

-- Create function to increment access count
CREATE OR REPLACE FUNCTION public.increment_share_access()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.assessment_shares 
  SET access_count = access_count + 1
  WHERE share_token = NEW.share_token;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to increment access count when assessment instance is created
CREATE TRIGGER increment_share_access_trigger
  AFTER INSERT ON public.assessment_instances
  FOR EACH ROW
  WHEN (NEW.share_token IS NOT NULL)
  EXECUTE FUNCTION public.increment_share_access();

-- Create function to increment completion count
CREATE OR REPLACE FUNCTION public.increment_share_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'submitted' AND OLD.status != 'submitted' THEN
    UPDATE public.assessment_shares 
    SET completion_count = completion_count + 1
    WHERE share_token = NEW.share_token;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to increment completion count when assessment is submitted
CREATE TRIGGER increment_share_completion_trigger
  AFTER UPDATE ON public.assessment_instances
  FOR EACH ROW
  WHEN (NEW.share_token IS NOT NULL)
  EXECUTE FUNCTION public.increment_share_completion();