-- Now add unique constraint after duplicates are removed
ALTER TABLE evaluations 
ADD CONSTRAINT unique_evaluation_per_submission 
UNIQUE (submission_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_evaluations_submission_id 
ON evaluations (submission_id);