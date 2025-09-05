-- Update RLS policies for questions to allow public access
DROP POLICY IF EXISTS "Users can create questions" ON public.questions;
DROP POLICY IF EXISTS "Users can delete their questions and AI-generated questions" ON public.questions;
DROP POLICY IF EXISTS "Users can update their questions" ON public.questions;
DROP POLICY IF EXISTS "Users can view their own and AI-generated questions" ON public.questions;

-- Create new policies that allow public access to questions
CREATE POLICY "Anyone can create questions" ON public.questions
FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view questions" ON public.questions
FOR SELECT USING (true);

CREATE POLICY "Anyone can update questions" ON public.questions
FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete questions" ON public.questions
FOR DELETE USING (true);