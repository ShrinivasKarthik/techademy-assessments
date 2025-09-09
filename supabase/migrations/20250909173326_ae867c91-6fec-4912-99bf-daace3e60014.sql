-- Create interview voice metrics table
CREATE TABLE public.interview_voice_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  response_id UUID NULL,
  speech_rate NUMERIC NULL,
  pause_frequency NUMERIC NULL,
  pause_duration_avg NUMERIC NULL,
  volume_consistency NUMERIC NULL,
  clarity_score NUMERIC NULL,
  confidence_score NUMERIC NULL,
  filler_word_count INTEGER DEFAULT 0,
  voice_quality_score NUMERIC NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create interview sentiment analysis table
CREATE TABLE public.interview_sentiment_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  response_id UUID NULL,
  sentiment_score NUMERIC NOT NULL, -- -1 to 1 scale
  emotion_detected TEXT NULL, -- detected emotion (confident, nervous, excited, etc.)
  confidence_level NUMERIC NULL, -- how confident the AI is in sentiment analysis
  emotional_progression JSONB DEFAULT '[]'::jsonb, -- timeline of sentiment changes
  tone_analysis JSONB DEFAULT '{}'::jsonb, -- professional, casual, formal, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create interview performance metrics table
CREATE TABLE public.interview_performance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  overall_score NUMERIC NULL,
  communication_score NUMERIC NULL,
  technical_score NUMERIC NULL,
  behavioral_score NUMERIC NULL,
  response_relevance_score NUMERIC NULL,
  structure_score NUMERIC NULL,
  time_management_score NUMERIC NULL,
  engagement_score NUMERIC NULL,
  performance_data JSONB DEFAULT '{}'::jsonb,
  improvement_areas JSONB DEFAULT '[]'::jsonb,
  strengths JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create interview benchmarks table
CREATE TABLE public.interview_benchmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_type TEXT NOT NULL,
  industry TEXT NULL,
  experience_level TEXT NULL, -- junior, mid, senior, executive
  benchmark_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  performance_thresholds JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conversation intelligence table
CREATE TABLE public.conversation_intelligence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  conversation_quality_score NUMERIC NULL,
  skills_demonstrated JSONB DEFAULT '[]'::jsonb,
  communication_patterns JSONB DEFAULT '{}'::jsonb,
  personality_insights JSONB DEFAULT '{}'::jsonb,
  competency_analysis JSONB DEFAULT '{}'::jsonb,
  conversation_flow_score NUMERIC NULL,
  engagement_metrics JSONB DEFAULT '{}'::jsonb,
  ai_insights JSONB DEFAULT '{}'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.interview_voice_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_sentiment_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_intelligence ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for interview voice metrics
CREATE POLICY "Users can manage their interview voice metrics" ON public.interview_voice_metrics
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM interview_sessions s
    JOIN assessment_instances ai ON ai.id = s.instance_id
    WHERE s.id = interview_voice_metrics.session_id
    AND (ai.participant_id = auth.uid() OR ai.share_token IS NOT NULL)
  )
);

-- Create RLS policies for interview sentiment analysis
CREATE POLICY "Users can manage their interview sentiment analysis" ON public.interview_sentiment_analysis
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM interview_sessions s
    JOIN assessment_instances ai ON ai.id = s.instance_id
    WHERE s.id = interview_sentiment_analysis.session_id
    AND (ai.participant_id = auth.uid() OR ai.share_token IS NOT NULL)
  )
);

-- Create RLS policies for interview performance metrics
CREATE POLICY "Users can manage their interview performance metrics" ON public.interview_performance_metrics
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM interview_sessions s
    JOIN assessment_instances ai ON ai.id = s.instance_id
    WHERE s.id = interview_performance_metrics.session_id
    AND (ai.participant_id = auth.uid() OR ai.share_token IS NOT NULL)
  )
);

-- Create RLS policies for interview benchmarks (public read access)
CREATE POLICY "Anyone can view interview benchmarks" ON public.interview_benchmarks
FOR SELECT USING (true);

CREATE POLICY "System can manage interview benchmarks" ON public.interview_benchmarks
FOR ALL USING (true) WITH CHECK (true);

-- Create RLS policies for conversation intelligence
CREATE POLICY "Users can manage their conversation intelligence" ON public.conversation_intelligence
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM interview_sessions s
    JOIN assessment_instances ai ON ai.id = s.instance_id
    WHERE s.id = conversation_intelligence.session_id
    AND (ai.participant_id = auth.uid() OR ai.share_token IS NOT NULL)
  )
);

-- Create indexes for better performance
CREATE INDEX idx_interview_voice_metrics_session_id ON public.interview_voice_metrics(session_id);
CREATE INDEX idx_interview_sentiment_analysis_session_id ON public.interview_sentiment_analysis(session_id);
CREATE INDEX idx_interview_performance_metrics_session_id ON public.interview_performance_metrics(session_id);
CREATE INDEX idx_interview_benchmarks_role_type ON public.interview_benchmarks(role_type);
CREATE INDEX idx_conversation_intelligence_session_id ON public.conversation_intelligence(session_id);

-- Insert some default benchmark data
INSERT INTO public.interview_benchmarks (role_type, industry, experience_level, benchmark_data, performance_thresholds) VALUES
('software_engineer', 'technology', 'junior', 
 '{"technical_score": 70, "communication_score": 65, "problem_solving": 68}',
 '{"excellent": 85, "good": 75, "average": 60, "needs_improvement": 50}'),
('software_engineer', 'technology', 'mid', 
 '{"technical_score": 80, "communication_score": 75, "problem_solving": 78, "leadership": 60}',
 '{"excellent": 90, "good": 80, "average": 70, "needs_improvement": 60}'),
('software_engineer', 'technology', 'senior', 
 '{"technical_score": 90, "communication_score": 85, "problem_solving": 88, "leadership": 80}',
 '{"excellent": 95, "good": 85, "average": 75, "needs_improvement": 65}'),
('product_manager', 'technology', 'mid', 
 '{"strategic_thinking": 80, "communication_score": 85, "stakeholder_management": 75, "analytical_skills": 78}',
 '{"excellent": 90, "good": 80, "average": 70, "needs_improvement": 60}'),
('data_scientist', 'technology', 'mid', 
 '{"technical_score": 85, "communication_score": 70, "analytical_skills": 88, "domain_knowledge": 75}',
 '{"excellent": 90, "good": 80, "average": 70, "needs_improvement": 60}');