-- Add project_based question type and enhance schema for hierarchical project structure
ALTER TABLE questions ADD COLUMN IF NOT EXISTS project_type text DEFAULT 'project_based' CHECK (project_type IN ('project_based', 'single_file'));

-- Create project_files table for hierarchical project structure
CREATE TABLE IF NOT EXISTS project_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_content TEXT DEFAULT '',
  file_language TEXT DEFAULT 'javascript',
  parent_folder_id UUID REFERENCES project_files(id) ON DELETE CASCADE,
  is_folder BOOLEAN DEFAULT false,
  is_main_file BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- Create policies for project_files based on question access
CREATE POLICY "Users can view project files for their questions" 
ON project_files 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM questions q 
    WHERE q.id = project_files.question_id 
    AND q.created_by = auth.uid()
  )
);

CREATE POLICY "Users can manage project files for their questions" 
ON project_files 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM questions q 
    WHERE q.id = project_files.question_id 
    AND q.created_by = auth.uid()
  )
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_project_files_question_id ON project_files(question_id);
CREATE INDEX IF NOT EXISTS idx_project_files_parent_folder ON project_files(parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_project_files_path ON project_files(file_path);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_project_files_updated_at
BEFORE UPDATE ON project_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();