-- Fix the find_or_create_anonymous_instance function to handle missing fields properly
CREATE OR REPLACE FUNCTION public.find_or_create_anonymous_instance(
  p_assessment_id uuid, 
  p_share_token text, 
  p_participant_name text DEFAULT NULL::text, 
  p_participant_email text DEFAULT NULL::text, 
  p_duration_minutes integer DEFAULT 60
)
RETURNS TABLE(instance_data json, should_redirect_to_results boolean, attempts_remaining integer, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_instance public.assessment_instances;
  completed_attempts_count integer;
  max_attempts_allowed integer;
  assessment_data record;
BEGIN
  -- Get assessment data and max attempts
  SELECT duration_minutes, max_attempts INTO assessment_data
  FROM public.assessments
  WHERE id = p_assessment_id;
  
  max_attempts_allowed := COALESCE(assessment_data.max_attempts, 1);
  
  -- Count completed attempts for this email/token combination
  SELECT COUNT(*) INTO completed_attempts_count
  FROM public.assessment_instances
  WHERE share_token = p_share_token
    AND assessment_id = p_assessment_id
    AND is_anonymous = true
    AND status = 'submitted'
    AND participant_email = p_participant_email;
  
  -- Check if attempts are exhausted
  IF completed_attempts_count >= max_attempts_allowed THEN
    RETURN QUERY SELECT 
      NULL::json,
      false,
      0,
      'Maximum attempts reached. No more attempts allowed.'::text;
    RETURN;
  END IF;
  
  -- Always create a fresh instance for each attempt
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
      started_at,
      questions_answered,
      duration_taken_seconds,
      integrity_score,
      proctoring_summary,
      proctoring_violations,
      proctoring_started_at,
      max_possible_score,
      total_score,
      submitted_at,
      evaluation_timeout_at,
      evaluation_status,
      evaluation_retry_count
    ) VALUES (
      p_assessment_id,
      NULL, -- Anonymous user
      p_participant_name,
      p_participant_email,
      true,
      p_share_token,
      'in_progress',
      'not_started',
      COALESCE(assessment_data.duration_minutes, p_duration_minutes) * 60,
      0,
      now(),
      0, -- questions_answered
      NULL, -- duration_taken_seconds
      100, -- integrity_score
      '{"integrity_score": 100, "technical_issues": [], "violations_count": 0}'::jsonb, -- proctoring_summary
      '[]'::jsonb, -- proctoring_violations
      NULL, -- proctoring_started_at
      NULL, -- max_possible_score
      NULL, -- total_score
      NULL, -- submitted_at
      NULL, -- evaluation_timeout_at
      'not_started', -- evaluation_status
      0 -- evaluation_retry_count
    )
    RETURNING * INTO new_instance;
    
    RETURN QUERY SELECT 
      row_to_json(new_instance)::json,
      false,
      max_attempts_allowed - completed_attempts_count - 1, -- Subtract 1 for current attempt
      format('Attempt %s of %s started', completed_attempts_count + 1, max_attempts_allowed)::text;
    
  EXCEPTION WHEN OTHERS THEN
    -- If insertion fails for any reason, return detailed error
    RETURN QUERY SELECT 
      NULL::json,
      false,
      max_attempts_allowed - completed_attempts_count,
      format('Failed to create assessment instance: %s', SQLERRM)::text;
  END;
END;
$function$;