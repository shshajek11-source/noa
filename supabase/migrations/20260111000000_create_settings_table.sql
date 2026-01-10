-- Settings 테이블 생성 (키-값 저장소)
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_settings_updated_at ON settings(updated_at);

-- RLS 비활성화 (서버 사이드에서만 사용)
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- 서비스 롤 정책
CREATE POLICY "Service role can do anything" ON settings
    FOR ALL
    USING (true)
    WITH CHECK (true);
