-- First, clean up the inconsistent data where anonymous instances have participant_id set
UPDATE assessment_instances 
SET participant_id = NULL 
WHERE is_anonymous = true AND participant_id IS NOT NULL;

-- Improve the find_or_create_anonymous_instance function to be more robust
CREATE OR REPLACE FUNCTION public.find_or_create_anonymous_instance(
  p_assessment_id uuid, 
  p_share_token text, 
  p_participant_name text DEFAULT NULL::text, 
  p_participant_email text DEFAULT NULL::text, 
  p_duration_minutes integer DEFAULT 60
)
RETURNS assessment_instances
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  existing_instance public.assessment_instances;
  new_instance public.assessment_instances;
BEGIN
  -- First try to find existing anonymous instance (with better error handling)
  BEGIN
    SELECT * INTO existing_instance
    FROM public.assessment_instances
    WHERE share_token = p_share_token
      AND is_anonymous = true
      AND participant_id IS NULL
      AND assessment_id = p_assessment_id
      AND status != 'submitted'
    ORDER BY started_at DESC
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    existing_instance := NULL;
  END;

  -- If found and not submitted, update it and return
  IF existing_instance.id IS NOT NULL THEN
    -- Update participant info if provided
    BEGIN
      UPDATE public.assessment_instances
      SET 
        participant_name = COALESCE(p_participant_name, participant_name),
        participant_email = COALESCE(p_participant_email, participant_email)
      WHERE id = existing_instance.id;
      
      -- Refresh the record
      SELECT * INTO existing_instance
      FROM public.assessment_instances
      WHERE id = existing_instance.id;
      
      RETURN existing_instance;
    EXCEPTION WHEN OTHERS THEN
      -- If update fails, continue to create new instance
      NULL;
    END;
  END IF;

  -- Create new instance with conflict handling
  BEGIN
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
  EXCEPTION WHEN unique_violation THEN
    -- If there's a unique constraint violation, try to find the existing one again
    SELECT * INTO existing_instance
    FROM public.assessment_instances
    WHERE share_token = p_share_token
      AND is_anonymous = true
      AND participant_id IS NULL
      AND assessment_id = p_assessment_id
    ORDER BY started_at DESC
    LIMIT 1;
    
    IF existing_instance.id IS NOT NULL THEN
      RETURN existing_instance;
    ELSE
      -- If we still can't find it, something is wrong
      RAISE EXCEPTION 'Unable to create or find anonymous assessment instance';
    END IF;
  END;
END;
$function$;