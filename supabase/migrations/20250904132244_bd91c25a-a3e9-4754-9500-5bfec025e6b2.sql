-- Create a special "Question Bank" assessment to hold standalone questions
INSERT INTO assessments (
  id,
  title,
  description,
  creator_id,
  status,
  duration_minutes
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Question Bank',
  'Virtual assessment container for standalone questions in the question bank',
  '00000000-0000-0000-0000-000000000001',
  'draft',
  0
) ON CONFLICT (id) DO NOTHING;

-- Now insert the test question
INSERT INTO questions (
  title, 
  question_text, 
  question_type, 
  difficulty, 
  points, 
  config, 
  tags, 
  order_index, 
  assessment_id
) VALUES (
  'Test Python Function', 
  'Write a Python function that takes two numbers and returns their sum.', 
  'coding', 
  'beginner', 
  10, 
  '{"language": "python", "max_lines": 5}', 
  ARRAY['python', 'functions'], 
  0, 
  '00000000-0000-0000-0000-000000000000'
);