# 📊 능력치 총합 탭 설계도

## 1. 개요
캐릭터 상세 페이지에 "능력치 총합" 탭을 추가하여 모든 능력치를 한눈에 확인할 수 있도록 구현

---

## 2. 현재 구조 분석

### 2.1 탭 위치
- **파일**: `frontend/src/app/c/[server]/[name]/page.tsx`
- **현재 탭**: `equipment`, `skills`, `network`
- **변경 후**: `equipment`, `skills`, `stats-summary`

### 2.2 데이터 소스
```typescript
// 페이지에서 사용 가능한 데이터
- mappedStats        // 기본 능력치 (stats.statList)
- mappedEquipment    // 장비/악세서리 (마나석, 각인, 돌파)
- mappedDaevanion    // 데바니온 보드 (활성화된 노드별 스탯)
- mappedTitles       // 칭호 효과
- mappedSkills       // 패시브 스킬 버프
```

---

## 3. 표시할 능력치 목록 (공식 사이트 기준)

### 3.1 ⚔️ 공격 능력치
```
- 공격력
- 명중
- 치명타
- PVE 피해 증폭
- 마지
- 공격력 증가
- 물리 공격력 (데바니온)
- 물리 치명타 (데바니온)
- 마법 증폭력 (데바니온)
- 마법 적중 (데바니온)
```

### 3.2 🛡️ 방어 능력치
```
- 방어력
- 생명력
- PVE 피해 내성
- 방어력 증가
- 생명력 받침 확률 증가
- 재생
- 물리 방어 (데바니온)
- 마법 저항 (데바니온)
```

### 3.3 ⚡ 특수 능력치
```
- 관통
- 응전력 증가 패널
- 전력
- 우기 피해 증폭
- 전투 속도
- 대인 원드 저항
- 이동 속도 (데바니온)
- 회피 (데바니온)
```

### 3.4 🌟 6신 저항
```
- 시간[네자칸]
- 운영[지켈]
- 자율[바이젤]
- 바커[트리니엘]
- 혼삼[아리엘]
- 즉정[아스펠]
```

### 3.5 🎯 기타 능력치
```
- 위력
- 정확
- 상태이상 저항
- 받는 치료량
- 치명타 방어력
- 회피
- 민첩
- 이동 속도
- 정신력
- 정신력 자연 회복
- 추가 획비
- 피해 증폭
- 추가 명중
- 치명타 저항
- 치명타 피해 증폭
- 상태이상 적중 (데바니온)
```

---

## 4. UI 레이아웃 설계

### 4.1 전체 구조
```
┌──────────────────────────────────────────────────┐
│  📊 능력치 총합                [모두 펼치기/접기] │
├──────────────────────────────────────────────────┤
│                                                  │
│  ▼ ⚔️ 공격 능력치 (10개)      [접기]           │
│  ┌────────────────────────────────────────────┐ │
│  │ 공격력      1,458  +2,350  [상세]         │ │
│  │ 명중          413      -      -            │ │
│  │ 치명타        384    +72   [상세]         │ │
│  │ ...                                        │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  ▶ 🛡️ 방어 능력치 (8개)       [펼치기]         │
│                                                  │
│  ▶ ⚡ 특수 능력치 (8개)       [펼치기]         │
│                                                  │
│  ▶ 🌟 6신 저항 (6개)         [펼치기]         │
│                                                  │
│  ▶ 🎯 기타 능력치 (15개)      [펼치기]         │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 4.2 능력치 행 구조
```
┌─────────────────────────────────────────────────┐
│ 능력치명     기본값   보너스   [상세보기 버튼]   │
│ 공격력      1,458   +2,350      [📊]           │
└─────────────────────────────────────────────────┘

클릭 시 펼침:
┌─────────────────────────────────────────────────┐
│ 공격력      1,458   +2,350      [📊 열림]      │
│                                                 │
│ 출처별 기여도:                                  │
│   • 기본값:        1,458                        │
│   • 📦 장비:       +1,200  (마나석 +800 등)    │
│   • 💎 악세서리:    +850                        │
│   • ⚔️ 데바니온:    +250  (네자칸 6노드)       │
│   • 🎖️ 칭호:        +50                         │
│   ──────────────────                            │
│   합계:          3,808                          │
└─────────────────────────────────────────────────┘
```

### 4.3 컴팩트 테이블 형식
```
능력치명          기본값    보너스
──────────────────────────────────
공격력           1,458    +2,350  📊
명중              413        -
치명타            384      +72   📊
PVE 피해 증폭    23.5     -3.5   📊
마지              326        -
```

---

## 5. 데이터 집계 로직

### 5.1 능력치 집계 함수
```typescript
function aggregateAllStats(
  stats: any,
  equipment: any[],
  daevanion: any,
  titles: any
): Record<string, AggregatedStat> {

  // 결과 객체
  const result: Record<string, AggregatedStat> = {}

  // 1️⃣ 기본 스탯 (stats.statList)
  stats.statList.forEach(stat => {
    result[stat.name] = {
      name: stat.name,
      baseValue: stat.value,
      bonus: 0,
      sources: {
        equipment: 0,
        accessories: 0,
        daevanion: 0,
        titles: 0
      }
    }
  })

  // 2️⃣ 장비/악세서리 스탯
  equipment.forEach(item => {
    // 마나석
    item.manastones?.forEach(stone => {
      result[stone.type].sources.equipment += stone.value
      result[stone.type].bonus += stone.value
    })

    // 영혼 각인
    if (item.soulEngraving) {
      // ...
    }

    // 돌파
    if (item.breakthrough > 0) {
      // ...
    }
  })

  // 3️⃣ 데바니온 스탯 (핵심!)
  daevanion.boardList.forEach(board => {
    const godName = board.name  // '네자칸', '지켈' 등
    const openNodeCount = board.openNodeCount  // 활성화된 노드 수

    // DAEVANION_STATS에서 해당 신의 스탯 데이터 가져오기
    const godId = GOD_ID_MAP[godName]
    const nodeStats = DAEVANION_STATS[godId]

    // 활성화된 노드만큼 스탯 합산
    for (let i = 1; i <= openNodeCount; i++) {
      const nodeStat = nodeStats[i]
      if (nodeStat.type === 'stat') {
        const statName = nodeStat.name  // '물리 공격력'
        const statValue = parseInt(nodeStat.value.replace('+', ''))

        if (!result[statName]) {
          result[statName] = {
            name: statName,
            baseValue: 0,
            bonus: 0,
            sources: { equipment: 0, accessories: 0, daevanion: 0, titles: 0 }
          }
        }

        result[statName].sources.daevanion += statValue
        result[statName].bonus += statValue
      }
    }
  })

  // 4️⃣ 칭호 스탯
  // titles 데이터 파싱 후 추가

  return result
}
```

### 5.2 데바니온 노드 스탯 계산 예시
```typescript
// 네자칸 12노드 활성화 시:
// DAEVANION_STATS['nezakan']
// - 노드 1: 물리 공격력 +3
// - 노드 2: 물리 치명타 +12
// - 노드 3: 물리 공격력 +3
// - 노드 4: 물리 치명타 +12
// ... (12번까지)

// 결과:
// 물리 공격력: +18 (3 × 6개)
// 물리 치명타: +72 (12 × 6개)
```

---

## 6. 컴포넌트 구조

### 6.1 파일 구조
```
frontend/src/app/components/
  └── StatsSummaryView.tsx       // 메인 컴포넌트
```

### 6.2 컴포넌트 인터페이스
```typescript
interface StatsSummaryViewProps {
  stats: any           // mappedStats
  equipment: any[]     // [...equipment, ...accessories]
  daevanion: any       // mappedDaevanion
  titles: any          // mappedTitles
}

interface AggregatedStat {
  name: string
  baseValue: number
  bonus: number
  sources: {
    equipment: number
    accessories: number
    daevanion: number
    titles: number
  }
}
```

### 6.3 상태 관리
```typescript
// 카테고리 펼침/접힘 상태
const [expandedCategories, setExpandedCategories] = useState({
  attack: true,    // 기본적으로 펼쳐짐
  defense: true,
  special: true,
  resistance: true,
  misc: true
})

// 개별 능력치 상세 보기 상태
const [expandedStat, setExpandedStat] = useState<string | null>(null)
```

---

## 7. 스타일링 가이드

### 7.1 색상 테마
```css
/* 배경 */
--bg-primary: #111318
--bg-secondary: #1F2433
--bg-hover: #2D3748

/* 텍스트 */
--text-primary: #E5E7EB
--text-secondary: #9CA3AF
--text-accent: #FACC15

/* 보너스 */
--bonus-positive: #10B981  /* 녹색 */
--bonus-negative: #EF4444  /* 빨간색 */

/* 카테고리 아이콘 */
--icon-attack: #EF4444
--icon-defense: #3B82F6
--icon-special: #8B5CF6
--icon-resistance: #F59E0B
--icon-misc: #6B7280
```

### 7.2 레이아웃
```css
/* 컴팩트 테이블 */
.stat-row {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  gap: 1rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

/* 카테고리 헤더 */
.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #1F2433;
  cursor: pointer;
}
```

---

## 8. 구현 단계

### Step 1: StatsSummaryView 컴포넌트 생성
- [ ] 기본 레이아웃 구조
- [ ] 카테고리 정의
- [ ] 펼치기/접기 기능

### Step 2: 능력치 집계 로직 구현
- [ ] aggregateAllStats 함수
- [ ] 기본 스탯 파싱
- [ ] 장비/악세서리 스탯 합산
- [ ] 데바니온 노드 스탯 계산
- [ ] 칭호 스탯 추가

### Step 3: UI 렌더링
- [ ] 카테고리별 그룹화
- [ ] 컴팩트 테이블 형식
- [ ] 상세 보기 패널
- [ ] 출처별 기여도 표시

### Step 4: page.tsx 통합
- [ ] import StatsSummaryView
- [ ] 탭 배열 수정 (`network` → `stats-summary`)
- [ ] 탭 라벨 수정
- [ ] props 전달

### Step 5: 테스트
- [ ] 모든 능력치 표시 확인
- [ ] 보너스 계산 정확도 확인
- [ ] 데바니온 스탯 반영 확인
- [ ] 펼치기/접기 동작 확인

---

## 9. 주의사항

### 9.1 데이터 처리
- API에서 제공하지 않는 능력치는 표시하지 않음
- 보너스가 0인 경우 `-` 표시
- 소수점 능력치 (예: PVE 피해 증폭 23.5) 처리

### 9.2 성능
- 능력치 집계는 한 번만 수행 (useMemo 활용)
- 카테고리 펼침 상태는 로컬 스토리지에 저장 가능

### 9.3 확장성
- 향후 스킬 버프 추가 가능
- 펫/날개 스탯 추가 가능
- 세트 효과 추가 가능

---

## 10. 예상 결과물

### 10.1 기본 보기
```
📊 능력치 총합

▼ ⚔️ 공격 능력치 (10개)
  공격력      1,458  +2,350  📊
  명중          413      -     -
  치명타        384    +72   📊

▶ 🛡️ 방어 능력치 (8개)
▶ ⚡ 특수 능력치 (8개)
▶ 🌟 6신 저항 (6개)
▶ 🎯 기타 능력치 (15개)
```

### 10.2 상세 보기 (클릭 시)
```
▼ ⚔️ 공격 능력치 (10개)
  공격력      1,458  +2,350  📊 [열림]

  출처별 기여도:
    • 기본값:        1,458
    • 📦 장비:       +1,200
    • 💎 악세서리:    +850
    • ⚔️ 데바니온:    +250 (네자칸 6노드)
    • 🎖️ 칭호:        +50
    ──────────────────
    합계:          3,808
```

---

## 11. API 데이터 구조 참고

### 11.1 stats (mappedStats)
```typescript
{
  statList: [
    { name: '공격력', value: 1458 },
    { name: '명중', value: 413 },
    // ...
  ]
}
```

### 11.2 daevanion (mappedDaevanion)
```typescript
{
  boardList: [
    {
      name: '네자칸',
      openNodeCount: 12,
      totalNodeCount: 87
    },
    // ...
  ]
}
```

### 11.3 equipment
```typescript
[
  {
    slot: '주무기',
    name: '전설의 검',
    manastones: [
      { type: '공격력', value: 150 }
    ],
    soulEngraving: { grade: 'Legend', percentage: 5 },
    breakthrough: 3
  },
  // ...
]
```

---

## 12. 완료 체크리스트

- [ ] StatsSummaryView.tsx 생성
- [ ] 능력치 집계 로직 구현
- [ ] 데바니온 스탯 계산 구현
- [ ] UI 렌더링 완료
- [ ] page.tsx 탭 통합
- [ ] 펼치기/접기 기능 동작
- [ ] 상세 보기 패널 동작
- [ ] 모든 능력치 표시 확인
- [ ] 데이터 정확도 검증
- [ ] 스타일링 완료

---

**설계 완료일**: 2026-01-06
**작성자**: Claude Sonnet 4.5
