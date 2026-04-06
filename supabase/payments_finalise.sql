-- ──────────────────────────────────────────────────────────────────────────────
-- Payments finalise migration
-- Run in Supabase SQL Editor
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. Add pitch cost + actual player count to matches
ALTER TABLE matches ADD COLUMN IF NOT EXISTS pitch_cost      NUMERIC(8,2);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS actual_players  INTEGER;

-- 2. Add reminder_sent flag + amount + guest_id to payments (if not already there)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount           NUMERIC(8,2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS guest_id         TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reminder_sent    BOOLEAN DEFAULT false;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
