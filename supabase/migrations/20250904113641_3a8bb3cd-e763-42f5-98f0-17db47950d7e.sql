-- Add metadata fields to questions table for question bank functionality
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS difficulty_score NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS quality_rating NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(user_id),
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create question_collections table for organizing questions
CREATE TABLE IF NOT EXISTS public.question_collections (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    creator_id UUID NOT NULL REFERENCES public.profiles(user_id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on question_collections
ALTER TABLE public.question_collections ENABLE ROW LEVEL SECURITY;

-- Create policies for question_collections
CREATE POLICY "Users can view their own collections" 
ON public.question_collections 
FOR SELECT 
USING (creator_id = auth.uid());

CREATE POLICY "Users can create their own collections" 
ON public.question_collections 
FOR INSERT 
WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Users can update their own collections" 
ON public.question_collections 
FOR UPDATE 
USING (creator_id = auth.uid());

CREATE POLICY "Users can delete their own collections" 
ON public.question_collections 
FOR DELETE 
USING (creator_id = auth.uid());

-- Create junction table for questions in collections
CREATE TABLE IF NOT EXISTS public.collection_questions (
    collection_id UUID NOT NULL REFERENCES public.question_collections(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    PRIMARY KEY (collection_id, question_id)
);

-- Enable RLS on collection_questions
ALTER TABLE public.collection_questions ENABLE ROW LEVEL SECURITY;

-- Create policies for collection_questions
CREATE POLICY "Users can manage questions in their collections" 
ON public.collection_questions 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.question_collections 
        WHERE id = collection_id AND creator_id = auth.uid()
    )
);

-- Create trigger for updating question usage_count
CREATE OR REPLACE FUNCTION public.increment_question_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.questions 
    SET usage_count = usage_count + 1,
        last_used_at = now()
    WHERE id = NEW.question_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_question_usage_trigger
    AFTER INSERT ON public.submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.increment_question_usage();

-- Create trigger for updating updated_at on collections
CREATE TRIGGER update_question_collections_updated_at
    BEFORE UPDATE ON public.question_collections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();