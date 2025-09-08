-- Add evaluation_status field to assessment_instances table
ALTER TABLE public.assessment_instances 
ADD COLUMN evaluation_status TEXT DEFAULT 'not_started'::text;

-- Add check constraint for valid evaluation_status values
ALTER TABLE public.assessment_instances 
ADD CONSTRAINT assessment_instances_evaluation_status_check 
CHECK (evaluation_status IN ('not_started', 'in_progress', 'completed', 'failed', 'timeout'));

-- Add index for evaluation_status queries
CREATE INDEX idx_assessment_instances_evaluation_status 
ON public.assessment_instances(evaluation_status);

-- Add evaluation_timeout_at field for timeout tracking
ALTER TABLE public.assessment_instances 
ADD COLUMN evaluation_timeout_at TIMESTAMP WITH TIME ZONE;

-- Add evaluation_retry_count for retry tracking
ALTER TABLE public.assessment_instances 
ADD COLUMN evaluation_retry_count INTEGER DEFAULT 0;