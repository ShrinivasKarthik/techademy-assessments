-- Fix the increment_question_usage function to have proper search_path
CREATE OR REPLACE FUNCTION public.increment_question_usage()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.questions 
    SET usage_count = usage_count + 1,
        last_used_at = now()
    WHERE id = NEW.question_id;
    RETURN NEW;
END;
$$;