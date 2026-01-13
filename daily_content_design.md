# 일일 컨텐츠 설계서

## 1. 컨텐츠 목록

| 컨텐츠 ID | 이름 | 최대 횟수 | 기본 보상 | 아이콘 색상 |
|-----------|------|-----------|-----------|-------------|
| nightmare | 악몽 | 3 | 50,000 | #9333ea (보라) |
| shugo_festa | 슈고페스타 | 1 | 100,000 | #f59e0b (주황) |
| dimension_invasion | 차원침공 | 5 | 30,000 | #ef4444 (빨강) |
| awakening_battle | 각성전 | 3 | 40,000 | #3b82f6 (파랑) |
| subjugation | 토벌전 | 1 | 80,000 | #10b981 (초록) |
| daily_dungeon | 일일던전 | 6 | 20,000 | #facc15 (노랑) |

## 2. UI 컴포넌트 구조

### DailyContentGrid (새 컴포넌트)
```
DailyContentGrid/
  ├─ CircularProgress (원형 진행률)
  └─ DailyContentCard × 6 (각 컨텐츠 카드)
       ├─ 컨텐츠 아이콘
       ├─ 원형 진행률
       ├─ 완료 횟수 (2/3)
       └─ +/- 버튼
```

## 3. 원형 진행률 SVG

```svg
<svg viewBox="0 0 100 100">
  <!-- 배경 원 (회색) -->
  <circle
    cx="50" cy="50" r="45"
    fill="none"
    stroke="#374151"
    stroke-width="8"
  />

  <!-- 진행률 원 (시계방향, 12시 방향 시작) -->
  <circle
    cx="50" cy="50" r="45"
    fill="none"
    stroke="#facc15"
    stroke-width="8"
    stroke-dasharray="282.6"  <!-- 2πr = 2 * 3.14 * 45 -->
    stroke-dashoffset="282.6"  <!-- 100% 비어있음 -->
    transform="rotate(-90 50 50)"  <!-- 12시 방향 시작 -->
    transition="stroke-dashoffset 0.5s ease"
  />

  <!-- 중앙 텍스트 -->
  <text x="50" y="50" text-anchor="middle" dy="0.3em">
    2/3
  </text>
</svg>
```

### 진행률 계산
```typescript
const progress = completionCount / maxCount  // 0.0 ~ 1.0
const circumference = 2 * Math.PI * 45  // 282.6
const offset = circumference * (1 - progress)  // 채워진 만큼 offset 감소
```

## 4. 레이아웃

### CSS Grid (6열)
```css
.dailyContentGrid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
  padding: 20px;
}

@media (max-width: 1200px) {
  .dailyContentGrid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .dailyContentGrid {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

### 카드 디자인
```css
.dailyCard {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.circularProgress {
  width: 80px;
  height: 80px;
  position: relative;
}

.contentName {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
}

.countText {
  font-size: 18px;
  font-weight: 700;
  color: var(--primary);
}

.buttonGroup {
  display: flex;
  gap: 8px;
}

.decrementBtn, .incrementBtn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--bg-main);
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.2s;
}

.incrementBtn {
  background: var(--primary);
  color: #000;
}

.incrementBtn:hover {
  transform: scale(1.1);
  box-shadow: 0 0 10px var(--primary);
}
```

## 5. 파일 구조

```
frontend/src/app/ledger/
├─ components/
│  ├─ DailyContentSection.tsx      (새로 생성)
│  ├─ DailyContentCard.tsx         (새로 생성)
│  ├─ CircularProgress.tsx         (새로 생성)
│  ├─ KinaOverview.tsx             (기존)
│  └─ ContentIncomeSection.tsx     (기존)
│
├─ hooks/
│  └─ useDailyContent.ts           (새로 생성)
│
└─ page.tsx                        (수정 필요)
```

## 6. API 엔드포인트

기존 `/api/ledger/content-records` 사용 가능
- GET: 특정 날짜의 일일 컨텐츠 기록 조회
- POST: 완료 횟수 업데이트

## 7. 상태 관리

```typescript
interface DailyContent {
  id: string
  name: string
  maxCount: number
  completionCount: number
  baseReward: number
  color: string
}

const dailyContents: DailyContent[] = [
  { id: 'nightmare', name: '악몽', maxCount: 3, completionCount: 0, baseReward: 50000, color: '#9333ea' },
  { id: 'shugo_festa', name: '슈고페스타', maxCount: 1, completionCount: 0, baseReward: 100000, color: '#f59e0b' },
  { id: 'dimension_invasion', name: '차원침공', maxCount: 5, completionCount: 0, baseReward: 30000, color: '#ef4444' },
  { id: 'awakening_battle', name: '각성전', maxCount: 3, completionCount: 0, baseReward: 40000, color: '#3b82f6' },
  { id: 'subjugation', name: '토벌전', maxCount: 1, completionCount: 0, baseReward: 80000, color: '#10b981' },
  { id: 'daily_dungeon', name: '일일던전', maxCount: 6, completionCount: 0, baseReward: 20000, color: '#facc15' }
]
```

## 8. 애니메이션

- 원형 진행률: `stroke-dashoffset` 애니메이션 (0.5초)
- 버튼 클릭: `transform: scale(1.1)` + glow effect
- 카드 호버: 살짝 떠오르는 효과 (`translateY(-4px)`)

## 9. 접근성

- 버튼에 `aria-label` 추가
- 진행률에 `aria-valuenow`, `aria-valuemin`, `aria-valuemax` 추가
- 키보드 네비게이션 지원

## 10. 다크모드 색상

```css
:root {
  --daily-nightmare: #9333ea;
  --daily-shugo: #f59e0b;
  --daily-dimension: #ef4444;
  --daily-awakening: #3b82f6;
  --daily-subjugation: #10b981;
  --daily-dungeon: #facc15;
}
```
