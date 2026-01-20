# CLAUDE.md

> 이 파일은 Claude Code가 이 프로젝트에서 작업할 때 참고하는 지침서입니다.
> 마지막 업데이트: 2026-01-20

---

## 1. 프로젝트 개요

**HITON2** - AION 2 게임의 캐릭터 정보, 랭킹, 장비 데이터, 스탯을 제공하는 웹 서비스

| 항목 | 값 |
|------|---|
| **프레임워크** | Next.js 14 (App Router) |
| **언어** | TypeScript (Strict) |
| **백엔드** | Supabase PostgreSQL + Edge Functions |
| **배포** | Vercel (Frontend) |
| **테마** | Dark + Yellow accent |

---

## 2. 프로젝트 구조

```
hiton2/
├── frontend/src/
│   ├── app/                    # 페이지 및 API (32개 페이지, 64개 API)
│   │   ├── api/                # API 라우트
│   │   │   ├── character/      # 캐릭터 상세/검색
│   │   │   ├── ledger/         # 가계부 시스템 (11개 API)
│   │   │   ├── ranking/        # 랭킹
│   │   │   ├── party/          # 파티 시스템
│   │   │   ├── item/           # 아이템 검색
│   │   │   └── admin/          # 관리자 기능
│   │   ├── c/[server]/[name]/  # 캐릭터 상세 페이지
│   │   ├── ranking/            # 랭킹 페이지
│   │   ├── ledger/             # 가계부 페이지
│   │   ├── party/              # 파티 페이지
│   │   └── admin/              # 관리자 페이지
│   ├── lib/                    # 핵심 유틸리티 (5,179줄)
│   │   ├── auth.ts             # API 인증 (device_id + Bearer)
│   │   ├── supabaseApi.ts      # Supabase 클라이언트
│   │   ├── combatPower.ts      # 전투력 계산
│   │   ├── statsAggregator.ts  # 스탯 집계
│   │   └── rateLimit.ts        # Rate Limiting
│   ├── components/             # 공유 컴포넌트
│   ├── hooks/                  # 커스텀 훅 (16개)
│   ├── types/                  # TypeScript 타입 (9개)
│   └── data/                   # 정적 게임 데이터
└── supabase/
    └── migrations/             # DB 마이그레이션 (20+)
```

---

## 3. 주요 기능별 파일

### 3.1 캐릭터 검색/상세
| 기능 | 파일 |
|------|------|
| 검색 API | `src/app/api/search/live/route.ts` |
| 상세 API | `src/app/api/character/route.ts` |
| 상세 페이지 | `src/app/c/[server]/[name]/page.tsx` |
| 검색 컴포넌트 | `src/app/components/SearchAutocomplete.tsx` |

### 3.2 가계부 (Ledger)
| 기능 | 파일 |
|------|------|
| 메인 페이지 | `src/app/ledger/page.tsx` (40KB) |
| 던전 컨텐츠 | `src/app/ledger/components/DungeonContentSection.tsx` |
| 주간 컨텐츠 | `src/app/ledger/components/WeeklyContentSection.tsx` |
| 일일 컨텐츠 | `src/app/ledger/components/DailyContentSection.tsx` |
| 대시보드 | `src/app/ledger/components/DashboardSummary.tsx` |
| 아이템 관리 | `src/app/ledger/components/ItemManagementTab.tsx` |

### 3.3 가계부 API
| API | 경로 |
|-----|------|
| 캐릭터 목록 | `/api/ledger/characters` |
| 캐릭터 상태 | `/api/ledger/character-state` |
| 던전 기록 | `/api/ledger/dungeon-records` |
| 주간 컨텐츠 | `/api/ledger/weekly-content` |
| 아이템 | `/api/ledger/items` |
| 컨텐츠 기록 | `/api/ledger/content-records` |

### 3.4 전투력 계산
| 기능 | 파일 |
|------|------|
| 전투력 계산 | `src/lib/combatPower.ts` |
| 스탯 집계 | `src/lib/statsAggregator.ts` |
| 스탯 검증 | `src/lib/statsValidator.ts` |

---

## 4. 개발 명령어

```bash
# 개발 서버 (Turbo)
cd frontend && npm run dev

# 프로덕션 빌드
cd frontend && npm run build

# ESLint 검사
cd frontend && npm run lint

# Git 커밋 & 푸시 (상위 폴더에서)
cd .. && git add . && git commit -m "메시지" && git push
```

---

## 5. Supabase 설정

### 필수 프로젝트 정보
| 항목 | 값 |
|------|---|
| Project ID | `mnbngmdjiszyowfvnzhk` |
| URL | `https://mnbngmdjiszyowfvnzhk.supabase.co` |

**주의:** 다른 Supabase 프로젝트 ID 사용 금지!

### 인증 방식 (우선순위)
```typescript
// src/lib/auth.ts 사용
import { getSupabase, getUserFromRequest } from '@/lib/auth'

// 1순위: device_id (X-Device-ID 헤더)
// 2순위: Bearer 토큰 (폴백)
```

### API 라우트 작성 패턴
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, getUserFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  // 1. 인증
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. 파라미터 검증
  const { searchParams } = new URL(request.url)
  const characterId = searchParams.get('characterId')
  if (!characterId) {
    return NextResponse.json({ error: 'Missing characterId' }, { status: 400 })
  }

  try {
    // 3. 데이터 처리
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('table_name')
      .select('*')
      .eq('character_id', characterId)

    if (error) throw error
    return NextResponse.json(data)
  } catch (e: any) {
    console.error('[API Name] Error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
```

---

## 6. 주요 데이터베이스 테이블

### 캐릭터 관련
- `characters` - 캐릭터 기본 정보, 장비, 스탯

### 가계부 관련
- `ledger_users` - 사용자 (device_id 기반)
- `ledger_characters` - 사용자 캐릭터 목록
- `ledger_items` - 보유 아이템
- `ledger_dungeon_records` - 던전 기록
- `ledger_weekly_content` - 주간 컨텐츠
- `ledger_daily_mission` - 일일 사명
- `ledger_character_state` - 캐릭터 상태 (티켓 등)
- `ledger_content_records` - 컨텐츠 기록

---

## 7. API 호출 원칙

### 우선순위
1. **Supabase DB** 직접 조회 (10-50ms) ✅
2. **자체 API** 사용 (50-200ms) ✅
3. **외부 API** 호출 (500-2000ms) ⚠️ 필요시만

### 캐릭터 데이터 조회 원칙
**캐릭터 상세 페이지 외의 다른 페이지에서 캐릭터 정보가 필요한 경우:**

1. **1순위: 캐릭터 상세 페이지 데이터 활용** ✅
   - `characters` 테이블에 이미 저장된 정보 우선 사용
   - 장비, 스탯, 클래스, 서버 등 기본 정보 활용
   ```typescript
   // ✅ GOOD: DB에 저장된 캐릭터 정보 사용
   const { data } = await supabase
     .from('characters')
     .select('name, server_name, class_name, item_level')
     .eq('character_id', characterId)
   ```

2. **2순위: 공식 페이지 연동** ⚠️
   - DB에 없는 정보만 공식 API에서 조회
   - 조회 후 반드시 캐싱하여 재사용
   ```typescript
   // ⚠️ 필요시만: 공식 API 호출 후 캐싱
   const fresh = await fetchFromOfficialAPI(characterId)
   await saveToCache(fresh)  // 다음 요청 시 DB에서 조회
   ```

3. **❌ 금지: 매 요청마다 공식 API 직접 호출**
   - 불필요한 외부 API 호출은 속도 저하 원인
   - Rate Limit 초과 위험

### 병렬 처리 필수
```typescript
// ✅ GOOD: 병렬 처리
const [stats, items] = await Promise.all([
  fetch('/api/stats'),
  fetch('/api/items')
])

// ❌ BAD: 순차 처리
const stats = await fetch('/api/stats')
const items = await fetch('/api/items')
```

### 캐싱 전략
- 캐릭터 정보: 5분 TTL
- 검색 결과: 즉시 + 백그라운드 업데이트
- 랭킹 데이터: 10분 TTL

---

## 8. 데이터 저장 규칙

### 반드시 Supabase 사용
```typescript
// ✅ GOOD: Supabase 저장
await fetch('/api/ledger/character-state', {
  method: 'POST',
  body: JSON.stringify(data)
})

// ❌ BAD: localStorage 저장 (금지)
localStorage.setItem('user-data', JSON.stringify(data))
```

### localStorage 허용 범위
- UI 접기/펼치기 상태
- 테마 설정
- 임시 캐시 (최근 검색어 등)

---

## 9. Claude Code 작업 규칙

### 허용 작업
- ✅ 코드 읽기/수정/생성
- ✅ npm 명령어 실행 (build, dev, lint)
- ✅ git 명령어 실행 (add, commit, push)
- ✅ 파일 검색 (Glob, Grep)

### 작업 절차
1. **작업 전 컨펌** - 수정 내용 간단히 설명 후 진행
2. **비개발자 친화적 설명** - 전문 용어 쉽게 풀어서
3. **결과 중심 보고** - "어떤 문제가 해결되는지" 초점

### 에러 발생 시
1. 빌드 오류 → 자동 분석 및 수정 시도
2. 수정 후 다시 빌드
3. 해결 내용 간결하게 보고

### 기능 수정 시 주의
- **기존 작동하는 기능 건드리지 않기**
- 수정 범위를 최소화
- 변경 파일 명확히 안내

---

## 10. 코드 스타일

### React 컴포넌트
```typescript
'use client'

import { useState, useEffect, useCallback, memo } from 'react'
import styles from './Component.module.css'

interface ComponentProps {
  // props 정의
}

function Component({ prop1, prop2 }: ComponentProps) {
  // 훅, 상태, 핸들러
  return (
    <div className={styles.container}>
      {/* JSX */}
    </div>
  )
}

// 성능 최적화 필요시 memo 적용
export default memo(Component)
```

### CSS 테마 변수
```css
--bg-main: #0B0D12      /* 메인 배경 */
--bg-card: #151921      /* 카드 배경 */
--primary: #FACC15      /* 노란 액센트 */
--text-main: #E5E7EB    /* 기본 텍스트 */
--text-secondary: #9CA3AF /* 보조 텍스트 */
```

---

## 11. 가계부 날짜 로직

### 게임 날짜 기준
- **일일 리셋**: 매일 새벽 5시
- **주간 리셋**: 수요일 새벽 5시

### 날짜 유틸리티
```typescript
import { getGameDate, getWeekKey, isEditable } from '../utils/dateUtils'

// 게임 날짜 (5시 기준)
const today = getGameDate(new Date())  // "2026-01-20"

// 주간 키 (수요일 기준)
const weekKey = getWeekKey(new Date())  // "2026-W04"

// 수정 가능 여부 (당일만)
const canEdit = isEditable(selectedDate)
```

---

## 12. 자주 발생하는 이슈

### 빌드 에러
| 에러 | 원인 | 해결 |
|------|------|------|
| `Type error: Property 'X' does not exist` | 타입 정의 누락 | interface에 속성 추가 |
| `Module not found` | import 경로 오류 | 경로 확인 및 수정 |
| `Unauthorized 401` | 인증 헤더 누락 | `getAuthHeader()` 사용 |

### 데이터 동기화
| 문제 | 원인 | 해결 |
|------|------|------|
| 저장 안 됨 | 잘못된 테이블명 | API 라우트 확인 |
| 불러오기 안 됨 | 날짜 형식 불일치 | `getGameDate()` 사용 |
| 합산 표시 | 잔여/충전권 구분 누락 | `baseTickets` 분리 |

---

## 13. 배포 체크리스트

### 커밋 전
- [ ] `npm run build` 성공 확인
- [ ] TypeScript 에러 없음
- [ ] 기존 기능 정상 작동

### 커밋 & 푸시
```bash
cd C:\projects\hiton2
git add .
git commit -m "fix: 설명"
git push
```

### 배포 후
- [ ] Vercel 빌드 성공 확인
- [ ] 프로덕션 사이트 테스트

---

## 14. 연락처 및 참고

- **GitHub**: `shshajek-cpu/hiton-1-12`
- **배포**: Vercel (자동 배포)
- **DB 관리**: Supabase Dashboard

---

*이 문서는 프로젝트 변경 시 업데이트가 필요합니다.*
