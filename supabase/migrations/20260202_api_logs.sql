-- API 로그 테이블 생성
CREATE TABLE IF NOT EXISTS api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 로그 정보
  level VARCHAR(10) NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message TEXT NOT NULL,
  context JSONB DEFAULT '{}',

  -- 에러 정보
  error_message TEXT,
  error_stack TEXT,

  -- 요청 정보
  request_id VARCHAR(50),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  path VARCHAR(500),
  method VARCHAR(10),
  status_code INTEGER,
  duration_ms INTEGER
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_level ON api_logs(level);
CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_path ON api_logs(path);
CREATE INDEX IF NOT EXISTS idx_api_logs_request_id ON api_logs(request_id);

-- 30일 이상 된 로그 자동 삭제 (선택사항)
-- CREATE OR REPLACE FUNCTION cleanup_old_api_logs()
-- RETURNS void AS $$
-- BEGIN
--   DELETE FROM api_logs WHERE created_at < NOW() - INTERVAL '30 days';
-- END;
-- $$ LANGUAGE plpgsql;

-- RLS 정책 (관리자만 접근 가능)
ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;

-- 서비스 역할은 모든 작업 가능 (API에서 사용)
CREATE POLICY "Service role can manage api_logs"
  ON api_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 일반 사용자는 자신의 로그만 조회 가능 (선택사항)
-- CREATE POLICY "Users can view own logs"
--   ON api_logs
--   FOR SELECT
--   USING (auth.uid() = user_id);

COMMENT ON TABLE api_logs IS 'API 요청/에러 로그 저장 테이블';
