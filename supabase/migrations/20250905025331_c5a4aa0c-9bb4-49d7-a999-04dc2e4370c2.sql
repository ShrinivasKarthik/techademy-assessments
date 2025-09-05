-- Update RLS policies for assessments to allow public access
DROP POLICY IF EXISTS "Allow all for development" ON public.assessments;

-- Create new policies that allow public access to assessments  
CREATE POLICY "Anyone can view assessments" ON public.assessments
FOR SELECT USING (true);

CREATE POLICY "Anyone can create assessments" ON public.assessments
FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update assessments" ON public.assessments
FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete assessments" ON public.assessments
FOR DELETE USING (true);