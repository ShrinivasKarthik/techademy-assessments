-- Fix function search path security issue
ALTER FUNCTION update_questions_answered() 
SET search_path TO 'public';