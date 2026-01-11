# /db - 데이터베이스 관리

Supabase 데이터베이스 관련 작업을 수행합니다.

## 사용법
```
/db [옵션]
```

## 옵션
- `/db tables` - 테이블 목록 및 구조 확인
- `/db stats` - 데이터 통계 (캐릭터 수 등)
- `/db sql [쿼리]` - SQL 쿼리 생성

## 주요 테이블
- `characters` - 캐릭터 정보
- `settings` - 시스템 설정 (체크포인트 등)

## 관련 파일
- `frontend/src/lib/supabaseApi.ts` - Supabase API 래퍼
- `supabase/migrations/` - 마이그레이션 파일

## 환경변수
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (서버 전용)

## 체크포인트 테이블 생성 SQL
```sql
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
```
