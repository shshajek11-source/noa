-- Add unit_price and total_price columns to ledger_items table
ALTER TABLE ledger_items
ADD COLUMN IF NOT EXISTS unit_price BIGINT,
ADD COLUMN IF NOT EXISTS total_price BIGINT,
ADD COLUMN IF NOT EXISTS sold_date TIMESTAMPTZ;

-- Add comments
COMMENT ON COLUMN ledger_items.unit_price IS '개당 가격 (키나)';
COMMENT ON COLUMN ledger_items.total_price IS '총 가격 (quantity * unit_price)';
COMMENT ON COLUMN ledger_items.sold_date IS '판매 날짜';

-- Update existing items: set unit_price and total_price based on sold_price if available
-- This is a one-time migration to initialize the values
UPDATE ledger_items
SET
    unit_price = CASE WHEN sold_price IS NOT NULL THEN sold_price / NULLIF(quantity, 0) ELSE 0 END,
    total_price = CASE WHEN sold_price IS NOT NULL THEN sold_price ELSE 0 END
WHERE unit_price IS NULL OR total_price IS NULL;
