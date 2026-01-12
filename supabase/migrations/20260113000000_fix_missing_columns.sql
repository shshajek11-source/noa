-- ledger_characters 테이블에 display_order 컬럼 추가 (없는 경우에만)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ledger_characters'
        AND column_name = 'display_order'
    ) THEN
        ALTER TABLE ledger_characters
        ADD COLUMN display_order INTEGER DEFAULT 0;

        -- 기존 데이터에 순서 부여
        WITH numbered AS (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) - 1 as rn
            FROM ledger_characters
        )
        UPDATE ledger_characters
        SET display_order = numbered.rn
        FROM numbered
        WHERE ledger_characters.id = numbered.id;
    END IF;
END $$;

-- ledger_content_records 테이블 재생성 (이미 있으면 스킵)
CREATE TABLE IF NOT EXISTS ledger_content_records (
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

-- 인덱스 생성 (없으면 생성)
CREATE INDEX IF NOT EXISTS idx_ledger_content_records_character
    ON ledger_content_records(character_id);
CREATE INDEX IF NOT EXISTS idx_ledger_content_records_date
    ON ledger_content_records(record_date);
CREATE INDEX IF NOT EXISTS idx_ledger_content_records_character_date
    ON ledger_content_records(character_id, record_date);

-- RLS 정책 (이미 있으면 스킵)
ALTER TABLE ledger_content_records ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 후 재생성
DROP POLICY IF EXISTS "Allow public read access on ledger_content_records" ON ledger_content_records;
DROP POLICY IF EXISTS "Allow public insert on ledger_content_records" ON ledger_content_records;
DROP POLICY IF EXISTS "Allow public update on ledger_content_records" ON ledger_content_records;
DROP POLICY IF EXISTS "Allow public delete on ledger_content_records" ON ledger_content_records;

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
