# CLAUDE.md

## 프로젝트 개요
**SUGO.gg** - AION 2 캐릭터 정보/랭킹/장비/스탯 웹 서비스
- Next.js 14 (App Router) + TypeScript + Supabase + Vercel
- 테마: Black (#000, #111) + Orange (#f59e0b)

## 핵심 설정
- **Supabase**: `mnbngmdjiszyowfvnzhk.supabase.co` (다른 ID 사용 금지!)
- **인증**: `src/lib/auth.ts` → `getUserFromRequest()` 사용
- **명령어**: `cd frontend && npm run dev/build/lint`

## 디자인 색상
```
배경: #000(메인), #0a0a0a(서브), #111(카드)
테두리: #222(기본), #333(강조)
포인트: #f59e0b(주황), #A78BFA(보라-소량)
텍스트: #E5E7EB(메인), #9CA3AF(보조), #6B7280(비활성)
종족: #2DD4BF(천족), #A78BFA(마족)
기타: #ef4444(에러), #3b82f6(정보), #10B981(성공)
```

## API 작성 패턴
```typescript
import { getSupabase, getUserFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabase()
  const { data, error } = await supabase.from('table').select('*')
  if (error) throw error
  return NextResponse.json(data)
}
```

## 주요 규칙
1. **데이터 저장**: Supabase 필수 (localStorage는 UI 상태만)
2. **API 호출**: DB 직접 조회 > 자체 API > 외부 API (순서대로 우선)
3. **병렬 처리**: `Promise.all()` 사용 필수
4. **기존 기능**: 작동하는 코드 건드리지 않기
5. **수정 범위**: 최소화, 변경 파일 명확히 안내
6. **작업 완료 시**: 결과를 비개발자도 이해하기 쉽게 설명 (전문 용어 풀어서, "무엇이 해결되었는지" 중심)

## 모바일 (1024px 미만)
- 별도 컴포넌트: `*Mobile.tsx`, `*Mobile.module.css`
- 고정 네비게이션 없음 (광고 호환)
- CSS 변수 대신 직접 색상값 사용

## 가계부 날짜
- 일일 리셋: 새벽 5시
- 주간 리셋: 수요일 새벽 5시
- 유틸: `getGameDate()`, `getWeekKey()`, `isEditable()`

## 커밋
```bash
cd C:\projects\hiton2
git add . && git commit -m "fix: 설명" && git push
```
