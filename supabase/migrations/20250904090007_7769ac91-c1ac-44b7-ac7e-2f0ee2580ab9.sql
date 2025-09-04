-- First, create missing profiles for existing assessments
INSERT INTO profiles (user_id, email, full_name, role)
SELECT DISTINCT 
  a.creator_id,
  'admin@example.com',
  'System Admin',
  'admin'::user_role
FROM assessments a
LEFT JOIN profiles p ON a.creator_id = p.user_id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Now add the foreign key constraints
ALTER TABLE assessments 
ADD CONSTRAINT fk_assessments_creator 
FOREIGN KEY (creator_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

ALTER TABLE questions 
ADD CONSTRAINT fk_questions_assessment 
FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE;

-- Fix any orphaned instances by creating missing profile entries
INSERT INTO profiles (user_id, email, full_name, role)
SELECT DISTINCT 
  ai.participant_id,
  'participant@example.com',
  'System Participant',
  'student'::user_role
FROM assessment_instances ai
LEFT JOIN profiles p ON ai.participant_id = p.user_id
WHERE p.user_id IS NULL AND ai.participant_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

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

-- Fix proctoring sessions participant references
INSERT INTO profiles (user_id, email, full_name, role)
SELECT DISTINCT 
  ps.participant_id,
  'participant@example.com',
  'System Participant',
  'student'::user_role
FROM proctoring_sessions ps
LEFT JOIN profiles p ON ps.participant_id = p.user_id
WHERE p.user_id IS NULL AND ps.participant_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

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