-- Add missing evaluated_at column to assessment_instances table
ALTER TABLE public.assessment_instances 
ADD COLUMN IF NOT EXISTS evaluated_at TIMESTAMP WITH TIME ZONE;