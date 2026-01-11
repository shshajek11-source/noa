# /env - 환경변수 관리

프로젝트 환경변수 설정을 확인하고 안내합니다.

## 사용법
```
/env [옵션]
```

## 옵션
- `/env check` - 필요한 환경변수 확인
- `/env vercel` - Vercel 환경변수 설정 안내
- `/env local` - 로컬 환경변수 설정 안내

## 필요한 환경변수

### 필수
| 변수명 | 설명 | 위치 |
|--------|------|------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase URL | 로컬 + Vercel |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase 익명 키 | 로컬 + Vercel |

### 선택 (기능별)
| 변수명 | 설명 | 기능 |
|--------|------|------|
| ADMIN_API_KEY | Admin API 인증 키 | Admin 페이지 |
| NEXT_PUBLIC_ADMIN_API_KEY | 클라이언트용 Admin 키 | Admin 페이지 |
| GEMINI_API_KEY | Google Gemini API 키 | OCR 파티분석 |
| SUPABASE_SERVICE_ROLE_KEY | 서비스 역할 키 | 캐릭터 수집 |

## 로컬 설정 파일
`frontend/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
ADMIN_API_KEY=your-admin-key
GEMINI_API_KEY=your-gemini-key
```

## Vercel 설정
Settings → Environment Variables에서 추가
