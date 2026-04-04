-- ============================================================
-- SquadPlay — Ownership Transfer Migration
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ── 1. Extend groups table with ownership + billing fields ──

ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS owner_id              TEXT REFERENCES players(id),
  ADD COLUMN IF NOT EXISTS billing_owner_id      TEXT REFERENCES players(id),
  ADD COLUMN IF NOT EXISTS subscription_plan     TEXT DEFAULT 'free'
    CHECK (subscription_plan IN ('free', 'pro', 'squad_plus')),
  ADD COLUMN IF NOT EXISTS subscription_status   TEXT DEFAULT 'active'
    CHECK (subscription_status IN ('active', 'cancelled', 'pending', 'trialing')),
  ADD COLUMN IF NOT EXISTS billing_transferred_at TIMESTAMPTZ;

-- ── 2. Tighten group_members role constraint ──

ALTER TABLE group_members
  DROP CONSTRAINT IF EXISTS group_members_role_check;

ALTER TABLE group_members
  ADD CONSTRAINT group_members_role_check
  CHECK (role IN ('owner', 'admin', 'player'));

-- ── 3. One owner per group — unique partial index ──
-- This is the DB-level guarantee. Two rows with role='owner'
-- for the same group_id will be rejected at insert/update.

CREATE UNIQUE INDEX IF NOT EXISTS idx_group_members_one_owner
  ON group_members(group_id)
  WHERE role = 'owner';

-- ── 4. Backfill owner_id on existing groups ──
-- Sets owner_id to whoever already has role='owner' in group_members.

UPDATE groups g
SET owner_id = gm.player_id
FROM group_members gm
WHERE gm.group_id = g.id
  AND gm.role = 'owner'
  AND g.owner_id IS NULL;

-- Set billing_owner_id to match owner_id where not already set
UPDATE groups
SET billing_owner_id = owner_id
WHERE billing_owner_id IS NULL AND owner_id IS NOT NULL;

-- ── 5. Ownership transfer function ──
-- Called via supabase.rpc('transfer_group_ownership', {...})
-- Atomic: demotes old owner → promotes new owner → updates groups row.
-- Returns { success: true } or { success: false, error: 'reason' }

CREATE OR REPLACE FUNCTION transfer_group_ownership(
  p_group_id         TEXT,
  p_new_owner_id     TEXT,   -- player_id of the admin becoming owner
  p_current_owner_id TEXT    -- player_id of the current owner (for validation)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_role TEXT;
  v_new_role     TEXT;
BEGIN
  -- Validate caller is actually the owner of this group
  SELECT role INTO v_current_role
  FROM group_members
  WHERE group_id = p_group_id AND player_id = p_current_owner_id;

  IF v_current_role IS DISTINCT FROM 'owner' THEN
    RETURN jsonb_build_object('success', false, 'error', 'caller_not_owner');
  END IF;

  -- Validate target is an admin of this group (not owner, not player)
  SELECT role INTO v_new_role
  FROM group_members
  WHERE group_id = p_group_id AND player_id = p_new_owner_id;

  IF v_new_role IS DISTINCT FROM 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'target_not_admin');
  END IF;

  -- Cannot transfer to yourself
  IF p_new_owner_id = p_current_owner_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'same_user');
  END IF;

  -- Atomic transfer: demote current owner → admin
  UPDATE group_members
  SET role = 'admin'
  WHERE group_id = p_group_id AND player_id = p_current_owner_id;

  -- Promote new owner (unique index ensures only one owner exists)
  UPDATE group_members
  SET role = 'owner'
  WHERE group_id = p_group_id AND player_id = p_new_owner_id;

  -- Update groups metadata
  -- Note: billing_owner_id is NOT changed here — new owner must explicitly
  -- "take over" billing via a separate action (takeBillingOwnership).
  UPDATE groups
  SET
    owner_id              = p_new_owner_id,
    billing_transferred_at = NOW()
  WHERE id = p_group_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ── 6. RLS policies for group_members ──
-- Allow members to read their group's membership list.
-- Only the owner can update roles.

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their group roster" ON group_members;
CREATE POLICY "Members can view their group roster"
  ON group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm2
      WHERE gm2.group_id = group_members.group_id
        AND gm2.player_id = (
          SELECT id FROM players WHERE user_id = auth.uid() LIMIT 1
        )
    )
  );

DROP POLICY IF EXISTS "Owners and admins can update roles" ON group_members;
CREATE POLICY "Owners and admins can update roles"
  ON group_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm2
      WHERE gm2.group_id = group_members.group_id
        AND gm2.player_id = (
          SELECT id FROM players WHERE user_id = auth.uid() LIMIT 1
        )
        AND gm2.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Members can leave their own group" ON group_members;
CREATE POLICY "Members can leave their own group"
  ON group_members FOR DELETE
  USING (
    player_id = (SELECT id FROM players WHERE user_id = auth.uid() LIMIT 1)
  );
