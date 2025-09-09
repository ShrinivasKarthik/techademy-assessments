-- Add interview to question_type enum
ALTER TYPE question_type ADD VALUE 'interview';

-- Create interview_sessions table to track conversation state
CREATE TABLE interview_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES questions(id) ON DELETE CASCADE,
  instance_id uuid REFERENCES assessment_instances(id) ON DELETE CASCADE,
  conversation_log jsonb DEFAULT '[]'::jsonb,
  current_state text DEFAULT 'intro',
  evaluation_criteria jsonb DEFAULT '{}'::jsonb,
  final_score numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create interview_responses table for detailed conversation tracking
CREATE TABLE interview_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES interview_sessions(id) ON DELETE CASCADE,
  speaker text NOT NULL CHECK (speaker IN ('user', 'assistant')),
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'audio')),
  content text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS on new tables
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_responses ENABLE ROW LEVEL SECURITY;

-- Create policies for interview_sessions
CREATE POLICY "Users can manage their interview sessions" ON interview_sessions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM assessment_instances ai 
    WHERE ai.id = interview_sessions.instance_id 
    AND (ai.participant_id = auth.uid() OR ai.share_token IS NOT NULL)
  )
);

-- Create policies for interview_responses  
CREATE POLICY "Users can manage their interview responses" ON interview_responses
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM interview_sessions s
    JOIN assessment_instances ai ON ai.id = s.instance_id
    WHERE s.id = interview_responses.session_id 
    AND (ai.participant_id = auth.uid() OR ai.share_token IS NOT NULL)
  )
);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_interview_sessions_updated_at
    BEFORE UPDATE ON interview_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_interview_sessions_question_id ON interview_sessions(question_id);
CREATE INDEX idx_interview_sessions_instance_id ON interview_sessions(instance_id);
CREATE INDEX idx_interview_responses_session_id ON interview_responses(session_id);
CREATE INDEX idx_interview_responses_timestamp ON interview_responses(timestamp);