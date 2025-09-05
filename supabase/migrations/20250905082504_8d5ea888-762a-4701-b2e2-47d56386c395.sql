-- Clean up duplicate anonymous instances first
WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY share_token, is_anonymous 
           ORDER BY started_at DESC
         ) as rn
  FROM public.assessment_instances 
  WHERE is_anonymous = true AND participant_id IS NULL
)
DELETE FROM public.assessment_instances 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Now add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX idx_assessment_instances_anonymous_unique 
ON public.assessment_instances (share_token, is_anonymous) 
WHERE is_anonymous = true AND participant_id IS NULL;

-- Create function to safely find or create anonymous instance
CREATE OR REPLACE FUNCTION public.find_or_create_anonymous_instance(
  p_assessment_id UUID,
  p_share_token TEXT,
  p_participant_name TEXT DEFAULT NULL,
  p_participant_email TEXT DEFAULT NULL,
  p_duration_minutes INTEGER DEFAULT 60
) RETURNS public.assessment_instances
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_instance public.assessment_instances;
  new_instance public.assessment_instances;
BEGIN
  -- First try to find existing anonymous instance
  SELECT * INTO existing_instance
  FROM public.assessment_instances
  WHERE share_token = p_share_token
    AND is_anonymous = true
    AND participant_id IS NULL
    AND assessment_id = p_assessment_id
  ORDER BY started_at DESC
  LIMIT 1;

  -- If found and not submitted, return it
  IF existing_instance.id IS NOT NULL AND existing_instance.status != 'submitted' THEN
    -- Update participant info if provided
    IF p_participant_name IS NOT NULL OR p_participant_email IS NOT NULL THEN
      UPDATE public.assessment_instances
      SET 
        participant_name = COALESCE(p_participant_name, participant_name),
        participant_email = COALESCE(p_participant_email, participant_email)
      WHERE id = existing_instance.id;
      
      -- Refresh the record
      SELECT * INTO existing_instance
      FROM public.assessment_instances
      WHERE id = existing_instance.id;
    END IF;
    
    RETURN existing_instance;
  END IF;

  -- Create new instance if none exists or previous was submitted
  INSERT INTO public.assessment_instances (
    assessment_id,
    participant_id,
    participant_name,
    participant_email,
    is_anonymous,
    share_token,
    status,
    session_state,
    time_remaining_seconds,
    current_question_index,
    started_at
  ) VALUES (
    p_assessment_id,
    NULL, -- Anonymous user
    p_participant_name,
    p_participant_email,
    true,
    p_share_token,
    'in_progress',
    'not_started',
    p_duration_minutes * 60,
    0,
    now()
  )
  RETURNING * INTO new_instance;

  RETURN new_instance;
END;
$$;

-- Update proctoring_sessions to handle null participant_id properly
ALTER TABLE public.proctoring_sessions 
ALTER COLUMN participant_id DROP NOT NULL;