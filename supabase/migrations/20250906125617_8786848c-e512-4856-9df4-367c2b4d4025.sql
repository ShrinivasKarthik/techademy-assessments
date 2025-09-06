-- Add performance indexes for shared assessment loading
CREATE INDEX IF NOT EXISTS idx_assessment_shares_token_active 
ON assessment_shares (share_token, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_assessments_id_status 
ON assessments (id, status) 
WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_questions_assessment_active 
ON questions (assessment_id, is_active, order_index) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_assessment_instances_share_token 
ON assessment_instances (share_token, is_anonymous, assessment_id, status);

-- Add covering index for share tokens to avoid table lookups
CREATE INDEX IF NOT EXISTS idx_assessment_shares_covering 
ON assessment_shares (share_token) 
INCLUDE (assessment_id, require_name, require_email, allow_anonymous, max_attempts, expires_at, access_count, completion_count, settings) 
WHERE is_active = true;