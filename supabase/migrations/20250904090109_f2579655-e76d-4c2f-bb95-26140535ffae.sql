-- Add missing foreign key relationships (check if they exist first)
DO $$ 
BEGIN
  -- Add foreign keys only if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'fk_questions_assessment') THEN
    ALTER TABLE questions 
    ADD CONSTRAINT fk_questions_assessment 
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'fk_instances_assessment') THEN
    ALTER TABLE assessment_instances 
    ADD CONSTRAINT fk_instances_assessment 
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'fk_instances_participant') THEN
    ALTER TABLE assessment_instances 
    ADD CONSTRAINT fk_instances_participant 
    FOREIGN KEY (participant_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'fk_submissions_question') THEN
    ALTER TABLE submissions 
    ADD CONSTRAINT fk_submissions_question 
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'fk_submissions_instance') THEN
    ALTER TABLE submissions 
    ADD CONSTRAINT fk_submissions_instance 
    FOREIGN KEY (instance_id) REFERENCES assessment_instances(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'fk_evaluations_submission') THEN
    ALTER TABLE evaluations 
    ADD CONSTRAINT fk_evaluations_submission 
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'fk_proctoring_instance') THEN
    ALTER TABLE proctoring_sessions 
    ADD CONSTRAINT fk_proctoring_instance 
    FOREIGN KEY (assessment_instance_id) REFERENCES assessment_instances(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'fk_proctoring_participant') THEN
    ALTER TABLE proctoring_sessions 
    ADD CONSTRAINT fk_proctoring_participant 
    FOREIGN KEY (participant_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_assessments_creator_status 
ON assessments(creator_id, status);

CREATE INDEX IF NOT EXISTS idx_questions_assessment_order 
ON questions(assessment_id, order_index);

CREATE INDEX IF NOT EXISTS idx_instances_participant_status 
ON assessment_instances(participant_id, status);

CREATE INDEX IF NOT EXISTS idx_instances_assessment_created 
ON assessment_instances(assessment_id, started_at);

CREATE INDEX IF NOT EXISTS idx_submissions_instance_question 
ON submissions(instance_id, question_id);

CREATE INDEX IF NOT EXISTS idx_proctoring_participant_status 
ON proctoring_sessions(participant_id, status);

-- Enable real-time for all tables
ALTER TABLE assessments REPLICA IDENTITY FULL;
ALTER TABLE questions REPLICA IDENTITY FULL;
ALTER TABLE assessment_instances REPLICA IDENTITY FULL;
ALTER TABLE submissions REPLICA IDENTITY FULL;
ALTER TABLE evaluations REPLICA IDENTITY FULL;
ALTER TABLE proctoring_sessions REPLICA IDENTITY FULL;
ALTER TABLE profiles REPLICA IDENTITY FULL;

-- Add tables to real-time publication
ALTER PUBLICATION supabase_realtime ADD TABLE assessments;
ALTER PUBLICATION supabase_realtime ADD TABLE questions;
ALTER PUBLICATION supabase_realtime ADD TABLE assessment_instances;
ALTER PUBLICATION supabase_realtime ADD TABLE submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE evaluations;
ALTER PUBLICATION supabase_realtime ADD TABLE proctoring_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;