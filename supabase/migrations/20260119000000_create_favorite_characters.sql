-- Favorite Characters Table
-- 자주 사용하는 캐릭터 즐겨찾기 (device_id별)

CREATE TABLE IF NOT EXISTS favorite_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  character_id TEXT NOT NULL,
  server_id INTEGER NOT NULL,
  server_name TEXT NOT NULL,
  character_name TEXT NOT NULL,
  class_name TEXT,
  race_name TEXT,
  level INTEGER DEFAULT 0,

  -- 정렬 순서 (사용자가 순서 변경 가능)
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- device_id + character_id 유니크
  UNIQUE(device_id, character_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_fav_chars_device ON favorite_characters(device_id);
CREATE INDEX IF NOT EXISTS idx_fav_chars_device_order ON favorite_characters(device_id, sort_order);

-- RLS 정책
ALTER TABLE favorite_characters ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 조회 가능
CREATE POLICY "Anyone can read favorite characters"
  ON favorite_characters FOR SELECT
  USING (true);

-- 모든 사용자가 삽입 가능
CREATE POLICY "Anyone can insert favorite characters"
  ON favorite_characters FOR INSERT
  WITH CHECK (true);

-- 모든 사용자가 업데이트 가능
CREATE POLICY "Anyone can update favorite characters"
  ON favorite_characters FOR UPDATE
  USING (true);

-- 모든 사용자가 삭제 가능
CREATE POLICY "Anyone can delete favorite characters"
  ON favorite_characters FOR DELETE
  USING (true);

-- updated_at 자동 업데이트 트리거
DROP TRIGGER IF EXISTS update_favorite_characters_updated_at ON favorite_characters;
CREATE TRIGGER update_favorite_characters_updated_at
  BEFORE UPDATE ON favorite_characters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
