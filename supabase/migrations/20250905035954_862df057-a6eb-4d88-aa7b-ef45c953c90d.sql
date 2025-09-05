-- Fix search_path issues for security compliance
DROP FUNCTION IF EXISTS public.increment_share_access();
DROP FUNCTION IF EXISTS public.increment_share_completion();

-- Create function to increment access count with proper security settings
CREATE OR REPLACE FUNCTION public.increment_share_access()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.assessment_shares 
  SET access_count = access_count + 1
  WHERE share_token = NEW.share_token;
  RETURN NEW;
END;
$$;

-- Create function to increment completion count with proper security settings
CREATE OR REPLACE FUNCTION public.increment_share_completion()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'submitted' AND OLD.status != 'submitted' THEN
    UPDATE public.assessment_shares 
    SET completion_count = completion_count + 1
    WHERE share_token = NEW.share_token;
  END IF;
  RETURN NEW;
END;
$$;