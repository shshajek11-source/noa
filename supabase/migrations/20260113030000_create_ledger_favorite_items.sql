-- Create ledger_favorite_items table for storing user's favorite items
CREATE TABLE IF NOT EXISTS ledger_favorite_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id UUID NOT NULL REFERENCES ledger_characters(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    item_grade TEXT NOT NULL,
    item_category TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    UNIQUE(character_id, item_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ledger_favorite_items_character_id ON ledger_favorite_items(character_id);
CREATE INDEX IF NOT EXISTS idx_ledger_favorite_items_display_order ON ledger_favorite_items(character_id, display_order);

-- Enable Row Level Security
ALTER TABLE ledger_favorite_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow users to view their own favorites
CREATE POLICY "Users can view their own favorites"
    ON ledger_favorite_items
    FOR SELECT
    USING (
        character_id IN (
            SELECT id FROM ledger_characters
            WHERE user_id = auth.uid()::text OR user_id = current_setting('request.headers')::json->>'x-device-id'
        )
    );

-- Allow users to insert their own favorites
CREATE POLICY "Users can insert their own favorites"
    ON ledger_favorite_items
    FOR INSERT
    WITH CHECK (
        character_id IN (
            SELECT id FROM ledger_characters
            WHERE user_id = auth.uid()::text OR user_id = current_setting('request.headers')::json->>'x-device-id'
        )
    );

-- Allow users to delete their own favorites
CREATE POLICY "Users can delete their own favorites"
    ON ledger_favorite_items
    FOR DELETE
    USING (
        character_id IN (
            SELECT id FROM ledger_characters
            WHERE user_id = auth.uid()::text OR user_id = current_setting('request.headers')::json->>'x-device-id'
        )
    );

-- Add trigger for updated_at
CREATE TRIGGER set_ledger_favorite_items_updated_at
    BEFORE UPDATE ON ledger_favorite_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE ledger_favorite_items IS '가계부 즐겨찾기 아이템 저장';
COMMENT ON COLUMN ledger_favorite_items.character_id IS '캐릭터 ID';
COMMENT ON COLUMN ledger_favorite_items.item_id IS '아이템 ID';
COMMENT ON COLUMN ledger_favorite_items.item_name IS '아이템 이름';
COMMENT ON COLUMN ledger_favorite_items.item_grade IS '아이템 등급';
COMMENT ON COLUMN ledger_favorite_items.item_category IS '아이템 카테고리';
COMMENT ON COLUMN ledger_favorite_items.display_order IS '표시 순서';
