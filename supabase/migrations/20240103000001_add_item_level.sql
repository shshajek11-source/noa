-- 캐릭터 테이블에 아이템 레벨 컬럼 추가
ALTER TABLE characters ADD COLUMN IF NOT EXISTS item_level INTEGER;
