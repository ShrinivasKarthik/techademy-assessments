-- Add unique constraint to prevent duplicate evaluations
ALTER TABLE evaluations 
ADD CONSTRAINT unique_evaluation_per_submission 
UNIQUE (submission_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_evaluations_submission_id 
ON evaluations (submission_id);