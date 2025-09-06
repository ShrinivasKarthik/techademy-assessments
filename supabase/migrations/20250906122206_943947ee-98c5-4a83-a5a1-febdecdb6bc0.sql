-- Fix function search path issues
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT AS $$
  SELECT auth.email();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_session_collaborator(session_id_param UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM collaborators 
    WHERE session_id = session_id_param 
    AND (user_id = auth.uid() OR email = auth.email())
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;