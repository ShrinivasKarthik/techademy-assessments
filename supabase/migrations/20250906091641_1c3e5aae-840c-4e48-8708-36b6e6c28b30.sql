-- Create proctoring summary fields in assessment_instances
ALTER TABLE public.assessment_instances 
ADD COLUMN IF NOT EXISTS proctoring_summary jsonb DEFAULT '{"violations_count": 0, "integrity_score": 100, "technical_issues": []}'::jsonb,
ADD COLUMN IF NOT EXISTS integrity_score numeric DEFAULT 100;

-- Create proctoring_reports table for detailed analysis
CREATE TABLE IF NOT EXISTS public.proctoring_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_instance_id uuid NOT NULL,
  participant_id uuid,
  assessment_id uuid NOT NULL,
  report_data jsonb NOT NULL DEFAULT '{}',
  integrity_score numeric DEFAULT 100,
  violations_summary jsonb DEFAULT '[]'::jsonb,
  recommendations text,
  status text DEFAULT 'generated',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on proctoring_reports
ALTER TABLE public.proctoring_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for proctoring_reports
CREATE POLICY "Users can view their proctoring reports" 
ON public.proctoring_reports 
FOR SELECT 
USING (
  participant_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM assessment_instances ai 
    WHERE ai.id = proctoring_reports.assessment_instance_id 
    AND ai.participant_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM assessments a 
    WHERE a.id = proctoring_reports.assessment_id 
    AND a.creator_id = auth.uid()
  )
);

CREATE POLICY "System can manage proctoring reports" 
ON public.proctoring_reports 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Add integrity_score to evaluations table
ALTER TABLE public.evaluations 
ADD COLUMN IF NOT EXISTS integrity_score numeric DEFAULT 100,
ADD COLUMN IF NOT EXISTS proctoring_notes text;

-- Create updated_at trigger for proctoring_reports
CREATE TRIGGER update_proctoring_reports_updated_at
BEFORE UPDATE ON public.proctoring_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();