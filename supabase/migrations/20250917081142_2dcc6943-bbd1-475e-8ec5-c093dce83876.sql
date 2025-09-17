-- Add drag and drop support to project files table
-- Add parent_folder_id column for hierarchical structure (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_files' AND column_name = 'parent_folder_id') THEN
        ALTER TABLE project_files ADD COLUMN parent_folder_id UUID REFERENCES project_files(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add file_path column for full paths (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_files' AND column_name = 'file_path') THEN
        ALTER TABLE project_files ADD COLUMN file_path TEXT;
    END IF;
END $$;

-- Add is_folder column (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_files' AND column_name = 'is_folder') THEN
        ALTER TABLE project_files ADD COLUMN is_folder BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Create index for parent-child relationships for better performance
CREATE INDEX IF NOT EXISTS idx_project_files_parent_folder 
ON project_files(parent_folder_id);

-- Create index for hierarchical queries
CREATE INDEX IF NOT EXISTS idx_project_files_hierarchy 
ON project_files(question_id, parent_folder_id, is_folder);

-- Update existing records to have file_path if they don't have it
UPDATE project_files 
SET file_path = file_name 
WHERE file_path IS NULL OR file_path = '';

-- Make file_path non-nullable after setting defaults
ALTER TABLE project_files ALTER COLUMN file_path SET NOT NULL;