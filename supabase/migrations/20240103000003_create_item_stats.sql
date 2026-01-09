-- 아이템 마스터 테이블 (캐시 용도)
CREATE TABLE IF NOT EXISTS items (
    item_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category_name TEXT,
    grade TEXT,
    item_level INTEGER,
    icon TEXT,
    slot_pos INTEGER,
    class_restriction TEXT[],

    attack INTEGER DEFAULT 0,
    magic_attack INTEGER DEFAULT 0,
    defense INTEGER DEFAULT 0,
    magic_defense INTEGER DEFAULT 0,
    hp INTEGER DEFAULT 0,

    source TEXT,
    set_name TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 아이템 사용 통계 테이블 (일별 집계)
CREATE TABLE IF NOT EXISTS item_usage_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id TEXT NOT NULL,
    slot_pos INTEGER NOT NULL,
    class_name TEXT,

    usage_count INTEGER DEFAULT 0,
    total_characters INTEGER DEFAULT 0,
    usage_percent DECIMAL(5, 2),

    avg_enhance_level DECIMAL(5, 2),
    avg_breakthrough DECIMAL(5, 2),

    stat_date DATE DEFAULT CURRENT_DATE,

    UNIQUE(item_id, slot_pos, class_name, stat_date)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_item_usage_slot ON item_usage_stats(slot_pos);
CREATE INDEX IF NOT EXISTS idx_item_usage_class ON item_usage_stats(class_name);
CREATE INDEX IF NOT EXISTS idx_item_usage_date ON item_usage_stats(stat_date DESC);
CREATE INDEX IF NOT EXISTS idx_items_slot ON items(slot_pos);
CREATE INDEX IF NOT EXISTS idx_items_grade ON items(grade);

-- RPC: 아이템 인기도 통계 조회
CREATE OR REPLACE FUNCTION get_item_popularity_stats(
    p_slot_pos INTEGER DEFAULT NULL,
    p_class_name TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    item_id TEXT,
    item_name TEXT,
    slot_pos INTEGER,
    slot_name TEXT,
    grade TEXT,
    icon TEXT,
    usage_count BIGINT,
    usage_percent DECIMAL,
    avg_enhance_level DECIMAL,
    avg_breakthrough DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ius.item_id,
        i.name as item_name,
        ius.slot_pos,
        CASE ius.slot_pos
            WHEN 1 THEN '주무기'
            WHEN 2 THEN '보조무기'
            WHEN 3 THEN '투구'
            WHEN 4 THEN '견갑'
            WHEN 5 THEN '흉갑'
            WHEN 6 THEN '장갑'
            WHEN 7 THEN '각반'
            WHEN 8 THEN '장화'
            WHEN 9 THEN '목걸이'
            WHEN 10 THEN '귀걸이1'
            WHEN 11 THEN '귀걸이2'
            WHEN 12 THEN '반지1'
            WHEN 13 THEN '반지2'
            WHEN 15 THEN '팔찌2'
            WHEN 16 THEN '팔찌1'
            WHEN 17 THEN '허리띠'
            WHEN 19 THEN '망토'
            WHEN 22 THEN '아뮬렛'
            WHEN 23 THEN '룬1'
            WHEN 24 THEN '룬2'
            ELSE '기타'
        END as slot_name,
        i.grade,
        i.icon,
        ius.usage_count::BIGINT,
        ius.usage_percent,
        ius.avg_enhance_level,
        ius.avg_breakthrough
    FROM item_usage_stats ius
    LEFT JOIN items i ON ius.item_id = i.item_id
    WHERE
        (p_slot_pos IS NULL OR ius.slot_pos = p_slot_pos)
        AND (p_class_name IS NULL OR ius.class_name = p_class_name OR ius.class_name IS NULL)
        AND ius.stat_date = CURRENT_DATE
    ORDER BY ius.usage_count DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- RPC: 장비 데이터로부터 통계 집계 (배치 작업용)
CREATE OR REPLACE FUNCTION aggregate_item_stats()
RETURNS void AS $$
DECLARE
    total_chars INTEGER;
BEGIN
    -- 전체 캐릭터 수
    SELECT COUNT(*) INTO total_chars FROM characters WHERE equipment IS NOT NULL;

    -- 전체 캐릭터가 0명이면 종료
    IF total_chars = 0 THEN
        RETURN;
    END IF;

    -- 기존 오늘자 통계 삭제
    DELETE FROM item_usage_stats WHERE stat_date = CURRENT_DATE;

    -- 장비 JSON에서 아이템별 통계 집계 (직업별)
    INSERT INTO item_usage_stats (item_id, slot_pos, class_name, usage_count, total_characters, usage_percent, avg_enhance_level, avg_breakthrough, stat_date)
    SELECT
        item->>'id' as item_id,
        (item->>'slotPos')::INTEGER as slot_pos,
        c.class_name,
        COUNT(*) as usage_count,
        total_chars,
        ROUND(COUNT(*)::DECIMAL / total_chars * 100, 2) as usage_percent,
        AVG(COALESCE((item->>'enchantLevel')::INTEGER, 0)) as avg_enhance_level,
        AVG(COALESCE((item->>'exceedLevel')::INTEGER, 0)) as avg_breakthrough,
        CURRENT_DATE
    FROM characters c,
        jsonb_array_elements(c.equipment->'equipmentList') as item
    WHERE item->>'id' IS NOT NULL
        AND c.equipment IS NOT NULL
    GROUP BY item->>'id', (item->>'slotPos')::INTEGER, c.class_name;

    -- 아이템 마스터 테이블 업데이트 (신규 아이템 추가)
    INSERT INTO items (item_id, name, category_name, grade, item_level, icon, slot_pos)
    SELECT DISTINCT ON (item->>'id')
        item->>'id',
        item->>'name',
        item->>'categoryName',
        item->>'grade',
        (item->>'itemLevel')::INTEGER,
        item->>'icon',
        (item->>'slotPos')::INTEGER
    FROM characters c,
        jsonb_array_elements(c.equipment->'equipmentList') as item
    WHERE item->>'id' IS NOT NULL
        AND c.equipment IS NOT NULL
    ON CONFLICT (item_id) DO UPDATE SET
        name = EXCLUDED.name,
        category_name = EXCLUDED.category_name,
        grade = EXCLUDED.grade,
        item_level = EXCLUDED.item_level,
        icon = EXCLUDED.icon,
        slot_pos = EXCLUDED.slot_pos,
        updated_at = NOW();

END;
$$ LANGUAGE plpgsql;
