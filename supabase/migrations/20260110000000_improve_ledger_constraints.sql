-- Migration: Improve ledger table constraints
-- 1. Add unique constraint for character name per user (prevent duplicate characters)
-- 2. Add trigger to ensure only one main character per user

-- 1. Add unique constraint on (user_id, name) for ledger_characters
-- This prevents registering the same character name twice for a single user
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ledger_characters_user_name_unique'
    ) THEN
        ALTER TABLE ledger_characters
        ADD CONSTRAINT ledger_characters_user_name_unique UNIQUE (user_id, name);
    END IF;
END $$;

-- 2. Create a function to ensure only one main character per user
CREATE OR REPLACE FUNCTION ensure_single_main_character()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting is_main to true, unset all other characters for this user
    IF NEW.is_main = true THEN
        UPDATE ledger_characters
        SET is_main = false
        WHERE user_id = NEW.user_id
          AND id != NEW.id
          AND is_main = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_ensure_single_main_character ON ledger_characters;

CREATE TRIGGER trigger_ensure_single_main_character
    BEFORE INSERT OR UPDATE ON ledger_characters
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_main_character();

-- 3. Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ledger_characters_user_id ON ledger_characters(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_daily_records_character_id ON ledger_daily_records(character_id);
CREATE INDEX IF NOT EXISTS idx_ledger_daily_records_date ON ledger_daily_records(date);
CREATE INDEX IF NOT EXISTS idx_ledger_record_items_record_id ON ledger_record_items(record_id);

-- 4. Add check constraint for non-negative values
ALTER TABLE ledger_daily_records
    DROP CONSTRAINT IF EXISTS check_non_negative_values;

ALTER TABLE ledger_daily_records
    ADD CONSTRAINT check_non_negative_values
    CHECK (
        kina_income >= 0 AND
        count_expedition >= 0 AND
        count_transcend >= 0 AND
        count_bus >= 0
    );
