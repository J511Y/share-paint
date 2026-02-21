-- 비밀번호 방 기능을 위한 컬럼 추가
ALTER TABLE battles ADD COLUMN IF NOT EXISTS password VARCHAR(50);
ALTER TABLE battles ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_battles_is_private ON battles(is_private);
