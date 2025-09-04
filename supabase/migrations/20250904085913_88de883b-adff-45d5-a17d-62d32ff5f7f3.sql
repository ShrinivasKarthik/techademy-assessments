-- Add missing foreign key relationships and improve database schema
ALTER TABLE assessments 
ADD CONSTRAINT fk_assessments_creator 
FOREIGN KEY (creator_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

ALTER TABLE questions 
ADD CONSTRAINT fk_questions_assessment 
FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE;

ALTER TABLE assessment_instances 
ADD CONSTRAINT fk_instances_assessment 
FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_instances_participant 
FOREIGN KEY (participant_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

ALTER TABLE submissions 
ADD CONSTRAINT fk_submissions_question 
FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_submissions_instance 
FOREIGN KEY (instance_id) REFERENCES assessment_instances(id) ON DELETE CASCADE;

ALTER TABLE evaluations 
ADD CONSTRAINT fk_evaluations_submission 
FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE;

ALTER TABLE proctoring_sessions 
ADD CONSTRAINT fk_proctoring_instance 
FOREIGN KEY (assessment_instance_id) REFERENCES assessment_instances(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_proctoring_participant 
FOREIGN KEY (participant_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

ALTER TABLE rubrics 
ADD CONSTRAINT fk_rubrics_question 
FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE;

ALTER TABLE question_skills 
ADD CONSTRAINT fk_question_skills_question 
FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
ADD CONSTRAINT fk_question_skills_skill 
FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE;

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

-- Add data validation triggers
CREATE OR REPLACE FUNCTION validate_assessment_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate duration is positive
  IF NEW.duration_minutes <= 0 THEN
    RAISE EXCEPTION 'Assessment duration must be positive';
  END IF;
  
  -- Validate status transitions
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF OLD.status = 'published' AND NEW.status = 'draft' THEN
      RAISE EXCEPTION 'Cannot change published assessment back to draft';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_assessment_trigger
BEFORE INSERT OR UPDATE ON assessments
FOR EACH ROW EXECUTE FUNCTION validate_assessment_data();

-- Trigger to auto-update question count
CREATE OR REPLACE FUNCTION update_assessment_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Update assessment metadata when questions change
  UPDATE assessments 
  SET updated_at = now()
  WHERE id = COALESCE(NEW.assessment_id, OLD.assessment_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_assessment_metadata_trigger
AFTER INSERT OR UPDATE OR DELETE ON questions
FOR EACH ROW EXECUTE FUNCTION update_assessment_metadata();