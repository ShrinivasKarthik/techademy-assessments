-- Add advanced organization and version control features

-- Add version control to questions
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_question_id UUID REFERENCES public.questions(id),
ADD COLUMN IF NOT EXISTS change_summary TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create question templates table
CREATE TABLE IF NOT EXISTS public.question_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    question_type USER-DEFINED NOT NULL,
    template_config JSONB NOT NULL DEFAULT '{}',
    creator_id UUID NOT NULL REFERENCES public.profiles(user_id),
    is_public BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on question_templates
ALTER TABLE public.question_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for question_templates
CREATE POLICY "Users can view public templates and their own templates" 
ON public.question_templates 
FOR SELECT 
USING (is_public = true OR creator_id = auth.uid());

CREATE POLICY "Users can create their own templates" 
ON public.question_templates 
FOR INSERT 
WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Users can update their own templates" 
ON public.question_templates 
FOR UPDATE 
USING (creator_id = auth.uid());

CREATE POLICY "Users can delete their own templates" 
ON public.question_templates 
FOR DELETE 
USING (creator_id = auth.uid());

-- Enhance question_collections for folder hierarchy
ALTER TABLE public.question_collections 
ADD COLUMN IF NOT EXISTS parent_collection_id UUID REFERENCES public.question_collections(id),
ADD COLUMN IF NOT EXISTS collection_type TEXT DEFAULT 'folder',
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT 'blue',
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Create question_versions table for detailed version history
CREATE TABLE IF NOT EXISTS public.question_versions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    config JSONB,
    tags TEXT[],
    difficulty USER-DEFINED,
    points INTEGER,
    created_by UUID REFERENCES public.profiles(user_id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    change_summary TEXT,
    UNIQUE(question_id, version_number)
);

-- Enable RLS on question_versions
ALTER TABLE public.question_versions ENABLE ROW LEVEL SECURITY;

-- Create policies for question_versions
CREATE POLICY "Users can view version history of questions they have access to" 
ON public.question_versions 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.questions 
        WHERE id = question_id 
        AND (assessment_id IS NULL OR assessment_id IN (
            SELECT id FROM public.assessments WHERE creator_id = auth.uid()
        ))
    )
);

CREATE POLICY "Users can create version history for their questions" 
ON public.question_versions 
FOR INSERT 
WITH CHECK (created_by = auth.uid());

-- Create assessment_auto_build table for smart assembly
CREATE TABLE IF NOT EXISTS public.assessment_auto_build (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    target_skills JSONB NOT NULL DEFAULT '[]',
    difficulty_distribution JSONB NOT NULL DEFAULT '{}',
    question_types JSONB NOT NULL DEFAULT '[]',
    total_points INTEGER DEFAULT 100,
    time_limit_minutes INTEGER DEFAULT 60,
    ai_criteria TEXT,
    build_status TEXT DEFAULT 'pending',
    selected_questions JSONB DEFAULT '[]',
    created_by UUID NOT NULL REFERENCES public.profiles(user_id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on assessment_auto_build
ALTER TABLE public.assessment_auto_build ENABLE ROW LEVEL SECURITY;

-- Create policies for assessment_auto_build
CREATE POLICY "Users can manage their own auto-build configurations" 
ON public.assessment_auto_build 
FOR ALL 
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Create skill_analytics table for advanced skill gap analysis
CREATE TABLE IF NOT EXISTS public.skill_analytics (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    skill_name TEXT NOT NULL,
    total_questions INTEGER DEFAULT 0,
    avg_difficulty_score NUMERIC DEFAULT 0,
    usage_frequency INTEGER DEFAULT 0,
    performance_score NUMERIC DEFAULT 0,
    last_analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    analytics_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on skill_analytics
ALTER TABLE public.skill_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies for skill_analytics (public read for analytics)
CREATE POLICY "Everyone can view skill analytics" 
ON public.skill_analytics 
FOR SELECT 
USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_version ON public.questions(version, parent_question_id);
CREATE INDEX IF NOT EXISTS idx_question_versions_question_id ON public.question_versions(question_id, version_number);
CREATE INDEX IF NOT EXISTS idx_question_collections_parent ON public.question_collections(parent_collection_id);
CREATE INDEX IF NOT EXISTS idx_question_templates_category ON public.question_templates(category, question_type);
CREATE INDEX IF NOT EXISTS idx_skill_analytics_skill_name ON public.skill_analytics(skill_name);

-- Create function to automatically create version when question is updated
CREATE OR REPLACE FUNCTION public.create_question_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create version if significant fields changed
    IF OLD.title != NEW.title OR 
       OLD.description != NEW.description OR 
       OLD.config != NEW.config OR 
       OLD.difficulty != NEW.difficulty OR 
       OLD.points != NEW.points THEN
        
        INSERT INTO public.question_versions (
            question_id, 
            version_number,
            title, 
            description, 
            config, 
            tags, 
            difficulty, 
            points,
            created_by,
            change_summary
        ) VALUES (
            NEW.id,
            NEW.version,
            OLD.title,
            OLD.description,
            OLD.config,
            OLD.tags,
            OLD.difficulty,
            OLD.points,
            auth.uid(),
            'Automatic version created on update'
        );
        
        -- Increment version number
        NEW.version = OLD.version + 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic versioning
CREATE TRIGGER question_version_trigger
    BEFORE UPDATE ON public.questions
    FOR EACH ROW
    EXECUTE FUNCTION public.create_question_version();

-- Create trigger for updating question_templates updated_at
CREATE TRIGGER update_question_templates_updated_at
    BEFORE UPDATE ON public.question_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updating skill_analytics updated_at
CREATE TRIGGER update_skill_analytics_updated_at
    BEFORE UPDATE ON public.skill_analytics
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();