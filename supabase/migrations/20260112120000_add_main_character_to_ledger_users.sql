-- Add main character fields to ledger_users table

-- Add main character columns
ALTER TABLE ledger_users
  ADD COLUMN IF NOT EXISTS main_character_server text,
  ADD COLUMN IF NOT EXISTS main_character_name text,
  ADD COLUMN IF NOT EXISTS main_character_class text,
  ADD COLUMN IF NOT EXISTS main_character_level integer;

-- Add index for faster lookup
CREATE INDEX IF NOT EXISTS idx_ledger_users_main_character
  ON ledger_users(main_character_server, main_character_name);

-- Comment for documentation
COMMENT ON COLUMN ledger_users.main_character_server IS 'Main character server name (e.g., 이스라펠)';
COMMENT ON COLUMN ledger_users.main_character_name IS 'Main character name';
COMMENT ON COLUMN ledger_users.main_character_class IS 'Main character class name';
COMMENT ON COLUMN ledger_users.main_character_level IS 'Main character level';
