-- Add live monitoring control to assessments table
ALTER TABLE public.assessments 
ADD COLUMN live_monitoring_enabled boolean NOT NULL DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.assessments.live_monitoring_enabled IS 'Controls whether real-time monitoring is available for this assessment. Separate from proctoring_enabled.';

-- Enable realtime for assessment_instances table for live monitoring
ALTER TABLE public.assessment_instances REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assessment_instances;

-- Enable realtime for proctoring_sessions table for live monitoring
ALTER TABLE public.proctoring_sessions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.proctoring_sessions;