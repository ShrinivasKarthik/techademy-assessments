-- Allow participant_id to be null for anonymous users
ALTER TABLE proctoring_sessions ALTER COLUMN participant_id DROP NOT NULL;