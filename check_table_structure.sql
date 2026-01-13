-- ledger_characters 테이블 컬럼 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ledger_characters'
ORDER BY ordinal_position;

-- ledger_content_records 테이블 컬럼 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ledger_content_records'
ORDER BY ordinal_position;
