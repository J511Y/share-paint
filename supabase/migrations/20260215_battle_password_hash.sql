-- Replace plaintext battle passwords with server-side hash storage.

ALTER TABLE battles
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_battles_password_hash
  ON battles(password_hash);
