-- Create function to update proctoring session events
CREATE OR REPLACE FUNCTION update_proctoring_session_events(
  session_id uuid,
  new_event jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE proctoring_sessions 
  SET 
    security_events = COALESCE(security_events, '[]'::jsonb) || new_event::jsonb,
    updated_at = now()
  WHERE id = session_id;
END;
$$;