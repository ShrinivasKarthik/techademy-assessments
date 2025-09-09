-- Create cleanup function for stuck assessment instances
CREATE OR REPLACE FUNCTION cleanup_stuck_assessment_instances(p_share_token text)
RETURNS TABLE(cleaned_count integer, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  stuck_count integer;
BEGIN
  -- Count stuck instances (in_progress but session_state is not_started for more than 5 minutes)
  SELECT COUNT(*) INTO stuck_count
  FROM assessment_instances
  WHERE share_token = p_share_token
    AND status = 'in_progress'
    AND session_state = 'not_started'
    AND started_at < now() - interval '5 minutes';
  
  -- Update stuck instances to submitted status
  UPDATE assessment_instances 
  SET 
    status = 'submitted',
    submitted_at = now(),
    duration_taken_seconds = EXTRACT(EPOCH FROM (now() - started_at))::integer,
    session_state = 'submitted'
  WHERE share_token = p_share_token
    AND status = 'in_progress'
    AND session_state = 'not_started'
    AND started_at < now() - interval '5 minutes';
  
  RETURN QUERY SELECT 
    stuck_count,
    CASE 
      WHEN stuck_count > 0 THEN format('Cleaned up %s stuck instances', stuck_count)
      ELSE 'No stuck instances found'
    END;
END;
$function$;