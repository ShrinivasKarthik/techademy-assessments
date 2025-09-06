-- Fix infinite recursion in collaborative_sessions and collaborators RLS policies
-- Create security definer functions to avoid self-referencing policies

CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS TEXT AS $$
  SELECT auth.email();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_session_collaborator(session_id_param UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM collaborators 
    WHERE session_id = session_id_param 
    AND (user_id = auth.uid() OR email = auth.email())
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view sessions they created or are collaborators in" ON collaborative_sessions;
DROP POLICY IF EXISTS "Users can manage collaborators in their sessions" ON collaborators;

-- Create new policies using security definer functions
CREATE POLICY "Users can view sessions they created or are collaborators in" 
ON collaborative_sessions FOR SELECT 
USING (
  created_by = auth.uid() OR 
  public.is_session_collaborator(id)
);

CREATE POLICY "Users can manage collaborators in their sessions" 
ON collaborators FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM collaborative_sessions cs 
    WHERE cs.id = collaborators.session_id 
    AND cs.created_by = auth.uid()
  ) OR 
  user_id = auth.uid()
);