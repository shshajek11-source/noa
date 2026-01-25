-- Add missing columns to ledger_users for main character info

-- Add main_character_id column
ALTER TABLE ledger_users
ADD COLUMN IF NOT EXISTS main_character_id text;

-- Add main_character_race column
ALTER TABLE ledger_users
ADD COLUMN IF NOT EXISTS main_character_race text;

-- Add main_character_item_level column
ALTER TABLE ledger_users
ADD COLUMN IF NOT EXISTS main_character_item_level integer;

-- Add main_character_hit_score column
ALTER TABLE ledger_users
ADD COLUMN IF NOT EXISTS main_character_hit_score integer;

-- Add main_character_pve_score column
ALTER TABLE ledger_users
ADD COLUMN IF NOT EXISTS main_character_pve_score integer;

-- Add main_character_pvp_score column
ALTER TABLE ledger_users
ADD COLUMN IF NOT EXISTS main_character_pvp_score integer;

-- Add main_character_image_url column
ALTER TABLE ledger_users
ADD COLUMN IF NOT EXISTS main_character_image_url text;

-- Add comments for documentation
COMMENT ON COLUMN ledger_users.main_character_id IS 'Main character ID from external API';
COMMENT ON COLUMN ledger_users.main_character_race IS 'Main character race (e.g., 천족, 마족)';
COMMENT ON COLUMN ledger_users.main_character_item_level IS 'Main character item level';
COMMENT ON COLUMN ledger_users.main_character_hit_score IS 'Main character hit score (legacy)';
COMMENT ON COLUMN ledger_users.main_character_pve_score IS 'Main character PVE combat power score';
COMMENT ON COLUMN ledger_users.main_character_pvp_score IS 'Main character PVP combat power score';
COMMENT ON COLUMN ledger_users.main_character_image_url IS 'Main character profile image URL';
