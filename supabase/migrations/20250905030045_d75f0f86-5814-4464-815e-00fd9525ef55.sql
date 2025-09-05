-- Delete hardcoded/mock assessments but keep user-created ones
DELETE FROM assessments 
WHERE creator_id = '00000000-0000-0000-0000-000000000001' 
   OR creator_id = '00000000-0000-0000-0000-000000000000'
   OR title IN ('Question Bank', 'JavaScript Fundamentals Test', 'React Development Assessment', 'Data Structures & Algorithms');

-- Also delete associated questions for these assessments
DELETE FROM questions 
WHERE assessment_id IN (
  SELECT id FROM assessments 
  WHERE creator_id = '00000000-0000-0000-0000-000000000001' 
     OR creator_id = '00000000-0000-0000-0000-000000000000'
     OR title IN ('Question Bank', 'JavaScript Fundamentals Test', 'React Development Assessment', 'Data Structures & Algorithms')
);