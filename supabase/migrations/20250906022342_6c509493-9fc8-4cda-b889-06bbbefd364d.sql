-- Phase 1: Critical Infrastructure & Security Foundation (Fixed)

-- 1. Fix Authentication & User Management
-- Create trigger to automatically create profiles for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'user'::user_role)
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger for new user profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Fix Assessment Creator Attribution Bug
-- First, create missing profiles for any creator_ids that don't exist
INSERT INTO public.profiles (user_id, email, full_name, role)
SELECT DISTINCT 
  a.creator_id,
  'system-user-' || a.creator_id || '@example.com',
  'System User',
  'instructor'::user_role
FROM public.assessments a
WHERE a.creator_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = a.creator_id
  )
ON CONFLICT (user_id) DO NOTHING;

-- Update assessments with null creator_id to use first available admin/instructor
UPDATE public.assessments 
SET creator_id = (
  SELECT user_id FROM public.profiles 
  WHERE role IN ('admin', 'instructor') 
  ORDER BY created_at ASC
  LIMIT 1
)
WHERE creator_id IS NULL;

-- If no admin/instructor exists, create a default one
DO $$
DECLARE
  default_user_id uuid;
BEGIN
  -- Check if any assessments still have null creator_id
  IF EXISTS (SELECT 1 FROM public.assessments WHERE creator_id IS NULL) THEN
    -- Create a default admin user
    default_user_id := gen_random_uuid();
    
    INSERT INTO public.profiles (user_id, email, full_name, role)
    VALUES (
      default_user_id,
      'admin@system.local',
      'System Administrator',
      'admin'::user_role
    );
    
    -- Update remaining null assessments
    UPDATE public.assessments 
    SET creator_id = default_user_id
    WHERE creator_id IS NULL;
  END IF;
END
$$;

-- 3. Data Integrity & Schema Fixes
-- Add constraint to ensure assessments have questions before publishing
CREATE OR REPLACE FUNCTION public.validate_assessment_publish()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.status != 'published' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.questions 
      WHERE assessment_id = NEW.id AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Cannot publish assessment without active questions';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_assessment_publish_trigger ON public.assessments;
CREATE TRIGGER validate_assessment_publish_trigger
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_assessment_publish();

-- 4. File Management System
-- Create storage bucket for file uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('assessment-files', 'assessment-files', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for file management
DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;
CREATE POLICY "Users can upload their own files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'assessment-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
CREATE POLICY "Users can view their own files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'assessment-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'assessment-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create file metadata table
CREATE TABLE IF NOT EXISTS public.assessment_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES public.assessments(id) ON DELETE CASCADE,
  question_id uuid REFERENCES public.questions(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  content_type text NOT NULL,
  uploaded_by uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on assessment_files
ALTER TABLE public.assessment_files ENABLE ROW LEVEL SECURITY;

-- Create policies for assessment files
DROP POLICY IF EXISTS "Users can manage files for their assessments" ON public.assessment_files;
CREATE POLICY "Users can manage files for their assessments"
ON public.assessment_files
FOR ALL
USING (
  uploaded_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = assessment_id AND a.creator_id = auth.uid()
  )
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_assessments_creator_id ON public.assessments(creator_id);
CREATE INDEX IF NOT EXISTS idx_questions_assessment_id ON public.questions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_files_assessment_id ON public.assessment_files(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_files_question_id ON public.assessment_files(question_id);

-- Add updated_at trigger for assessment_files
DROP TRIGGER IF EXISTS update_assessment_files_updated_at ON public.assessment_files;
CREATE TRIGGER update_assessment_files_updated_at
  BEFORE UPDATE ON public.assessment_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();