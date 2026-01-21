# AGENTS.md - AION 2 정보 제공 사이트 개발 가이드

## 프로젝트 개요
이 프로젝트는 AION 2 게임의 캐릭터 정보, 랭킹, 장비 데이터를 제공하는 웹 애플리케이션입니다. 
Next.js 14 (App Router) + TypeScript + Supabase를 사용하며, 실시간 데이터 동기화 시스템을 갖추고 있습니다.

## 빌드/테스트 명령어

### 프로젝트 루트에서 실행
```bash
# 개발 서버 시작
npm run dev          # frontend 디렉토리에서 Next.js 개발 서버 실행 (포트 3000)

# 프로덕션 빌드
npm run build        # frontend 디렉토리에서 프로덕션 빌드

# 프로덕션 서버 시작
npm run start        # 빌드된 앱 실행 (포트 3000)

# 린트 검사
npm run lint         # ESLint 검사 실행

# E2E 테스트
npm run test:e2e     # 간단한 E2E 상태 확인 테스트
```

### 개별 컴포넌트 테스트
이 프로젝트는 Jest 단위 테스트 대신 간단한 E2E 체크를 사용합니다:
```bash
# 직접 접속 테스트 (http://localhost:3000)
node frontend/tests/e2e-check.js
```

## 코드 스타일 가이드라인

### 1. 기본 원칙
- **모든 설명과 보고는 한국어로 작성** (코드 내 주석 제외)
- **클린 코드**: 함수는 단일 책임을 갖도록 작성
- **성능 최적화**: API 호출 병렬화, 불필요 리렌더링 방지
- **사용자 경험**: 로딩 상태 항상 표시, 에러 처리 명확히

### 2. 임포트 규칙 (Imports)
```typescript
// React 훅은 맨 위에
import { useState, useEffect } from 'react'

// Next.js 관련은 그 다음
import { NextRequest, NextResponse } from 'next/server'
import { useRouter } from 'next/navigation'

// 외부 라이브러리
import { Search } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

// 로컬 모듈 (절대 경로 우선)
import { supabaseApi } from '@/lib/supabaseApi'
import { SERVERS } from '@/app/constants/servers'
```

### 3. 컴포넌트 작성법
```typescript
'use client'  // 클라이언트 컴포넌트일 경우 항상 최상단에

// 타입 정의는 컴포넌트 내부 또는 별도 파일
interface SearchBarProps {
    onSearch: (query: string) => void
}

export default function SearchBar({ onSearch }: SearchBarProps) {
    // 훅은 최상단에
    const [query, setQuery] = useState('')
    const router = useRouter()
    
    // 이벤트 핸들러는 함수 스코프 내부에 정의
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSearch(query)
    }
    
    return (
        <div className="search-container">
            {/* JSX */}
        </div>
    )
}
```

### 4. API 라우트 작성법
```typescript
import { NextRequest, NextResponse } from 'next/server'

// 에러 핸들링은 try-catch로
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const characterId = searchParams.get('id')
    
    if (!characterId) {
        return NextResponse.json({ error: 'Missing characterId' }, { status: 400 })
    }
    
    try {
        // API 호출은 병렬로
        const [data1, data2] = await Promise.all([
            fetch(url1),
            fetch(url2)
        ])
        
        return NextResponse.json(transformedData)
    } catch (err: any) {
        console.error('[API Error]', err)
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
    }
}
```

### 5. 데이터 타이핑 규칙
```typescript
// 인터페이스는 앞에 I 붙이지 않음
export interface CharacterSearchResult {
    characterId: string
    name: string
    server: string
    level: number
    job: string
    race: string
    imageUrl?: string    // 옵셔널 프로퍼티는 ? 사용
}

// API 응답 타입은 명확하게 정의
type ApiResponse<T> = {
    data?: T
    error?: string
    message?: string
}
```

### 6. CSS 스타일링
```css
/* CSS Variables 사용 */
:root {
  --bg-main: #0B0D12;
  --primary: #FACC15;
  --text-main: #E5E7EB;
}

/* 유틸리티 클래스 재사용 */
.card {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 1.5rem;
  transition: transform 0.2s, border-color 0.2s;
}

.btn {
  background: var(--primary);
  color: var(--primary-text);
  padding: 0.6rem 1.2rem;
  border-radius: 4px;
  font-weight: 700;
  transition: background 0.2s, transform 0.1s;
}

.btn:hover {
  background: var(--primary-hover);
}
```

### 7. 에러 처리
```typescript
// 컴포넌트 내부 에러 상태
const [error, setError] = useState('')

// API 호출 에러 처리
try {
    const data = await apiCall()
    setData(data)
    setError('')
} catch (e) {
    console.error('API call failed:', e)
    setError('데이터를 불러오지 못했습니다.')
}

// 에러 UI 표시
{error && (
    <div className="error-message">
        {error}
    </div>
)}
```

### 8. 네이밍 규칙
- **파일명**: PascalCase (SearchBar.tsx, CharacterDetail.tsx)
- **컴포넌트**: PascalCase (export default SearchBar)
- **변수/함수**: camelCase (userName, handleSubmit, fetchData)
- **상수**: UPPER_SNAKE_CASE (SERVER_MAP, API_BASE_URL)
- **인터페이스**: PascalCase, I 접두사 없음 (CharacterSearchResult)
- **타입**: PascalCase (ApiResponse, CharacterData)

### 9. Supabase 데이터 동기화
```typescript
// 검색 로직은 항상 로컬 + 라이브 하이브리드
const performHybridSearch = async (searchTerm: string) => {
    // 로컬 DB 검색 (빠름)
    supabaseApi.searchLocalCharacter(searchTerm)
        .then(localResults => updateResults(localResults))
    
    // 라이브 API 검색 (최신 정보)
    supabaseApi.searchCharacter(searchTerm, serverId, race, 1)
        .then(liveResults => updateResults(liveResults))
}

// 글로벌 싱크 큐 사용
const { enqueueSync } = useSyncContext()
enqueueSync(searchResults)
```

### 10. 특수 패턴
```typescript
// 디바운스 패턴 (검색 입력)
useEffect(() => {
    const timer = setTimeout(() => {
        if (searchTerm.length >= 2) {
            performSearch(searchTerm)
        }
    }, 300)
    return () => clearTimeout(timer)
}, [searchTerm])

// 외부 클릭 핸들러
useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
        if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
            setIsOpen(false)
        }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
}, [])

// 로딩 상태 항상 표시
return (
    <div>
        {loading ? <LoadingSpinner /> : <DataView />}
    </div>
)
```

## 데이터 흐름
1. **사용자 검색** → SearchBar 컴포넌트
2. **하이브리드 검색** → 로컬 Supabase + 공식 API 병렬 호출  
3. **결과 동기화** → 백그라운드에서 DB 업데이트
4. **캐릭터 상세** → API 라우트에서 데이터 변환 및 캐싱
5. **실시간 업데이트** → SyncContext 통한 전역 상태 관리

## 주요 기술 스택
- **프론트엔드**: Next.js 14 (App Router), React 18, TypeScript, CSS Variables
- **데이터**: Supabase (PostgreSQL), Realtime Subscriptions
- **스타일링**: DAK.GG 스타일 (다크 모드 + 옐로우 액센트)
- **아이콘**: Lucide React
- **API**: AION 2 공식 API (웹스크래핑)

## Vercel React Best Practices (필수 준수)

### 1. React Server Components (RSC) 우선
```typescript
// ✅ 기본적으로 Server Component 사용 (데이터 페칭, 정적 콘텐츠)
// app/page.tsx - 'use client' 없으면 자동으로 Server Component
export default async function Page() {
    const data = await fetchData() // 서버에서 직접 데이터 페칭
    return <div>{data}</div>
}

// ❌ 불필요하게 'use client' 사용 금지
// 'use client'는 인터랙션(onClick, useState 등)이 필요할 때만 사용
```

### 2. Dynamic Imports로 번들 최적화
```typescript
import dynamic from 'next/dynamic'

// 무거운 컴포넌트는 동적 임포트
const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
    loading: () => <div>로딩 중...</div>,
    ssr: false // 클라이언트 전용 컴포넌트
})

// 모달, 드롭다운 등 초기 렌더링 불필요한 컴포넌트
const Modal = dynamic(() => import('@/components/Modal'))
```

### 3. Streaming SSR & Suspense 활용
```typescript
import { Suspense } from 'react'

export default function Page() {
    return (
        <div>
            <h1>캐릭터 정보</h1>
            {/* 느린 데이터는 Suspense로 스트리밍 */}
            <Suspense fallback={<SkeletonLoader />}>
                <CharacterStats />
            </Suspense>
            <Suspense fallback={<SkeletonLoader />}>
                <RankingList />
            </Suspense>
        </div>
    )
}
```

### 4. 이미지 최적화 (next/image 필수)
```typescript
import Image from 'next/image'

// ✅ 항상 next/image 사용
<Image
    src="/character.png"
    alt="캐릭터"
    width={200}
    height={200}
    priority // LCP 이미지에만 사용
    placeholder="blur" // 또는 "empty"
/>

// ❌ <img> 태그 직접 사용 금지
```

### 5. 폰트 최적화 (next/font 필수)
```typescript
import { Noto_Sans_KR } from 'next/font/google'

const notoSansKr = Noto_Sans_KR({
    subsets: ['latin'],
    weight: ['400', '700'],
    display: 'swap',
    preload: true,
})

export default function RootLayout({ children }) {
    return (
        <html className={notoSansKr.className}>
            <body>{children}</body>
        </html>
    )
}
```

### 6. 메모이제이션 전략
```typescript
'use client'
import { useMemo, useCallback, memo } from 'react'

// 비용이 큰 계산은 useMemo
const sortedData = useMemo(() => {
    return data.sort((a, b) => b.score - a.score)
}, [data])

// 자식에게 전달하는 콜백은 useCallback
const handleSearch = useCallback((query: string) => {
    performSearch(query)
}, [])

// 자주 리렌더링되는 자식은 memo
const CharacterCard = memo(function CharacterCard({ character }) {
    return <div>{character.name}</div>
})
```

### 7. 데이터 페칭 패턴
```typescript
// Server Component에서 직접 fetch (캐싱 자동)
async function getData() {
    const res = await fetch('https://api.example.com/data', {
        next: { revalidate: 3600 } // 1시간 캐시
    })
    return res.json()
}

// 여러 API 병렬 호출
const [characters, rankings] = await Promise.all([
    fetchCharacters(),
    fetchRankings()
])
```

### 8. Route Segment Config
```typescript
// 페이지별 캐싱/리밸리데이션 설정
export const revalidate = 60 // 60초마다 재검증
export const dynamic = 'force-static' // 정적 생성 강제
export const runtime = 'edge' // Edge Runtime 사용
```

### 9. Loading UI & Error Boundaries
```
app/
├── page.tsx
├── loading.tsx      // 자동 로딩 UI
├── error.tsx        // 에러 바운더리
└── not-found.tsx    // 404 페이지
```

### 10. 성능 체크리스트
- [ ] Server Component 최대 활용 (기본값)
- [ ] 'use client'는 인터랙션 필요 시에만
- [ ] next/image로 모든 이미지 최적화
- [ ] next/font로 폰트 최적화
- [ ] Dynamic imports로 코드 스플리팅
- [ ] Suspense로 점진적 로딩
- [ ] 불필요한 리렌더링 방지 (memo, useMemo, useCallback)
- [ ] API 호출 병렬화 (Promise.all)
- [ ] 적절한 캐싱 전략 (revalidate)

## 중요 고려사항
- **타겟 언어**: 한국어 (모든 UI 텍스트)
- **성능**: API 호출 최소화, 캐싱 전략 중요
- **데이터 정확도**: 공식 API와 100% 일치 보장
- **오류 처리**: 사용자에게 명확한 한국어 에러 메시지 제공