-- Add duration tracking and questions answered count to assessment instances
ALTER TABLE assessment_instances 
ADD COLUMN IF NOT EXISTS duration_taken_seconds INTEGER,
ADD COLUMN IF NOT EXISTS questions_answered INTEGER DEFAULT 0;

-- Update existing instances to calculate questions answered
UPDATE assessment_instances 
SET questions_answered = (
  SELECT COUNT(DISTINCT question_id) 
  FROM submissions 
  WHERE submissions.instance_id = assessment_instances.id
);

-- Create function to automatically update questions_answered on submission
CREATE OR REPLACE FUNCTION update_questions_answered()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE assessment_instances 
  SET questions_answered = (
    SELECT COUNT(DISTINCT question_id) 
    FROM submissions 
    WHERE submissions.instance_id = NEW.instance_id
  )
  WHERE id = NEW.instance_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update questions_answered when submissions are added/updated
DROP TRIGGER IF EXISTS trigger_update_questions_answered ON submissions;
CREATE TRIGGER trigger_update_questions_answered
  AFTER INSERT OR UPDATE ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_questions_answered();