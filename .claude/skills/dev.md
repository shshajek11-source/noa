# /dev - 개발 서버 실행

로컬 개발 서버를 실행합니다.

## 사용법
```
/dev
```

## 실행 단계

1. `cd frontend` 디렉토리로 이동
2. `npm run dev` 실행
3. http://localhost:3000 에서 접속 가능 안내

## 주요 페이지
- http://localhost:3000 - 홈
- http://localhost:3000/ranking - 랭킹
- http://localhost:3000/analysis - 파티 분석
- http://localhost:3000/admin - 어드민
- http://localhost:3000/admin/collector - 캐릭터 수집

## 환경변수 확인
- `frontend/.env.local` 파일 필요
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
