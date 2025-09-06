-- Fix the concurrent index creation issue from previous migration
-- This creates the indexes one by one without concurrency to avoid transaction issues

-- Drop any existing indexes that might have been partially created
DROP INDEX IF EXISTS idx_assessment_shares_token_active;
DROP INDEX IF EXISTS idx_assessment_shares_token_expires;
DROP INDEX IF EXISTS idx_assessments_status_creator;
DROP INDEX IF EXISTS idx_questions_assessment_active;
DROP INDEX IF EXISTS idx_assessment_instances_share_token;

-- Create performance indexes for shared assessment loading
-- Note: Not using CONCURRENTLY since we're in a transaction context

-- Index for share token lookups (most critical)
CREATE INDEX idx_assessment_shares_token_active 
ON assessment_shares (share_token) 
WHERE is_active = true;

-- Composite index for share expiration checks
CREATE INDEX idx_assessment_shares_token_expires 
ON assessment_shares (share_token, expires_at, is_active);

-- Index for assessment queries by status and creator
CREATE INDEX idx_assessments_status_creator 
ON assessments (status, creator_id);

-- Index for questions by assessment and active status
CREATE INDEX idx_questions_assessment_active 
ON questions (assessment_id, is_active) 
WHERE is_active = true;

-- Index for assessment instances by share token
CREATE INDEX idx_assessment_instances_share_token 
ON assessment_instances (share_token, is_anonymous, participant_id);

-- Covering index for assessment_shares to include frequently accessed columns
CREATE INDEX idx_assessment_shares_covering 
ON assessment_shares (share_token, is_active, expires_at) 
INCLUDE (assessment_id, require_name, require_email, allow_anonymous, max_attempts, access_count, completion_count, settings);