-- Add proctoring configuration to assessments table
ALTER TABLE public.assessments ADD COLUMN proctoring_enabled boolean DEFAULT false;
ALTER TABLE public.assessments ADD COLUMN proctoring_config jsonb DEFAULT '{
  "cameraRequired": true,
  "microphoneRequired": true,
  "screenSharing": false,
  "tabSwitchDetection": true,
  "fullscreenRequired": true,
  "faceDetection": true,
  "voiceAnalysis": false,
  "environmentCheck": true,
  "browserLockdown": true,
  "autoStart": false,
  "requireProctorApproval": false
}'::jsonb;

-- Add session state to assessment_instances
ALTER TABLE public.assessment_instances ADD COLUMN session_state text DEFAULT 'not_started' CHECK (session_state IN ('not_started', 'proctoring_setup', 'proctoring_check', 'in_progress', 'paused', 'submitted', 'evaluated'));
ALTER TABLE public.assessment_instances ADD COLUMN proctoring_started_at timestamp with time zone;
ALTER TABLE public.assessment_instances ADD COLUMN proctoring_violations jsonb DEFAULT '[]'::jsonb;

-- Create proctoring_sessions table for real-time tracking
CREATE TABLE public.proctoring_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_instance_id uuid NOT NULL,
  participant_id uuid NOT NULL,
  status text DEFAULT 'initializing' CHECK (status IN ('initializing', 'active', 'paused', 'stopped', 'ended')),
  permissions jsonb DEFAULT '{}'::jsonb,
  security_events jsonb DEFAULT '[]'::jsonb,
  monitoring_data jsonb DEFAULT '{}'::jsonb,
  started_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on proctoring_sessions
ALTER TABLE public.proctoring_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy for proctoring_sessions
CREATE POLICY "Allow all for development" 
ON public.proctoring_sessions 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create trigger for proctoring_sessions updated_at
CREATE TRIGGER update_proctoring_sessions_updated_at
  BEFORE UPDATE ON public.proctoring_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();