-- Enable realtime for assessment_instances table
ALTER TABLE public.assessment_instances REPLICA IDENTITY FULL;

-- Add assessment_instances to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.assessment_instances;