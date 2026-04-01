-- ================================================================
-- Add Team Leader Column
-- ================================================================

ALTER TABLE teams 
  ADD COLUMN IF NOT EXISTS leader_id UUID REFERENCES users(id);

-- Initialize leader_id with the current creator (created_by)
UPDATE teams SET leader_id = created_by WHERE leader_id IS NULL;

-- Make it NOT NULL for future teams (optional, but good for consistency)
-- ALTER TABLE teams ALTER COLUMN leader_id SET NOT NULL;
