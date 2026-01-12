-- Add auth_user_id and nickname to ledger_users table

-- Add new columns
ALTER TABLE ledger_users
  ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE,
  ADD COLUMN IF NOT EXISTS nickname text,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone default timezone('utc'::text, now());

-- Make device_id nullable (since auth users won't have device_id)
ALTER TABLE ledger_users ALTER COLUMN device_id DROP NOT NULL;

-- Add index for faster lookup
CREATE INDEX IF NOT EXISTS idx_ledger_users_auth_user_id ON ledger_users(auth_user_id);

-- Drop old unique constraint on device_id
ALTER TABLE ledger_users DROP CONSTRAINT IF EXISTS ledger_users_device_id_key;

-- Add new constraint: either device_id or auth_user_id must be present
ALTER TABLE ledger_users
  ADD CONSTRAINT device_id_or_auth_user_id_required
  CHECK (device_id IS NOT NULL OR auth_user_id IS NOT NULL);

-- Add unique constraint for device_id when not null
CREATE UNIQUE INDEX IF NOT EXISTS ledger_users_device_id_unique
  ON ledger_users(device_id) WHERE device_id IS NOT NULL;
