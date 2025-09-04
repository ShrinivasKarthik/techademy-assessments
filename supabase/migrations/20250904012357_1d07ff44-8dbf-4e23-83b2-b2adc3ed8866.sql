-- Insert sample assessments for testing
INSERT INTO public.assessments (title, description, instructions, duration_minutes, max_attempts, status, creator_id) VALUES
(
  'JavaScript Fundamentals Test',
  'Test your knowledge of JavaScript basics including variables, functions, and data structures.',
  'Please answer all questions to the best of your ability. You have 45 minutes to complete this assessment. Make sure to test your code solutions thoroughly.',
  45,
  1,
  'published',
  '00000000-0000-0000-0000-000000000001'
),
(
  'React Development Assessment',
  'Comprehensive assessment covering React components, hooks, and state management.',
  'This assessment will test your React development skills. You may use any resources except asking for help from others.',
  90,
  2,
  'published',
  '00000000-0000-0000-0000-000000000001'
),
(
  'Data Structures & Algorithms',
  'Practice assessment for algorithm design and data structure implementation.',
  'Focus on writing clean, efficient code. Explain your thought process in subjective questions.',
  60,
  1,
  'draft',
  '00000000-0000-0000-0000-000000000001'
);

-- Insert sample questions for the JavaScript assessment
INSERT INTO public.questions (assessment_id, title, description, question_type, difficulty, points, order_index, config) 
SELECT 
  a.id,
  'Array Sum Function',
  'Write a function that takes an array of numbers and returns their sum.',
  'coding',
  'beginner',
  20,
  0,
  '{
    "language": "javascript",
    "starterCode": "function arraySum(numbers) {\n  // Your code here\n}",
    "testCases": [
      {
        "input": "[1, 2, 3, 4, 5]",
        "expectedOutput": "15",
        "description": "Sum of positive numbers"
      },
      {
        "input": "[-1, 1, -2, 2]",
        "expectedOutput": "0",
        "description": "Sum with negative numbers"
      },
      {
        "input": "[]",
        "expectedOutput": "0",
        "description": "Empty array"
      }
    ]
  }'::jsonb
FROM public.assessments a 
WHERE a.title = 'JavaScript Fundamentals Test';

INSERT INTO public.questions (assessment_id, title, description, question_type, difficulty, points, order_index, config) 
SELECT 
  a.id,
  'JavaScript Concepts',
  'Which of the following are true about JavaScript?',
  'mcq',
  'intermediate',
  15,
  1,
  '{
    "options": [
      {
        "id": "1",
        "text": "JavaScript is a compiled language",
        "isCorrect": false
      },
      {
        "id": "2", 
        "text": "JavaScript supports closures",
        "isCorrect": true
      },
      {
        "id": "3",
        "text": "JavaScript is single-threaded",
        "isCorrect": true
      },
      {
        "id": "4",
        "text": "JavaScript cannot manipulate the DOM",
        "isCorrect": false
      }
    ],
    "allowMultiple": true,
    "shuffleOptions": false
  }'::jsonb
FROM public.assessments a 
WHERE a.title = 'JavaScript Fundamentals Test';

INSERT INTO public.questions (assessment_id, title, description, question_type, difficulty, points, order_index, config) 
SELECT 
  a.id,
  'Explain Event Loop',
  'Explain how the JavaScript event loop works and why it is important for asynchronous programming.',
  'subjective',
  'advanced',
  25,
  2,
  '{
    "minWords": 50,
    "maxWords": 200,
    "placeholder": "Explain the event loop concept...",
    "rubric": [
      {
        "criteria": "Understanding of event loop concept",
        "description": "Shows clear understanding of how the event loop works",
        "points": 10
      },
      {
        "criteria": "Explanation of asynchronous behavior",
        "description": "Explains how event loop enables asynchronous programming",
        "points": 10
      },
      {
        "criteria": "Clarity and examples",
        "description": "Clear explanation with relevant examples",
        "points": 5
      }
    ]
  }'::jsonb
FROM public.assessments a 
WHERE a.title = 'JavaScript Fundamentals Test';

-- Insert sample questions for React assessment
INSERT INTO public.questions (assessment_id, title, description, question_type, difficulty, points, order_index, config) 
SELECT 
  a.id,
  'React Hook Implementation',
  'Create a custom React hook for managing form state.',
  'coding',
  'intermediate',
  30,
  0,
  '{
    "language": "javascript",
    "starterCode": "import { useState } from '\''react'\'';\n\nfunction useForm(initialValues) {\n  // Implement your custom hook here\n}",
    "testCases": [
      {
        "input": "useForm({ name: '\'''\'' })",
        "expectedOutput": "Returns { values, handleChange, reset }",
        "description": "Hook returns proper interface"
      }
    ]
  }'::jsonb
FROM public.assessments a 
WHERE a.title = 'React Development Assessment';

INSERT INTO public.questions (assessment_id, title, description, question_type, difficulty, points, order_index, config) 
SELECT 
  a.id,
  'Upload Component Diagram',
  'Upload a diagram showing the component hierarchy for your React application.',
  'file_upload',
  'intermediate',
  20,
  1,
  '{
    "allowedTypes": [".png", ".jpg", ".pdf", "image/*"],
    "maxSizeBytes": 5242880,
    "maxFiles": 1,
    "instructions": "Please upload a clear diagram showing your component structure. Accepted formats: PNG, JPG, PDF (max 5MB)"
  }'::jsonb
FROM public.assessments a 
WHERE a.title = 'React Development Assessment';

INSERT INTO public.questions (assessment_id, title, description, question_type, difficulty, points, order_index, config) 
SELECT 
  a.id,
  'Explain Your Approach',
  'Record a 2-minute explanation of your problem-solving approach for the coding questions.',
  'audio',
  'intermediate',
  15,
  2,
  '{
    "maxDurationSeconds": 120,
    "allowRerecording": true,
    "instructions": "Explain your thought process and approach to solving the coding problems. Keep it under 2 minutes."
  }'::jsonb
FROM public.assessments a 
WHERE a.title = 'React Development Assessment';