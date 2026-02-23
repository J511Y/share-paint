-- Guest mode support: keep user_id model for authenticated users,
-- add guest identity columns for unauthenticated actors.

ALTER TABLE paintings
  ADD COLUMN IF NOT EXISTS guest_id TEXT,
  ADD COLUMN IF NOT EXISTS guest_name VARCHAR(100);

ALTER TABLE likes
  ADD COLUMN IF NOT EXISTS guest_id TEXT;

ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS guest_id TEXT,
  ADD COLUMN IF NOT EXISTS guest_name VARCHAR(100);

ALTER TABLE follows
  ADD COLUMN IF NOT EXISTS follower_guest_id TEXT;

ALTER TABLE battles
  ADD COLUMN IF NOT EXISTS host_guest_id TEXT,
  ADD COLUMN IF NOT EXISTS host_guest_name VARCHAR(100);

ALTER TABLE battle_participants
  ADD COLUMN IF NOT EXISTS guest_id TEXT,
  ADD COLUMN IF NOT EXISTS guest_name VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS idx_likes_painting_guest_unique
  ON likes (painting_id, guest_id)
  WHERE guest_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_follows_guest_following_unique
  ON follows (follower_guest_id, following_id)
  WHERE follower_guest_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_battle_participants_guest_unique
  ON battle_participants (battle_id, guest_id)
  WHERE guest_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_comments_guest_id ON comments (guest_id);
CREATE INDEX IF NOT EXISTS idx_paintings_guest_id ON paintings (guest_id);
CREATE INDEX IF NOT EXISTS idx_battles_host_guest_id ON battles (host_guest_id);
