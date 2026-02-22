-- Realtime battle MVP foundation: permissions, audit events, access rules.

CREATE TABLE IF NOT EXISTS battle_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('host', 'moderator', 'participant', 'spectator')),
  state TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'left', 'kicked', 'banned')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  kicked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  banned_reason TEXT,
  UNIQUE (battle_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_battle_memberships_battle_state
  ON battle_memberships(battle_id, state);

CREATE INDEX IF NOT EXISTS idx_battle_memberships_user_state
  ON battle_memberships(user_id, state);

CREATE TABLE IF NOT EXISTS battle_access_rules (
  battle_id UUID PRIMARY KEY REFERENCES battles(id) ON DELETE CASCADE,
  join_mode TEXT NOT NULL DEFAULT 'public' CHECK (join_mode IN ('public', 'password', 'invite')),
  max_participants INTEGER NOT NULL DEFAULT 10 CHECK (max_participants > 0),
  allow_spectator BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS battle_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_battle_events_battle_created
  ON battle_events(battle_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_battle_events_event_type
  ON battle_events(event_type);

CREATE TABLE IF NOT EXISTS battle_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  voter_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (battle_id, voter_user_id)
);

CREATE INDEX IF NOT EXISTS idx_battle_votes_battle
  ON battle_votes(battle_id, created_at DESC);

-- Backfill membership table from existing participants table.
INSERT INTO battle_memberships (battle_id, user_id, role, state, joined_at)
SELECT
  bp.battle_id,
  bp.user_id,
  CASE WHEN b.host_id = bp.user_id THEN 'host' ELSE 'participant' END AS role,
  'active' AS state,
  COALESCE(bp.joined_at, NOW())
FROM battle_participants bp
JOIN battles b ON b.id = bp.battle_id
ON CONFLICT (battle_id, user_id) DO NOTHING;

-- Backfill access rule defaults.
INSERT INTO battle_access_rules (battle_id, join_mode, max_participants, allow_spectator)
SELECT
  b.id,
  CASE WHEN COALESCE(b.is_private, false) THEN 'password' ELSE 'public' END,
  COALESCE(NULLIF(b.max_participants, 0), 10),
  true
FROM battles b
ON CONFLICT (battle_id) DO NOTHING;

ALTER TABLE battle_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_access_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Battle memberships are readable" ON battle_memberships;
CREATE POLICY "Battle memberships are readable" ON battle_memberships
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own battle membership" ON battle_memberships;
CREATE POLICY "Users can insert own battle membership" ON battle_memberships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own battle membership" ON battle_memberships;
CREATE POLICY "Users can update own battle membership" ON battle_memberships
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Battle access rules are readable" ON battle_access_rules;
CREATE POLICY "Battle access rules are readable" ON battle_access_rules
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Hosts can upsert own battle access rules" ON battle_access_rules;
CREATE POLICY "Hosts can upsert own battle access rules" ON battle_access_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM battles b
      WHERE b.id = battle_access_rules.battle_id
        AND b.host_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Battle events readable for members" ON battle_events;
CREATE POLICY "Battle events readable for members" ON battle_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM battle_memberships bm
      WHERE bm.battle_id = battle_events.battle_id
        AND bm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Battle votes are readable" ON battle_votes;
CREATE POLICY "Battle votes are readable" ON battle_votes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can vote once as themselves" ON battle_votes;
CREATE POLICY "Users can vote once as themselves" ON battle_votes
  FOR INSERT WITH CHECK (auth.uid() = voter_user_id);
