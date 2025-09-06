-- Add live monitoring control to assessments table
ALTER TABLE public.assessments 
ADD COLUMN live_monitoring_enabled boolean NOT NULL DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.assessments.live_monitoring_enabled IS 'Controls whether real-time monitoring is available for this assessment. Separate from proctoring_enabled.';