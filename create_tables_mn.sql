-- mnbngmdjiszyowfvnzhk에 모든 테이블 생성

-- 1. ledger_users 테이블
CREATE TABLE IF NOT EXISTS ledger_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT UNIQUE,
    auth_user_id TEXT UNIQUE,
    nickname TEXT,
    main_character_id TEXT,
    main_character_name TEXT,
    main_character_server TEXT,
    main_character_class TEXT,
    main_character_level INTEGER,
    main_character_race TEXT,
    main_character_item_level INTEGER,
    main_character_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_users_device_id ON ledger_users(device_id);
CREATE INDEX IF NOT EXISTS idx_ledger_users_auth_user_id ON ledger_users(auth_user_id);

ALTER TABLE ledger_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on ledger_users" ON ledger_users;
DROP POLICY IF EXISTS "Allow public insert on ledger_users" ON ledger_users;
DROP POLICY IF EXISTS "Allow public update on ledger_users" ON ledger_users;

CREATE POLICY "Allow public read access on ledger_users"
    ON ledger_users FOR SELECT USING (true);
CREATE POLICY "Allow public insert on ledger_users"
    ON ledger_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on ledger_users"
    ON ledger_users FOR UPDATE USING (true);

-- 2. ledger_characters 테이블
CREATE TABLE IF NOT EXISTS ledger_characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES ledger_users(id) ON DELETE CASCADE,
    character_id TEXT,
    name TEXT NOT NULL,
    class_name TEXT NOT NULL DEFAULT 'Unknown',
    server_name TEXT NOT NULL DEFAULT 'Unknown',
    race TEXT,
    item_level INTEGER,
    profile_image TEXT,
    is_main BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_characters_user_id ON ledger_characters(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_characters_character_id ON ledger_characters(character_id);

ALTER TABLE ledger_characters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on ledger_characters" ON ledger_characters;
DROP POLICY IF EXISTS "Allow public insert on ledger_characters" ON ledger_characters;
DROP POLICY IF EXISTS "Allow public update on ledger_characters" ON ledger_characters;
DROP POLICY IF EXISTS "Allow public delete on ledger_characters" ON ledger_characters;

CREATE POLICY "Allow public read access on ledger_characters"
    ON ledger_characters FOR SELECT USING (true);
CREATE POLICY "Allow public insert on ledger_characters"
    ON ledger_characters FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on ledger_characters"
    ON ledger_characters FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on ledger_characters"
    ON ledger_characters FOR DELETE USING (true);

-- 3. ledger_content_records 테이블
DROP TABLE IF EXISTS ledger_content_records CASCADE;

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

CREATE INDEX idx_ledger_content_records_character
    ON ledger_content_records(character_id);
CREATE INDEX idx_ledger_content_records_date
    ON ledger_content_records(record_date);
CREATE INDEX idx_ledger_content_records_character_date
    ON ledger_content_records(character_id, record_date);

ALTER TABLE ledger_content_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on ledger_content_records" ON ledger_content_records;
DROP POLICY IF EXISTS "Allow public insert on ledger_content_records" ON ledger_content_records;
DROP POLICY IF EXISTS "Allow public update on ledger_content_records" ON ledger_content_records;
DROP POLICY IF EXISTS "Allow public delete on ledger_content_records" ON ledger_content_records;

CREATE POLICY "Allow public read access on ledger_content_records"
    ON ledger_content_records FOR SELECT USING (true);
CREATE POLICY "Allow public insert on ledger_content_records"
    ON ledger_content_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on ledger_content_records"
    ON ledger_content_records FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on ledger_content_records"
    ON ledger_content_records FOR DELETE USING (true);

-- 4. ledger_items 테이블
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

CREATE INDEX IF NOT EXISTS idx_ledger_items_character ON ledger_items(character_id);
CREATE INDEX IF NOT EXISTS idx_ledger_items_date ON ledger_items(obtained_date);
CREATE INDEX IF NOT EXISTS idx_ledger_items_category ON ledger_items(item_category);
CREATE INDEX IF NOT EXISTS idx_ledger_items_sold ON ledger_items(sold_price) WHERE sold_price IS NULL;

ALTER TABLE ledger_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on ledger_items" ON ledger_items;
DROP POLICY IF EXISTS "Allow public insert on ledger_items" ON ledger_items;
DROP POLICY IF EXISTS "Allow public update on ledger_items" ON ledger_items;
DROP POLICY IF EXISTS "Allow public delete on ledger_items" ON ledger_items;

CREATE POLICY "Allow public read access on ledger_items"
    ON ledger_items FOR SELECT USING (true);
CREATE POLICY "Allow public insert on ledger_items"
    ON ledger_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on ledger_items"
    ON ledger_items FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on ledger_items"
    ON ledger_items FOR DELETE USING (true);

-- 5. ledger_daily_records 테이블 (있으면)
CREATE TABLE IF NOT EXISTS ledger_daily_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id UUID NOT NULL REFERENCES ledger_characters(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_income BIGINT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(character_id, date)
);

CREATE INDEX IF NOT EXISTS idx_ledger_daily_records_character ON ledger_daily_records(character_id);
CREATE INDEX IF NOT EXISTS idx_ledger_daily_records_date ON ledger_daily_records(date);

ALTER TABLE ledger_daily_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on ledger_daily_records" ON ledger_daily_records;
DROP POLICY IF EXISTS "Allow public insert on ledger_daily_records" ON ledger_daily_records;
DROP POLICY IF EXISTS "Allow public update on ledger_daily_records" ON ledger_daily_records;
DROP POLICY IF EXISTS "Allow public delete on ledger_daily_records" ON ledger_daily_records;

CREATE POLICY "Allow public read access on ledger_daily_records"
    ON ledger_daily_records FOR SELECT USING (true);
CREATE POLICY "Allow public insert on ledger_daily_records"
    ON ledger_daily_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on ledger_daily_records"
    ON ledger_daily_records FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on ledger_daily_records"
    ON ledger_daily_records FOR DELETE USING (true);

-- 6. ledger_record_items 테이블 (있으면)
CREATE TABLE IF NOT EXISTS ledger_record_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_record_id UUID NOT NULL REFERENCES ledger_daily_records(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL,
    price BIGINT NOT NULL DEFAULT 0,
    count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_record_items_daily_record ON ledger_record_items(daily_record_id);

ALTER TABLE ledger_record_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on ledger_record_items" ON ledger_record_items;
DROP POLICY IF EXISTS "Allow public insert on ledger_record_items" ON ledger_record_items;
DROP POLICY IF EXISTS "Allow public update on ledger_record_items" ON ledger_record_items;
DROP POLICY IF EXISTS "Allow public delete on ledger_record_items" ON ledger_record_items;

CREATE POLICY "Allow public read access on ledger_record_items"
    ON ledger_record_items FOR SELECT USING (true);
CREATE POLICY "Allow public insert on ledger_record_items"
    ON ledger_record_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on ledger_record_items"
    ON ledger_record_items FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on ledger_record_items"
    ON ledger_record_items FOR DELETE USING (true);
