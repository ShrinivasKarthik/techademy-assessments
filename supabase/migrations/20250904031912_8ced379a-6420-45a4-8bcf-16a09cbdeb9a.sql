-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('admin', 'instructor', 'student', 'user');

-- Update profiles table to use the enum
ALTER TABLE public.profiles 
ALTER COLUMN role TYPE user_role USING role::user_role;

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add trigger for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update assessments table to use user_id instead of creator_id
ALTER TABLE public.assessments 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing data (if any)
UPDATE public.assessments 
SET user_id = creator_id 
WHERE creator_id IS NOT NULL;

-- Drop old creator_id column
ALTER TABLE public.assessments DROP COLUMN IF EXISTS creator_id;

-- Update assessment_instances to use proper user reference
ALTER TABLE public.assessment_instances 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing data
UPDATE public.assessment_instances 
SET user_id = participant_id 
WHERE participant_id IS NOT NULL;

-- Drop old participant_id column
ALTER TABLE public.assessment_instances DROP COLUMN IF EXISTS participant_id;

-- Update RLS policies for assessments
DROP POLICY IF EXISTS "Allow all for development" ON public.assessments;

CREATE POLICY "Users can view their own assessments" 
ON public.assessments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assessments" 
ON public.assessments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assessments" 
ON public.assessments 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assessments" 
ON public.assessments 
FOR DELETE 
USING (auth.uid() = user_id);

-- Admin policies for assessments
CREATE POLICY "Admins can view all assessments" 
ON public.assessments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Update RLS policies for assessment_instances
DROP POLICY IF EXISTS "Allow all for development" ON public.assessment_instances;

CREATE POLICY "Users can view their own instances" 
ON public.assessment_instances 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own instances" 
ON public.assessment_instances 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own instances" 
ON public.assessment_instances 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Update other tables with proper RLS
DROP POLICY IF EXISTS "Allow all for development" ON public.questions;
DROP POLICY IF EXISTS "Allow all for development" ON public.submissions;
DROP POLICY IF EXISTS "Allow all for development" ON public.evaluations;
DROP POLICY IF EXISTS "Allow all for development" ON public.rubrics;
DROP POLICY IF EXISTS "Allow all for development" ON public.skills;
DROP POLICY IF EXISTS "Allow all for development" ON public.question_skills;

-- Questions policies (linked through assessments)
CREATE POLICY "Users can view questions from their assessments" 
ON public.questions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.assessments 
    WHERE id = questions.assessment_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create questions for their assessments" 
ON public.questions 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.assessments 
    WHERE id = questions.assessment_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update questions from their assessments" 
ON public.questions 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.assessments 
    WHERE id = questions.assessment_id AND user_id = auth.uid()
  )
);

-- Submissions policies (linked through instances)
CREATE POLICY "Users can view their own submissions" 
ON public.submissions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.assessment_instances 
    WHERE id = submissions.instance_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own submissions" 
ON public.submissions 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.assessment_instances 
    WHERE id = submissions.instance_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own submissions" 
ON public.submissions 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.assessment_instances 
    WHERE id = submissions.instance_id AND user_id = auth.uid()
  )
);

-- Public access for skills (everyone can read)
CREATE POLICY "Everyone can view skills" 
ON public.skills 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage skills" 
ON public.skills 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Question skills policies
CREATE POLICY "Users can view question skills for their questions" 
ON public.question_skills 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.questions q
    JOIN public.assessments a ON q.assessment_id = a.id
    WHERE q.id = question_skills.question_id AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage question skills for their questions" 
ON public.question_skills 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.questions q
    JOIN public.assessments a ON q.assessment_id = a.id
    WHERE q.id = question_skills.question_id AND a.user_id = auth.uid()
  )
);

-- Rubrics policies
CREATE POLICY "Users can view rubrics for their questions" 
ON public.rubrics 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.questions q
    JOIN public.assessments a ON q.assessment_id = a.id
    WHERE q.id = rubrics.question_id AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage rubrics for their questions" 
ON public.rubrics 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.questions q
    JOIN public.assessments a ON q.assessment_id = a.id
    WHERE q.id = rubrics.question_id AND a.user_id = auth.uid()
  )
);

-- Evaluations policies
CREATE POLICY "Users can view evaluations for their submissions" 
ON public.evaluations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.submissions s
    JOIN public.assessment_instances ai ON s.instance_id = ai.id
    WHERE s.id = evaluations.submission_id AND ai.user_id = auth.uid()
  )
);

CREATE POLICY "System can create evaluations" 
ON public.evaluations 
FOR INSERT 
WITH CHECK (true);