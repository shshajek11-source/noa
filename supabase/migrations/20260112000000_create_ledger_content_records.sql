-- 가계부 컨텐츠 기록 테이블 생성

-- ledger_content_records: 일일 컨텐츠 수입 기록
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

    -- 같은 캐릭터, 같은 날짜, 같은 컨텐츠는 하나만 존재
    UNIQUE(character_id, record_date, content_type)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_ledger_content_records_character
    ON ledger_content_records(character_id);
CREATE INDEX IF NOT EXISTS idx_ledger_content_records_date
    ON ledger_content_records(record_date);
CREATE INDEX IF NOT EXISTS idx_ledger_content_records_character_date
    ON ledger_content_records(character_id, record_date);

-- RLS 정책
ALTER TABLE ledger_content_records ENABLE ROW LEVEL SECURITY;

-- 모든 사용자 읽기 허용
CREATE POLICY "Allow public read access on ledger_content_records"
    ON ledger_content_records FOR SELECT
    USING (true);

-- 모든 사용자 쓰기 허용 (device_id 검증은 API에서 처리)
CREATE POLICY "Allow public insert on ledger_content_records"
    ON ledger_content_records FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public update on ledger_content_records"
    ON ledger_content_records FOR UPDATE
    USING (true);

CREATE POLICY "Allow public delete on ledger_content_records"
    ON ledger_content_records FOR DELETE
    USING (true);

-- ledger_items: 아이템 획득 기록 테이블
CREATE TABLE IF NOT EXISTS ledger_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id UUID NOT NULL REFERENCES ledger_characters(id) ON DELETE CASCADE,
    item_id TEXT,
    item_name TEXT NOT NULL,
    item_category TEXT NOT NULL DEFAULT 'etc',
    item_grade TEXT NOT NULL DEFAULT 'common',
    quantity INTEGER NOT NULL DEFAULT 1,
    obtained_date DATE NOT NULL DEFAULT CURRENT_DATE,
    sold_price BIGINT,
    source_content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_ledger_items_character
    ON ledger_items(character_id);
CREATE INDEX IF NOT EXISTS idx_ledger_items_date
    ON ledger_items(obtained_date);
CREATE INDEX IF NOT EXISTS idx_ledger_items_category
    ON ledger_items(item_category);
CREATE INDEX IF NOT EXISTS idx_ledger_items_sold
    ON ledger_items(sold_price) WHERE sold_price IS NULL;

-- RLS 정책
ALTER TABLE ledger_items ENABLE ROW LEVEL SECURITY;

-- 모든 사용자 읽기 허용
CREATE POLICY "Allow public read access on ledger_items"
    ON ledger_items FOR SELECT
    USING (true);

-- 모든 사용자 쓰기 허용
CREATE POLICY "Allow public insert on ledger_items"
    ON ledger_items FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public update on ledger_items"
    ON ledger_items FOR UPDATE
    USING (true);

CREATE POLICY "Allow public delete on ledger_items"
    ON ledger_items FOR DELETE
    USING (true);
