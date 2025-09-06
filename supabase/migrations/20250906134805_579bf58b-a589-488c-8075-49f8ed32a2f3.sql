-- Update assessment instances to be in_progress instead of submitted for testing
UPDATE assessment_instances 
SET status = 'in_progress', 
    session_state = 'in_progress',
    time_remaining_seconds = 3600
WHERE status = 'submitted' 
AND assessment_id IN (
  SELECT id FROM assessments WHERE live_monitoring_enabled = true
);