# /supabase - Supabase 관리

Supabase 데이터베이스 및 Edge Functions를 관리합니다.

## 사용법
```
/supabase [옵션]
```

## 옵션
- `/supabase status` - 연결 상태 확인
- `/supabase tables` - 테이블 목록
- `/supabase functions` - Edge Functions 목록
- `/supabase migrate` - 마이그레이션 안내
- `/supabase rls` - RLS 정책 확인

## 주요 테이블

| 테이블 | 설명 |
|--------|------|
| `characters` | 캐릭터 정보 캐시 |
| `equipment` | 장비 정보 |
| `ledger_character_state` | 레저 캐릭터 상태 |
| `settings` | 시스템 설정 |

## Edge Functions

| 함수 | 설명 | 경로 |
|------|------|------|
| `get-character` | 캐릭터 상세 조회 | `/supabase/functions/get-character/` |
| `search-character` | 캐릭터 검색 (외부 API) | `/supabase/functions/search-character/` |
| `search-local-character` | 캐릭터 검색 (로컬 DB) | `/supabase/functions/search-local-character/` |
| `refresh-character` | 캐릭터 데이터 갱신 | `/supabase/functions/refresh-character/` |

## 마이그레이션 실행

### Supabase CLI 사용
```bash
cd supabase
supabase db push
```

### Dashboard에서 직접 실행
1. Supabase Dashboard 접속
2. SQL Editor 열기
3. 마이그레이션 SQL 붙여넣기
4. Run 클릭

## RLS (Row Level Security)

### 현재 정책 확인
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'ledger_character_state';
```

### RLS 활성화/비활성화
```sql
-- 활성화
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- 비활성화 (개발용)
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```

## 흔한 문제

### 500 에러 + RLS
- RLS 정책이 `current_setting('request.headers')`를 사용하면 Next.js API에서 작동 안 함
- 해결: 공개 정책으로 변경하고 API에서 인증 처리

### 연결 실패
- 환경변수 확인: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Supabase 프로젝트 상태 확인

## Edge Functions 배포
```bash
cd supabase
supabase functions deploy get-character
supabase functions deploy search-character
```

## 유용한 SQL

### 테이블 스키마 확인
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ledger_character_state';
```

### 데이터 개수 확인
```sql
SELECT COUNT(*) FROM characters;
SELECT COUNT(*) FROM ledger_character_state;
```
