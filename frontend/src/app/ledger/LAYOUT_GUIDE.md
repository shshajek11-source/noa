# 가계부 페이지 레이아웃 가이드

## 📋 전체 구조 (Page Layout)

```
┌─────────────────────────────────────────────────────────────┐
│                        [헤더 영역]                             │
│                      Header Section                          │
├─────────────────────────────────────────────────────────────┤
│                   [키나 수급 현황 박스]                         │
│              CompactKinaOverview (캐릭터 선택 시)              │
├─────────────────────────────────────────────────────────────┤
│                     [캐릭터 탭 영역]                           │
│                    LedgerTabs Section                        │
├─────────────────────────────────────────────────────────────┤
│ [대시보드] 또는 [캐릭터 상세 뷰]                                │
│                                                               │
│ ┌───────────────────────────────────────────────────────┐  │
│ │  대시보드 모드 (activeTab === 'dashboard')               │  │
│ │  ➜ DashboardSummary                                    │  │
│ └───────────────────────────────────────────────────────┘  │
│                                                               │
│ ┌───────────────────────────────────────────────────────┐  │
│ │  캐릭터 모드 (activeTab !== 'dashboard')                 │  │
│ │  ├─ [컨텐츠/아이템 서브탭]                               │  │
│ │  │   LedgerSubTabs                                      │  │
│ │  │                                                       │  │
│ │  ├─ 컨텐츠 탭 (activeSubTab === 'content')              │  │
│ │  │   ├─ PremiumContentSection                          │  │
│ │  │   ├─ ContentIncomeSection                           │  │
│ │  │   ├─ DailyContentSection                            │  │
│ │  │   └─ WeeklyChart                                    │  │
│ │  │                                                       │  │
│ │  └─ 아이템 탭 (activeSubTab === 'item')                 │  │
│ │      └─ ItemManagementTab                              │  │
│ └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                     [플로팅 날짜 버튼] (우하단)
                     FloatingDateButton
```

---

## 🔹 1. 헤더 영역 (Header Section)

**파일 경로**: `frontend/src/app/ledger/page.tsx:296-304`

```
┌─────────────────────────────────────────┐
│  💰 가계부                                │
│  캐릭터별 수입을 관리하고 추적하세요        │
└─────────────────────────────────────────┘
```

**구성 요소**:
- **제목**: "가계부" + 지갑 아이콘
- **부제**: "캐릭터별 수입을 관리하고 추적하세요"

**명칭**: `Header`

---

## 🔹 2. 키나 수급 현황 (CompactKinaOverview)

**파일 경로**: `frontend/src/app/ledger/components/CompactKinaOverview.tsx`
**표시 조건**: 캐릭터가 선택된 경우에만 표시 (activeTab !== 'dashboard')

```
┌──────────────────────────────────────────────────────────┐
│  오늘의 수입         |  이번 주 수입                        │
│  ─────────────────  |  ──────────────────                │
│  📦 컨텐츠: 123,456 키나  |  📦 컨텐츠: 567,890 키나        │
│  🎁 아이템: 78,900 키나   |  🎁 아이템: 234,567 키나        │
│  💰 총합: 202,356 키나    |  💰 총합: 802,457 키나          │
└──────────────────────────────────────────────────────────┘
```

**구성 요소**:
- **오늘의 수입**: 컨텐츠 수입 + 아이템 수입 + 총합
- **이번 주 수입**: 컨텐츠 수입 + 아이템 수입 + 총합

**명칭**: `CompactKinaOverview` 또는 `키나 수급 현황 박스`

---

## 🔹 3. 캐릭터 탭 (LedgerTabs)

**파일 경로**: `frontend/src/app/ledger/components/LedgerTabs.tsx`

```
┌────────────────────────────────────────────────┐
│ [전체] [캐릭터1] [캐릭터2] [캐릭터3] [+ 캐릭터 추가] │
└────────────────────────────────────────────────┘
```

**구성 요소**:
- **전체 탭**: 대시보드 (activeTab === 'dashboard')
- **캐릭터 탭들**: 각 캐릭터별 탭 (클릭 시 해당 캐릭터 뷰로 전환)
- **추가 버튼**: 새 캐릭터 추가

**명칭**: `LedgerTabs` 또는 `캐릭터 탭`

---

## 🔹 4. 대시보드 요약 (DashboardSummary)

**파일 경로**: `frontend/src/app/ledger/components/DashboardSummary.tsx`
**표시 조건**: activeTab === 'dashboard'

```
┌──────────────────────────────────────────────────┐
│  전체 수입 현황                                     │
│  ───────────────────────────────────────────    │
│  오늘: 500,000 키나  |  이번 주: 2,000,000 키나   │
│                                                   │
│  미판매 아이템: 12개                               │
│  ├─ 전설: 2개                                     │
│  ├─ 영웅: 4개                                     │
│  └─ 희귀: 6개                                     │
│                                                   │
│  캐릭터 목록                                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ 캐릭1    │ │ 캐릭2    │ │ 캐릭3    │        │
│  └──────────┘ └──────────┘ └──────────┘        │
└──────────────────────────────────────────────────┘
```

**구성 요소**:
- **전체 수입 현황**: 오늘/이번 주 총 수입
- **미판매 아이템 통계**: 등급별 개수
- **캐릭터 목록 카드**: 각 캐릭터 클릭 시 해당 캐릭터 뷰로 이동

**명칭**: `DashboardSummary` 또는 `대시보드 요약`

---

## 🔹 5. 서브탭 (LedgerSubTabs)

**파일 경로**: `frontend/src/app/ledger/components/LedgerSubTabs.tsx`
**표시 조건**: 캐릭터가 선택된 경우

```
┌────────────────────────┐
│ [컨텐츠] [아이템]        │
└────────────────────────┘
```

**구성 요소**:
- **컨텐츠 탭**: activeSubTab === 'content'
- **아이템 탭**: activeSubTab === 'item'

**명칭**: `LedgerSubTabs` 또는 `서브탭`

---

## 🔹 6. 프리미엄 컨텐츠 섹션 (PremiumContentSection)

**파일 경로**: `frontend/src/app/ledger/components/PremiumContentSection.tsx`
**표시 조건**: activeSubTab === 'content'

```
┌─────────────────────────────────────────────────┐
│  슈고페스타 & 어비스회랑                           │
│  ────────────────────────────────────────       │
│  ┌──────────────┐    ┌──────────────┐          │
│  │ 슈고페스타    │    │ 어비스회랑    │          │
│  │ [배경이미지]  │    │ [배경이미지]  │          │
│  │ 진행: 3/5    │    │ 진행: 1/2    │          │
│  │ [-] [+]      │    │ [-] [+]      │          │
│  │ 보상: 12,000 │    │ 보상: 50,000 │          │
│  └──────────────┘    └──────────────┘          │
└─────────────────────────────────────────────────┘
```

**하위 컴포넌트**: `PremiumContentCard.tsx`

**구성 요소**:
- **슈고페스타 카드**: PremiumContentCard
  - 배경 이미지 (게임 이미지, 흐릿하게 처리)
  - 컨텐츠 제목
  - 진행 횟수 / 최대 횟수
  - [-] [+] 버튼
  - 보상 키나
- **어비스회랑 카드**: PremiumContentCard
  - 동일 구조

**명칭**:
- 전체: `PremiumContentSection` 또는 `프리미엄 컨텐츠 섹션`
- 개별 카드: `PremiumContentCard` 또는 `슈고페스타 카드` / `어비스회랑 카드`

---

## 🔹 7. 일반 컨텐츠 수입 (ContentIncomeSection)

**파일 경로**: `frontend/src/app/ledger/components/ContentIncomeSection.tsx`
**표시 조건**: activeSubTab === 'content'

```
┌─────────────────────────────────────────────────┐
│  컨텐츠별 수입                                     │
│  ────────────────────────────────────────       │
│  ┌───────────────────────────────────────┐     │
│  │ 던전 이름         [티어] [2배] 2/3  보상  │     │
│  │ 던전 이름         [티어] [2배] 1/3  보상  │     │
│  └───────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
```

**하위 컴포넌트**: `ContentIncomeRow.tsx`

**구성 요소**:
- **컨텐츠 행 (ContentIncomeRow)**:
  - 컨텐츠 이름
  - 티어 선택 (던전일 경우)
  - 2배 토글 버튼
  - 진행 횟수 [-] [+]
  - 보상 키나

**명칭**:
- 전체: `ContentIncomeSection` 또는 `컨텐츠별 수입 섹션`
- 개별 행: `ContentIncomeRow` 또는 `컨텐츠 행`

---

## 🔹 8. 일일 컨텐츠 섹션 (DailyContentSection)

**파일 경로**: `frontend/src/app/ledger/components/DailyContentSection.tsx`
**표시 조건**: activeSubTab === 'content'

```
┌─────────────────────────────────────────────────┐
│  일일 컨텐츠                                       │
│  ────────────────────────────────────────       │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐       │
│  │[배경] │  │[배경] │  │[배경] │  │[배경] │       │
│  │ 컨텐츠1│  │ 컨텐츠2│  │ 컨텐츠3│  │ 컨텐츠4│       │
│  │  ◐   │  │  ◐   │  │  ◐   │  │  ◐   │       │
│  │ 2/3  │  │ 1/2  │  │ 3/3  │  │ 0/5  │       │
│  │[-][+]│  │[-][+]│  │[-][+]│  │[-][+]│       │
│  │ 보상  │  │ 보상  │  │ 보상  │  │ 보상  │       │
│  └──────┘  └──────┘  └──────┘  └──────┘       │
└─────────────────────────────────────────────────┘
```

**하위 컴포넌트**:
- `DailyContentCard.tsx`
- `CircularProgress.tsx` (원형 진행바)

**구성 요소**:
- **일일 컨텐츠 카드 (DailyContentCard)**:
  - 배경 이미지 (게임 이미지, 흐릿하게 처리)
  - 컨텐츠 이름
  - 원형 진행바 (CircularProgress)
  - [-] [+] 버튼
  - 보상 키나

**명칭**:
- 전체: `DailyContentSection` 또는 `일일 컨텐츠 섹션`
- 개별 카드: `DailyContentCard` 또는 `일일 컨텐츠 카드`
- 원형 진행바: `CircularProgress` 또는 `원형 진행바`

---

## 🔹 9. 주간 수입 그래프 (WeeklyChart)

**파일 경로**: `frontend/src/app/ledger/components/WeeklyChart.tsx`
**표시 조건**: activeSubTab === 'content'

```
┌─────────────────────────────────────────────────┐
│  주간 수입 추이                                    │
│  ────────────────────────────────────────       │
│  키나                                             │
│    │                                             │
│  500k│     ▄▄                                    │
│  400k│    █ █  ▄                                 │
│  300k│   ▄█ █ ██                                 │
│  200k│  ██ █ ███                                 │
│  100k│ ███ █████                                 │
│    0 └─────────────── 날짜                       │
│       월 화 수 목 금 토 일                         │
│                                                   │
│  범례: █ 컨텐츠 █ 아이템                          │
└─────────────────────────────────────────────────┘
```

**구성 요소**:
- **막대 그래프**: 날짜별 컨텐츠/아이템 수입
- **범례**: 컨텐츠(파란색), 아이템(노란색)

**명칭**: `WeeklyChart` 또는 `주간 수입 그래프`

---

## 🔹 10. 아이템 관리 탭 (ItemManagementTab)

**파일 경로**: `frontend/src/app/ledger/components/ItemManagementTab.tsx`
**표시 조건**: activeSubTab === 'item'

```
┌─────────────────────────────────────────────────┐
│  아이템 관리                                       │
│  ────────────────────────────────────────       │
│  [+ 아이템 추가]  [전체▼] [미판매▼]               │
│                                                   │
│  ┌───────────────────────────────────────────┐ │
│  │ 즐겨찾기 아이템                              │ │
│  │ [아이템1] [아이템2] [아이템3]                │ │
│  └───────────────────────────────────────────┘ │
│                                                   │
│  아이템 목록                                       │
│  ┌───────────────────────────────────────────┐ │
│  │ 🟡 전설 아이템       수량: 1  가격: 100,000  │ │
│  │    획득: 2025-01-10   [판매] [삭제] [★]     │ │
│  ├───────────────────────────────────────────┤ │
│  │ 🟣 영웅 아이템       수량: 3  가격: 50,000   │ │
│  │    획득: 2025-01-11   [판매] [삭제] [★]     │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**하위 컴포넌트**:
- `EnhancedItemCard.tsx`
- `FavoriteItemsPanel.tsx`

**구성 요소**:
- **상단 컨트롤**:
  - 아이템 추가 버튼
  - 필터 드롭다운 (등급/카테고리)
  - 판매 상태 필터 (전체/미판매/판매완료)
- **즐겨찾기 패널 (FavoriteItemsPanel)**: 자주 사용하는 아이템
- **아이템 목록**:
  - **아이템 카드 (EnhancedItemCard)**:
    - 아이템 등급 색상
    - 아이템 이름
    - 수량
    - 가격 (단가/총액)
    - 획득일
    - [판매] [삭제] [★즐겨찾기] 버튼

**명칭**:
- 전체: `ItemManagementTab` 또는 `아이템 관리 탭`
- 즐겨찾기 패널: `FavoriteItemsPanel` 또는 `즐겨찾기 패널`
- 개별 카드: `EnhancedItemCard` 또는 `아이템 카드`

---

## 🔹 11. 플로팅 날짜 버튼 (FloatingDateButton)

**파일 경로**: `frontend/src/app/ledger/components/FloatingDateButton.tsx`
**위치**: 화면 우하단 고정

```
                           ┌──────────┐
                           │ 📅 1/13 (월)│
                           └──────────┘
```

**구성 요소**:
- 현재 선택된 날짜 표시
- 클릭 시 날짜 선택 모달 오픈

**명칭**: `FloatingDateButton` 또는 `플로팅 날짜 버튼`

---

## 🔹 12. 모달 (Modals)

### 12.1 캐릭터 추가 모달
**파일 경로**: `frontend/src/app/ledger/components/AddCharacterModal.tsx`
**명칭**: `AddCharacterModal` 또는 `캐릭터 추가 모달`

### 12.2 아이템 추가 모달
**파일 경로**: `frontend/src/app/ledger/components/AddItemModal.tsx`
**명칭**: `AddItemModal` 또는 `아이템 추가 모달`

### 12.3 날짜 선택 모달
**파일 경로**: `frontend/src/app/ledger/components/DateSelectorModal.tsx`
**명칭**: `DateSelectorModal` 또는 `날짜 선택 모달`

### 12.4 닉네임 설정 모달
**파일 경로**: `frontend/src/components/NicknameModal.tsx`
**명칭**: `NicknameModal` 또는 `닉네임 설정 모달`

### 12.5 대표 캐릭터 설정 모달
**파일 경로**: `frontend/src/components/MainCharacterModal.tsx`
**명칭**: `MainCharacterModal` 또는 `대표 캐릭터 설정 모달`

---

## 📝 주요 상태 (State) 명칭

| 상태 변수 | 설명 |
|---------|------|
| `activeTab` | 현재 선택된 캐릭터 탭 ('dashboard' 또는 캐릭터 ID) |
| `activeSubTab` | 현재 선택된 서브탭 ('content' 또는 'item') |
| `selectedDate` | 선택된 날짜 (YYYY-MM-DD) |
| `characters` | 등록된 캐릭터 목록 |
| `records` | 컨텐츠 진행 기록 |
| `items` | 아이템 목록 |
| `favorites` | 즐겨찾기 아이템 목록 |

---

## 🎨 CSS 모듈 명칭

| 컴포넌트 | CSS 파일 |
|---------|---------|
| LedgerTabs | `LedgerTabs.module.css` |
| DashboardSummary | `DashboardSummary.tsx` 내부 스타일 |
| CompactKinaOverview | `CompactKinaOverview.module.css` |
| LedgerSubTabs | `LedgerSubTabs.module.css` |
| PremiumContentSection | `PremiumContentSection.module.css` |
| PremiumContentCard | `PremiumContentCard.module.css` |
| ContentIncomeSection | `ContentIncomeSection.tsx` 내부 스타일 |
| DailyContentSection | `DailyContentSection.module.css` |
| DailyContentCard | `DailyContentCard.module.css` |
| ItemManagementTab | `ItemManagementTab.module.css` |
| EnhancedItemCard | `EnhancedItemCard.module.css` |
| FavoriteItemsPanel | `FavoriteItemsPanel.module.css` |
| FloatingDateButton | `FloatingDateButton.module.css` |
| DateSelectorModal | `DateSelectorModal.module.css` |

---

## 📌 용어 정리 (요청 시 사용할 명칭)

### 섹션 레벨
- **헤더** = Header
- **키나 수급 현황 박스** = CompactKinaOverview
- **캐릭터 탭** = LedgerTabs
- **대시보드 요약** = DashboardSummary
- **서브탭** = LedgerSubTabs
- **프리미엄 컨텐츠 섹션** = PremiumContentSection (슈고페스타 & 어비스회랑)
- **컨텐츠별 수입 섹션** = ContentIncomeSection
- **일일 컨텐츠 섹션** = DailyContentSection
- **주간 수입 그래프** = WeeklyChart
- **아이템 관리 탭** = ItemManagementTab
- **플로팅 날짜 버튼** = FloatingDateButton

### 카드/컴포넌트 레벨
- **슈고페스타 카드** = PremiumContentCard (슈고페스타)
- **어비스회랑 카드** = PremiumContentCard (어비스회랑)
- **일일 컨텐츠 카드** = DailyContentCard
- **원형 진행바** = CircularProgress
- **컨텐츠 행** = ContentIncomeRow
- **아이템 카드** = EnhancedItemCard
- **즐겨찾기 패널** = FavoriteItemsPanel

### 세부 요소
- **[-] 버튼** = 감소 버튼 (decrementCompletion)
- **[+] 버튼** = 증가 버튼 (incrementCompletion)
- **[2배] 토글** = 2배 보상 토글 (toggleDouble)
- **[티어] 선택** = 던전 티어 선택 (changeDungeonTier)
- **[판매] 버튼** = 아이템 판매 (sellItem)
- **[삭제] 버튼** = 아이템 삭제 (deleteItem)
- **[★] 버튼** = 즐겨찾기 토글 (toggleFavorite)

---

## 💡 요청 예시

이제 다음과 같은 방식으로 명확하게 요청하실 수 있습니다:

✅ **좋은 예시**:
- "슈고페스타 카드의 배경 이미지를 더 흐릿하게 해줘"
- "일일 컨텐츠 카드의 원형 진행바 크기를 키워줘"
- "컨텐츠별 수입 섹션의 컨텐츠 행 간격을 좁혀줘"
- "아이템 카드의 [판매] 버튼 색상을 변경해줘"
- "키나 수급 현황 박스의 폰트 크기를 줄여줘"

❌ **애매한 예시**:
- "저기 위에 있는 박스를 수정해줘" (어떤 박스인지 불명확)
- "컨텐츠 부분을 바꿔줘" (어떤 컨텐츠 섹션인지 불명확)
- "카드 크기를 변경해줘" (어떤 카드인지 불명확)

---

이 가이드를 참고하셔서 정확한 명칭으로 요청해주시면 훨씬 빠르고 정확하게 작업할 수 있습니다! 🚀
