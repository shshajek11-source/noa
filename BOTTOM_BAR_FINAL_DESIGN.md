# 하단 수입 바 최종 설계도

## 📐 레이아웃 구조

### 하단 네비게이션 바
```
┌────────────────────────────────────────────────────────────────────────┐
│ [📅]  일일 수입          │    주간 수입      │   스페셜 이용권 [⚙️]  │
│       1,234,567 키나     │  5,678,901 키나   │       12              │
│         (30%)            │      (30%)        │      (40%)            │
└────────────────────────────────────────────────────────────────────────┘
```

## 🎨 주요 변경사항

### 1. 툴팁 스타일 모달 (팝업 대신)
- 설정 버튼(⚙️) 클릭 시 버튼 아래에서 툴팁처럼 나타남
- 화면 중앙이 아닌 버튼 근처에 위치
- 작은 삼각형 화살표로 연결

### 2. 숫자 카운트업 애니메이션
- 수입이 변경될 때 0부터 목표 숫자까지 슈르륵 올라감
- 속도: 1초 동안 카운트업
- easing: ease-out (점점 느려짐)

### 3. 스페셜 이용권 텍스트 제거
- "0개 적용됨" → "0"
- "12개 적용됨" → "12"
- 숫자만 깔끔하게 표시

### 4. 입력 필드 너비 증가
- 기존: 48px → 변경: 64px
- 더 넓고 편안한 입력

### 5. 캘린더 버튼 추가
- 왼쪽 상단에 📅 아이콘 버튼
- 클릭 시 날짜 선택 가능
- 선택된 날짜의 가계부 표시

## 📏 세부 스펙

### 툴팁 모달 구조
```
                    [⚙️] ← 설정 버튼
                     ▼
        ┌──────────────────────────┐
        │ 스페셜 이용권 적용    [X]│
        ├──────────────────────────┤
        │ 초월        [-] 0  [+]   │
        │ 원정        [-] 0  [+]   │
        │ 일일던전    [-] 0  [+]   │
        │ 각성전      [-] 0  [+]   │
        │ 토벌전      [-] 0  [+]   │
        │ 악몽        [-] 0  [+]   │
        │ 차원침공    [-] 0  [+]   │
        │ 성역        [-] 0  [+]   │
        ├──────────────────────────┤
        │ 총: 0개                  │
        ├──────────────────────────┤
        │         [적용]           │
        └──────────────────────────┘
```

## 🎯 CSS 코드

### 툴팁 모달 위치
```css
.tooltipModal {
  position: absolute;
  bottom: calc(100% + 12px); /* 버튼 위에 배치 */
  right: 0; /* 오른쪽 정렬 */

  background: #1b1b1e;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(250, 204, 21, 0.3);

  width: 280px;
  max-height: 500px;
  overflow: hidden;

  opacity: 0;
  pointer-events: none;
  transform: translateY(10px);
  transition: all 0.2s ease-out;

  z-index: 200;
}

.tooltipModal.active {
  opacity: 1;
  pointer-events: all;
  transform: translateY(0);
}

/* 화살표 */
.tooltipModal::after {
  content: '';
  position: absolute;
  bottom: -8px;
  right: 16px;

  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid #1b1b1e;
}
```

### 숫자 카운트업 애니메이션
```javascript
function animateValue(element, start, end, duration) {
  const range = end - start;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // easeOut 함수
    const easeOut = 1 - Math.pow(1 - progress, 3);

    const current = Math.floor(start + range * easeOut);
    element.textContent = current.toLocaleString();

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = end.toLocaleString();
    }
  }

  requestAnimationFrame(update);
}

// 사용 예시
animateValue(dailyIncomeElement, 0, 1234567, 1000); // 1초 동안
```

### 입력 필드 (너비 증가)
```css
.counterValue {
  width: 64px; /* 48px → 64px */
  height: 32px;
  background: #161618;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  text-align: center;
  font-size: 16px; /* 14px → 16px */
  font-weight: 600;
  color: #FACC15;
  font-family: 'Rajdhani', sans-serif;
}
```

### 스페셜 이용권 숫자만 표시
```css
.specialTicketCount {
  font-size: 28px; /* 크게 */
  font-weight: 700;
  color: #FACC15;
  font-family: 'Rajdhani', sans-serif;
}
```

### 캘린더 버튼
```css
.calendarButton {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);

  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: rgba(250, 204, 21, 0.1);
  border: 1px solid rgba(250, 204, 21, 0.3);
  color: #FACC15;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.calendarButton:hover {
  background: rgba(250, 204, 21, 0.2);
  border-color: rgba(250, 204, 21, 0.5);
}
```

### 캘린더 팝업
```css
.calendarPopup {
  position: absolute;
  left: 16px;
  bottom: calc(100% + 12px);

  background: #1b1b1e;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(250, 204, 21, 0.3);
  padding: 16px;

  opacity: 0;
  pointer-events: none;
  transform: translateY(10px);
  transition: all 0.2s ease-out;

  z-index: 200;
}

.calendarPopup.active {
  opacity: 1;
  pointer-events: all;
  transform: translateY(0);
}
```

## 📅 캘린더 구조

### 간단한 날짜 선택기
```
┌─────────────────────────┐
│  2024년 1월         < > │
├─────────────────────────┤
│ 일 월 화 수 목 금 토    │
├─────────────────────────┤
│     1  2  3  4  5  6    │
│  7  8  9 10 11 12 13    │
│ 14 [15]16 17 18 19 20   │ ← 15일 선택됨
│ 21 22 23 24 25 26 27    │
│ 28 29 30 31             │
├─────────────────────────┤
│       [오늘로 이동]      │
└─────────────────────────┘
```

### 캘린더 HTML 구조
```html
<div class="calendarPopup">
  <div class="calendarHeader">
    <button class="monthBtn" onclick="prevMonth()">‹</button>
    <div class="currentMonth">2024년 1월</div>
    <button class="monthBtn" onclick="nextMonth()">›</button>
  </div>

  <div class="calendarWeekdays">
    <div>일</div>
    <div>월</div>
    <div>화</div>
    <div>수</div>
    <div>목</div>
    <div>금</div>
    <div>토</div>
  </div>

  <div class="calendarDays" id="calendarDays">
    <!-- 날짜 버튼들 동적 생성 -->
  </div>

  <div class="calendarFooter">
    <button class="todayBtn" onclick="goToToday()">오늘로 이동</button>
  </div>
</div>
```

### 캘린더 CSS
```css
.calendarHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.currentMonth {
  font-size: 14px;
  font-weight: 600;
  color: #FACC15;
}

.monthBtn {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #E5E7EB;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.monthBtn:hover {
  border-color: #FACC15;
  color: #FACC15;
}

.calendarWeekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 8px;
  text-align: center;
  font-size: 11px;
  color: #9CA3AF;
}

.calendarDays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 12px;
}

.dayBtn {
  aspect-ratio: 1;
  border-radius: 6px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #E5E7EB;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.dayBtn:hover {
  background: rgba(250, 204, 21, 0.1);
  border-color: rgba(250, 204, 21, 0.3);
}

.dayBtn.selected {
  background: rgba(250, 204, 21, 0.2);
  border-color: #FACC15;
  color: #FACC15;
  font-weight: 700;
}

.dayBtn.today {
  border-color: rgba(250, 204, 21, 0.5);
}

.dayBtn.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.todayBtn {
  width: 100%;
  padding: 8px;
  border-radius: 6px;
  background: rgba(250, 204, 21, 0.1);
  border: 1px solid rgba(250, 204, 21, 0.3);
  color: #FACC15;
  font-size: 12px;
  cursor: pointer;
}

.todayBtn:hover {
  background: rgba(250, 204, 21, 0.2);
}
```

## 🎬 사용자 플로우

### 캘린더 사용
1. 📅 버튼 클릭
2. 캘린더 팝업 표시
3. 날짜 선택
4. 해당 날짜의 가계부 로드
5. 수입 숫자가 슈르륵 카운트업

### 스페셜 이용권 설정
1. ⚙️ 버튼 클릭
2. 툴팁 모달이 버튼 위에 나타남
3. 개수 조절 (넓어진 입력 필드)
4. 적용 버튼 클릭
5. 숫자만 표시 (예: "12")

## 📦 컴포넌트 구조

```
BottomIncomeBar/
├── CalendarButton (📅)
│   └── CalendarPopup
│       ├── MonthSelector
│       ├── DayGrid
│       └── TodayButton
│
├── IncomeSection (일일)
│   ├── Label
│   └── Value (카운트업 애니메이션)
│
├── IncomeSection (주간)
│   ├── Label
│   └── Value (카운트업 애니메이션)
│
└── SpecialTicketSection
    ├── Label
    ├── SettingsButton (⚙️)
    ├── Count (숫자만)
    └── TooltipModal
        ├── ContentRows (8개)
        ├── TotalSummary
        └── ApplyButton
```

## 🔄 카운트업 애니메이션 상세

### 애니메이션 트리거
- 페이지 로드 시
- 날짜 변경 시
- 컨텐츠 완료 시
- 아이템 판매 시

### 성능 최적화
```javascript
// requestAnimationFrame 사용
function animateValue(element, start, end, duration) {
  let startTime = null;

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);

    // easeOutCubic
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const value = Math.floor(start + (end - start) * easeOut);

    element.textContent = value.toLocaleString();

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}
```

## 📱 반응형 디자인

```css
@media (max-width: 768px) {
  .bottomIncomeBar {
    height: auto;
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto;
    padding: 12px 16px 12px 56px; /* 왼쪽 여백 (캘린더 버튼) */
  }

  .calendarButton {
    left: 12px;
  }

  .tooltipModal {
    right: auto;
    left: 50%;
    transform: translateX(-50%) translateY(10px);
  }

  .tooltipModal.active {
    transform: translateX(-50%) translateY(0);
  }

  .calendarPopup {
    left: 50%;
    transform: translateX(-50%) translateY(10px);
  }

  .calendarPopup.active {
    transform: translateX(-50%) translateY(0);
  }
}
```

## ✨ 최종 변경사항 요약

1. ✅ **입력 필드 너비**: 48px → 64px
2. ✅ **툴팁 모달**: 중앙 팝업 → 버튼 근처 툴팁
3. ✅ **숫자 애니메이션**: 슈르륵 카운트업 효과 (1초)
4. ✅ **텍스트 제거**: "0개 적용됨" → "0"
5. ✅ **캘린더 버튼**: 왼쪽에 📅 버튼 추가
6. ✅ **날짜 선택**: 간단한 캘린더 팝업
