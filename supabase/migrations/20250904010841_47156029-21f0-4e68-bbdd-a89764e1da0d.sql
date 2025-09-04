-- Create enum types for assessments
CREATE TYPE public.assessment_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE public.question_type AS ENUM ('coding', 'mcq', 'subjective', 'file_upload', 'audio');
CREATE TYPE public.submission_status AS ENUM ('in_progress', 'submitted', 'evaluated');
CREATE TYPE public.difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');

-- Create assessments table
CREATE TABLE public.assessments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    instructions TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    max_attempts INTEGER DEFAULT 1,
    status assessment_status NOT NULL DEFAULT 'draft',
    creator_id UUID NOT NULL, -- Will use mock IDs for now
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create skills table for tagging
CREATE TABLE public.skills (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create questions table
CREATE TABLE public.questions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    question_type question_type NOT NULL,
    difficulty difficulty_level DEFAULT 'intermediate',
    points INTEGER NOT NULL DEFAULT 10,
    order_index INTEGER NOT NULL,
    config JSONB, -- Stores type-specific configuration (test cases, options, etc.)
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create question_skills junction table
CREATE TABLE public.question_skills (
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
    PRIMARY KEY (question_id, skill_id)
);

-- Create assessment instances (when someone takes an assessment)
CREATE TABLE public.assessment_instances (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL, -- Will use mock IDs for now
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    submitted_at TIMESTAMP WITH TIME ZONE,
    status submission_status NOT NULL DEFAULT 'in_progress',
    time_remaining_seconds INTEGER,
    current_question_index INTEGER DEFAULT 0,
    total_score DECIMAL(5,2),
    max_possible_score DECIMAL(5,2)
);

-- Create submissions table for individual question answers
CREATE TABLE public.submissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    instance_id UUID NOT NULL REFERENCES public.assessment_instances(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    answer JSONB, -- Stores the answer data (code, selected options, text, file paths, etc.)
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(instance_id, question_id)
);

-- Create evaluations table for scoring and feedback
CREATE TABLE public.evaluations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    score DECIMAL(5,2) NOT NULL,
    max_score DECIMAL(5,2) NOT NULL,
    feedback TEXT,
    ai_feedback JSONB, -- Detailed AI analysis
    evaluated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    evaluator_type TEXT DEFAULT 'ai' -- 'ai' or 'manual'
);

-- Create rubrics table for scoring criteria
CREATE TABLE public.rubrics (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    criteria TEXT NOT NULL,
    description TEXT,
    weight DECIMAL(3,2) NOT NULL DEFAULT 1.0, -- Weight in scoring (0.0 to 1.0)
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (with permissive policies for now)
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubrics ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for development (will be restricted later)
CREATE POLICY "Allow all for development" ON public.assessments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON public.skills FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON public.questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON public.question_skills FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON public.assessment_instances FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON public.submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON public.evaluations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for development" ON public.rubrics FOR ALL USING (true) WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_assessments_updated_at
    BEFORE UPDATE ON public.assessments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON public.questions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_questions_assessment_id ON public.questions(assessment_id);
CREATE INDEX idx_questions_type ON public.questions(question_type);
CREATE INDEX idx_assessment_instances_participant ON public.assessment_instances(participant_id);
CREATE INDEX idx_assessment_instances_status ON public.assessment_instances(status);
CREATE INDEX idx_submissions_instance_id ON public.submissions(instance_id);
CREATE INDEX idx_evaluations_submission_id ON public.evaluations(submission_id);

-- Insert some sample skills
INSERT INTO public.skills (name, description) VALUES
('JavaScript', 'JavaScript programming language fundamentals'),
('React', 'React framework and component development'),
('Algorithm Design', 'Problem-solving and algorithm creation'),
('Data Structures', 'Arrays, objects, trees, graphs, etc.'),
('Code Quality', 'Clean code practices and maintainability'),
('Problem Solving', 'Analytical and logical thinking'),
('Communication', 'Clear explanation of technical concepts'),
('TypeScript', 'TypeScript language features and type safety');