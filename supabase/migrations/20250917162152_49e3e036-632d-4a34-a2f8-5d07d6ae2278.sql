-- First, delete duplicate evaluations, keeping only the latest for each submission_id
DELETE FROM evaluations
WHERE id NOT IN (
    SELECT DISTINCT ON (submission_id) id
    FROM evaluations
    ORDER BY submission_id, evaluated_at DESC
);

-- Now add unique constraint 
ALTER TABLE evaluations 
ADD CONSTRAINT unique_evaluation_per_submission 
UNIQUE (submission_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_evaluations_submission_id 
ON evaluations (submission_id);