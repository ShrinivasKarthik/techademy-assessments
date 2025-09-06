-- Create collaborative sessions table
CREATE TABLE public.collaborative_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  session_data JSONB DEFAULT '{}'::jsonb
);

-- Create collaborators table
CREATE TABLE public.collaborators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  user_id UUID,
  email TEXT,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'viewer',
  status TEXT NOT NULL DEFAULT 'offline',
  last_active TIMESTAMP WITH TIME ZONE DEFAULT now(),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (session_id) REFERENCES public.collaborative_sessions(id) ON DELETE CASCADE
);

-- Create collaborative comments table
CREATE TABLE public.collaborative_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  author_id UUID,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  question_id TEXT,
  parent_id UUID,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (session_id) REFERENCES public.collaborative_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES public.collaborative_comments(id) ON DELETE CASCADE
);

-- Create session activity log
CREATE TABLE public.session_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  user_id UUID,
  user_name TEXT,
  action_type TEXT NOT NULL,
  action_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (session_id) REFERENCES public.collaborative_sessions(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.collaborative_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborative_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collaborative_sessions
CREATE POLICY "Users can create their own sessions" 
ON public.collaborative_sessions 
FOR INSERT 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can view sessions they created or are collaborators in" 
ON public.collaborative_sessions 
FOR SELECT 
USING (created_by = auth.uid() OR EXISTS (
  SELECT 1 FROM public.collaborators 
  WHERE session_id = collaborative_sessions.id 
  AND (user_id = auth.uid() OR email = auth.email())
));

CREATE POLICY "Users can update their own sessions" 
ON public.collaborative_sessions 
FOR UPDATE 
USING (created_by = auth.uid());

-- RLS Policies for collaborators
CREATE POLICY "Users can manage collaborators in their sessions" 
ON public.collaborators 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.collaborative_sessions 
  WHERE id = collaborators.session_id 
  AND created_by = auth.uid()
) OR user_id = auth.uid());

-- RLS Policies for collaborative_comments
CREATE POLICY "Users can manage comments in sessions they have access to" 
ON public.collaborative_comments 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.collaborative_sessions cs
  LEFT JOIN public.collaborators c ON cs.id = c.session_id
  WHERE cs.id = collaborative_comments.session_id 
  AND (cs.created_by = auth.uid() OR c.user_id = auth.uid() OR c.email = auth.email())
));

-- RLS Policies for session_activity
CREATE POLICY "Users can view activity in sessions they have access to" 
ON public.session_activity 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.collaborative_sessions cs
  LEFT JOIN public.collaborators c ON cs.id = c.session_id
  WHERE cs.id = session_activity.session_id 
  AND (cs.created_by = auth.uid() OR c.user_id = auth.uid() OR c.email = auth.email())
));

CREATE POLICY "Users can create activity in sessions they have access to" 
ON public.session_activity 
FOR INSERT 
WITH CHECK (user_id = auth.uid() AND EXISTS (
  SELECT 1 FROM public.collaborative_sessions cs
  LEFT JOIN public.collaborators c ON cs.id = c.session_id
  WHERE cs.id = session_activity.session_id 
  AND (cs.created_by = auth.uid() OR c.user_id = auth.uid() OR c.email = auth.email())
));

-- Create updated_at trigger for collaborative_sessions
CREATE TRIGGER update_collaborative_sessions_updated_at
BEFORE UPDATE ON public.collaborative_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for collaborative_comments
CREATE TRIGGER update_collaborative_comments_updated_at
BEFORE UPDATE ON public.collaborative_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for collaborative features
ALTER TABLE public.collaborative_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.collaborators REPLICA IDENTITY FULL;
ALTER TABLE public.collaborative_comments REPLICA IDENTITY FULL;
ALTER TABLE public.session_activity REPLICA IDENTITY FULL;