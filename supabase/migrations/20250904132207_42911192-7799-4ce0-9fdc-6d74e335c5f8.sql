-- Insert a test standalone question to verify the Question Bank functionality
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