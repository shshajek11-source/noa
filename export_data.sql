-- edwtbiujwjprydmahwhh에서 실행: 데이터 내보내기

-- 1. characters 테이블 데이터
SELECT
    'INSERT INTO characters (character_id, name, server_id, server_name, class_name, race_name, level, combat_power, item_level, profile_image, scraped_at) VALUES (' ||
    quote_literal(character_id) || ', ' ||
    quote_literal(name) || ', ' ||
    COALESCE(server_id::text, 'NULL') || ', ' ||
    quote_literal(server_name) || ', ' ||
    quote_literal(class_name) || ', ' ||
    quote_literal(race_name) || ', ' ||
    COALESCE(level::text, 'NULL') || ', ' ||
    COALESCE(combat_power::text, 'NULL') || ', ' ||
    COALESCE(item_level::text, 'NULL') || ', ' ||
    COALESCE(quote_literal(profile_image), 'NULL') || ', ' ||
    quote_literal(scraped_at::text) ||
    ') ON CONFLICT (character_id) DO NOTHING;'
FROM characters
ORDER BY scraped_at DESC
LIMIT 100;

-- 2. ledger_users 테이블 데이터
SELECT
    'INSERT INTO ledger_users (id, device_id, auth_user_id, nickname, main_character_id, main_character_name, main_character_server, main_character_class, main_character_level, main_character_race, main_character_item_level, main_character_image_url, created_at, last_seen_at) VALUES (' ||
    quote_literal(id::text) || '::uuid, ' ||
    COALESCE(quote_literal(device_id), 'NULL') || ', ' ||
    COALESCE(quote_literal(auth_user_id), 'NULL') || ', ' ||
    COALESCE(quote_literal(nickname), 'NULL') || ', ' ||
    COALESCE(quote_literal(main_character_id), 'NULL') || ', ' ||
    COALESCE(quote_literal(main_character_name), 'NULL') || ', ' ||
    COALESCE(quote_literal(main_character_server), 'NULL') || ', ' ||
    COALESCE(quote_literal(main_character_class), 'NULL') || ', ' ||
    COALESCE(main_character_level::text, 'NULL') || ', ' ||
    COALESCE(quote_literal(main_character_race), 'NULL') || ', ' ||
    COALESCE(main_character_item_level::text, 'NULL') || ', ' ||
    COALESCE(quote_literal(main_character_image_url), 'NULL') || ', ' ||
    quote_literal(created_at::text) || '::timestamp, ' ||
    quote_literal(last_seen_at::text) || '::timestamp' ||
    ') ON CONFLICT (id) DO NOTHING;'
FROM ledger_users;

-- 3. ledger_characters 테이블 데이터
SELECT
    'INSERT INTO ledger_characters (id, user_id, character_id, name, class_name, server_name, race, item_level, profile_image, is_main, display_order, created_at, updated_at) VALUES (' ||
    quote_literal(id::text) || '::uuid, ' ||
    quote_literal(user_id::text) || '::uuid, ' ||
    COALESCE(quote_literal(character_id), 'NULL') || ', ' ||
    quote_literal(name) || ', ' ||
    quote_literal(class_name) || ', ' ||
    quote_literal(server_name) || ', ' ||
    COALESCE(quote_literal(race), 'NULL') || ', ' ||
    COALESCE(item_level::text, 'NULL') || ', ' ||
    COALESCE(quote_literal(profile_image), 'NULL') || ', ' ||
    is_main::text || ', ' ||
    COALESCE(display_order::text, '0') || ', ' ||
    quote_literal(created_at::text) || '::timestamp, ' ||
    quote_literal(updated_at::text) || '::timestamp' ||
    ') ON CONFLICT (id) DO NOTHING;'
FROM ledger_characters;
