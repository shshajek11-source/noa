-- 캐릭터별 이용권/오드 에너지 상태 테이블
CREATE TABLE IF NOT EXISTS public.ledger_character_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  character_id TEXT NOT NULL,

  -- 기본 이용권 (자동 충전)
  base_tickets JSONB NOT NULL DEFAULT '{
    "transcend": 14,
    "expedition": 21,
    "sanctuary": 4,
    "daily_dungeon": 6,
    "awakening": 6,
    "nightmare": 6,
    "dimension": 6,
    "subjugation": 6
  }'::jsonb,

  -- 보너스 이용권 (수동 충전)
  bonus_tickets JSONB NOT NULL DEFAULT '{
    "transcend": 0,
    "expedition": 0,
    "sanctuary": 0,
    "daily_dungeon": 0,
    "awakening": 0,
    "nightmare": 0,
    "dimension": 0,
    "subjugation": 0
  }'::jsonb,

  -- 오드 에너지
  od_time_energy INTEGER NOT NULL DEFAULT 840,
  od_ticket_energy INTEGER NOT NULL DEFAULT 0,
  od_last_charge_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 충전 시간 추적
  last_charge_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sanctuary_charge_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 메타데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 제약 조건: 한 유저의 한 캐릭터는 하나의 상태만 가짐
  UNIQUE(user_id, character_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_ledger_character_state_user_char
  ON public.ledger_character_state(user_id, character_id);

-- RLS 정책
ALTER TABLE public.ledger_character_state ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 캐릭터 상태만 조회
CREATE POLICY "Users can view own character state"
  ON public.ledger_character_state
  FOR SELECT
  USING (user_id = current_setting('request.headers')::json->>'x-user-id');

-- 사용자는 자신의 캐릭터 상태만 생성
CREATE POLICY "Users can insert own character state"
  ON public.ledger_character_state
  FOR INSERT
  WITH CHECK (user_id = current_setting('request.headers')::json->>'x-user-id');

-- 사용자는 자신의 캐릭터 상태만 수정
CREATE POLICY "Users can update own character state"
  ON public.ledger_character_state
  FOR UPDATE
  USING (user_id = current_setting('request.headers')::json->>'x-user-id')
  WITH CHECK (user_id = current_setting('request.headers')::json->>'x-user-id');

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_ledger_character_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ledger_character_state_timestamp
  BEFORE UPDATE ON public.ledger_character_state
  FOR EACH ROW
  EXECUTE FUNCTION update_ledger_character_state_updated_at();
