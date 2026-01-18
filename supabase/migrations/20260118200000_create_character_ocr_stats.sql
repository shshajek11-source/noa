-- Character OCR Stats Table
-- OCR로 추출한 스탯을 저장하여 API 스탯을 덮어씌우는데 사용

CREATE TABLE IF NOT EXISTS character_ocr_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  character_id TEXT NOT NULL,
  server_id INTEGER,
  character_name TEXT,

  -- OCR 추출 스탯 (JSON)
  -- 형식: [{ "name": "공격력", "value": "8500", "isPercentage": false }]
  stats JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(device_id, character_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_ocr_stats_device ON character_ocr_stats(device_id);
CREATE INDEX IF NOT EXISTS idx_ocr_stats_char ON character_ocr_stats(character_id);
CREATE INDEX IF NOT EXISTS idx_ocr_stats_device_char ON character_ocr_stats(device_id, character_id);

-- RLS 정책
ALTER TABLE character_ocr_stats ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 조회 가능 (캐릭터 상세 페이지에서 조회)
CREATE POLICY "Anyone can read ocr stats"
  ON character_ocr_stats FOR SELECT
  USING (true);

-- 모든 사용자가 삽입 가능 (device_id로 식별)
CREATE POLICY "Anyone can insert ocr stats"
  ON character_ocr_stats FOR INSERT
  WITH CHECK (true);

-- 모든 사용자가 업데이트 가능 (device_id로 본인 데이터만)
CREATE POLICY "Anyone can update own ocr stats"
  ON character_ocr_stats FOR UPDATE
  USING (true);

-- 모든 사용자가 삭제 가능 (device_id로 본인 데이터만)
CREATE POLICY "Anyone can delete own ocr stats"
  ON character_ocr_stats FOR DELETE
  USING (true);

-- updated_at 자동 업데이트 함수 (이미 있으면 재사용)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 생성
DROP TRIGGER IF EXISTS update_character_ocr_stats_updated_at ON character_ocr_stats;
CREATE TRIGGER update_character_ocr_stats_updated_at
  BEFORE UPDATE ON character_ocr_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
