-- Fix RLS policies for ledger_character_state table
-- The previous policies used current_setting('request.headers') which doesn't work with Next.js API Routes
-- Changing to public access policies (matching other ledger tables)

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own character state" ON public.ledger_character_state;
DROP POLICY IF EXISTS "Users can insert own character state" ON public.ledger_character_state;
DROP POLICY IF EXISTS "Users can update own character state" ON public.ledger_character_state;

-- Create new public access policies (access control is handled by API route)
CREATE POLICY "Allow public read on ledger_character_state"
  ON public.ledger_character_state
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on ledger_character_state"
  ON public.ledger_character_state
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on ledger_character_state"
  ON public.ledger_character_state
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete on ledger_character_state"
  ON public.ledger_character_state
  FOR DELETE
  USING (true);
