-- Add plan tracking to groups table
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plan_activated_at TIMESTAMPTZ;

-- Existing groups default to free
UPDATE groups SET plan = 'free' WHERE plan IS NULL;
