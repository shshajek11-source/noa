-- Add ranking columns to characters table
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS noa_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ranking_ap INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ranking_gp INTEGER DEFAULT 0;

-- Create indices for efficient ranking queries
CREATE INDEX IF NOT EXISTS idx_characters_noa_score ON characters (noa_score DESC);
CREATE INDEX IF NOT EXISTS idx_characters_combat_power ON characters (combat_power DESC);
CREATE INDEX IF NOT EXISTS idx_characters_ranking_ap ON characters (ranking_ap DESC);

-- Composite index for filtering rankings
-- Useful for queries like: SELECT * FROM characters WHERE server_id=X AND race_name=Y ORDER BY noa_score DESC
CREATE INDEX IF NOT EXISTS idx_characters_filters ON characters (server_id, race_name, class_name);
