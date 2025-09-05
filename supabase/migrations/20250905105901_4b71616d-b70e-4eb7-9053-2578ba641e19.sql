-- Remove duplicate anonymous instances, keeping only the most recent one for each share_token
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY share_token, is_anonymous 
           ORDER BY started_at DESC
         ) as rn
  FROM assessment_instances 
  WHERE is_anonymous = true
)
DELETE FROM assessment_instances 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);