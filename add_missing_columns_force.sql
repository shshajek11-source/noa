-- 1. ledger_characters에 display_order 컬럼 강제 추가
ALTER TABLE ledger_characters
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- 2. 기존 ledger_content_records 테이블 삭제 (데이터 없으므로 안전)
DROP TABLE IF EXISTS ledger_content_records CASCADE;

-- 3. ledger_content_records 새로 생성
CREATE TABLE ledger_content_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id UUID NOT NULL REFERENCES ledger_characters(id) ON DELETE CASCADE,
    record_date DATE NOT NULL DEFAULT CURRENT_DATE,
    content_type TEXT NOT NULL,
    dungeon_tier TEXT NOT NULL,
    max_count INTEGER NOT NULL DEFAULT 3,
    completion_count INTEGER NOT NULL DEFAULT 0,
    is_double BOOLEAN NOT NULL DEFAULT false,
    base_kina BIGINT NOT NULL DEFAULT 50000,
    total_kina BIGINT NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(character_id, record_date, content_type)
);

-- 4. 인덱스 생성
CREATE INDEX idx_ledger_content_records_character
    ON ledger_content_records(character_id);
CREATE INDEX idx_ledger_content_records_date
    ON ledger_content_records(record_date);
CREATE INDEX idx_ledger_content_records_character_date
    ON ledger_content_records(character_id, record_date);

-- 5. RLS 정책
ALTER TABLE ledger_content_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on ledger_content_records"
    ON ledger_content_records FOR SELECT
    USING (true);

CREATE POLICY "Allow public insert on ledger_content_records"
    ON ledger_content_records FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public update on ledger_content_records"
    ON ledger_content_records FOR UPDATE
    USING (true);

CREATE POLICY "Allow public delete on ledger_content_records"
    ON ledger_content_records FOR DELETE
    USING (true);
