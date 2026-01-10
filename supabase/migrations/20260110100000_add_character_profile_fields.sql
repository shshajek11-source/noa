-- Add profile fields to ledger_characters table
ALTER TABLE ledger_characters
ADD COLUMN IF NOT EXISTS level integer,
ADD COLUMN IF NOT EXISTS item_level integer,
ADD COLUMN IF NOT EXISTS combat_power bigint,
ADD COLUMN IF NOT EXISTS profile_image text,
ADD COLUMN IF NOT EXISTS race text;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ledger_characters_user_id ON ledger_characters(user_id);
