-- Add PVE and PVP combat power scores to characters table
-- noa_score is kept for backward compatibility

ALTER TABLE characters
ADD COLUMN IF NOT EXISTS pve_score INTEGER,
ADD COLUMN IF NOT EXISTS pvp_score INTEGER;

-- Copy existing noa_score to pve_score for existing records
UPDATE characters SET pve_score = noa_score WHERE noa_score IS NOT NULL AND pve_score IS NULL;

-- Add indexes for ranking
CREATE INDEX IF NOT EXISTS idx_characters_pve_score ON characters(pve_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_characters_pvp_score ON characters(pvp_score DESC NULLS LAST);

COMMENT ON COLUMN characters.pve_score IS 'PVE combat power score calculated from PVE stats';
COMMENT ON COLUMN characters.pvp_score IS 'PVP combat power score calculated from PVP stats';
