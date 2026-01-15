-- Fix ledger_items table schema to match API requirements
-- The original table was designed for master data (autocomplete), but the API uses it for user items

-- Drop the unique constraint on name column (it was for autocomplete items)
ALTER TABLE ledger_items DROP CONSTRAINT IF EXISTS ledger_items_name_key;

-- Add missing columns required by the API
ALTER TABLE ledger_items
ADD COLUMN IF NOT EXISTS ledger_character_id UUID REFERENCES ledger_characters(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS item_id TEXT,
ADD COLUMN IF NOT EXISTS item_name TEXT,
ADD COLUMN IF NOT EXISTS item_category TEXT,
ADD COLUMN IF NOT EXISTS item_grade TEXT,
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS unit_price BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_price BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS obtained_date DATE,
ADD COLUMN IF NOT EXISTS source_content TEXT,
ADD COLUMN IF NOT EXISTS sold_price BIGINT,
ADD COLUMN IF NOT EXISTS sold_date DATE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ledger_items_character_id ON ledger_items(ledger_character_id);
CREATE INDEX IF NOT EXISTS idx_ledger_items_category ON ledger_items(item_category);
CREATE INDEX IF NOT EXISTS idx_ledger_items_obtained_date ON ledger_items(obtained_date);

-- Add comments
COMMENT ON COLUMN ledger_items.ledger_character_id IS '소유 캐릭터 ID';
COMMENT ON COLUMN ledger_items.item_id IS '아이템 고유 ID';
COMMENT ON COLUMN ledger_items.item_name IS '아이템 이름';
COMMENT ON COLUMN ledger_items.item_category IS '아이템 카테고리';
COMMENT ON COLUMN ledger_items.item_grade IS '아이템 등급';
COMMENT ON COLUMN ledger_items.quantity IS '수량';
COMMENT ON COLUMN ledger_items.unit_price IS '개당 가격';
COMMENT ON COLUMN ledger_items.total_price IS '총 가격';
COMMENT ON COLUMN ledger_items.obtained_date IS '획득 날짜';
COMMENT ON COLUMN ledger_items.source_content IS '획득처';
COMMENT ON COLUMN ledger_items.sold_price IS '판매 가격';
COMMENT ON COLUMN ledger_items.sold_date IS '판매 날짜';
