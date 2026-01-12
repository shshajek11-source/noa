-- Create ledger_daily_content table for tracking daily content completion
CREATE TABLE IF NOT EXISTS ledger_daily_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id UUID NOT NULL REFERENCES ledger_characters(id) ON DELETE CASCADE,
    record_date DATE NOT NULL DEFAULT CURRENT_DATE,
    content_id TEXT NOT NULL, -- nightmare, shugo_festa, dimension_invasion, awakening_battle, subjugation, daily_dungeon
    max_count INTEGER NOT NULL DEFAULT 1,
    completion_count INTEGER NOT NULL DEFAULT 0,
    base_reward BIGINT NOT NULL DEFAULT 0,
    total_reward BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(character_id, record_date, content_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_daily_content_character_date
    ON ledger_daily_content(character_id, record_date);

CREATE INDEX IF NOT EXISTS idx_daily_content_date
    ON ledger_daily_content(record_date);

-- Enable RLS
ALTER TABLE ledger_daily_content ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (same as other ledger tables)
CREATE POLICY "Allow public access to ledger_daily_content"
    ON ledger_daily_content
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ledger_daily_content_updated_at
    BEFORE UPDATE ON ledger_daily_content
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
