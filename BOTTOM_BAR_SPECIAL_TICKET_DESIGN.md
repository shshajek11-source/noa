# 하단 수입 바 + 스페셜 이용권 설계도

## 📐 레이아웃 구조

### 하단 네비게이션 바 (3분할)
```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  일일 수입          │    주간 수입      │   스페셜 이용권 적용  [⚙️]   │
│  1,234,567 키나     │  5,678,901 키나   │   12개 적용됨                │
│                     │                   │                               │
│      (30%)          │      (30%)        │         (40%)                 │
└────────────────────────────────────────────────────────────────────────┘
```

## 🎨 디자인 스펙

### 1. 레이아웃 비율
- **일일 수입**: 30% (왼쪽)
- **주간 수입**: 30% (중앙)
- **스페셜 이용권 적용**: 40% (오른쪽)

### 2. 구분선
- 각 섹션 사이에 세로 구분선 (1px)
- 색상: rgba(250, 204, 21, 0.2)

### 3. 스페셀 이용권 영역
- **레이블**: "스페셜 이용권 적용"
- **값**: "12개 적용됨" (적용된 총 개수)
- **버튼**: 톱니바퀴(⚙️) 아이콘 또는 "설정" 버튼
- **위치**: 레이블 오른쪽에 작은 버튼

## 🎯 스페셜 이용권 모달

### 모달 구조
```
┌─────────────────────────────────────────────────┐
│  스페셜 이용권 적용              [X]             │
├─────────────────────────────────────────────────┤
│                                                   │
│  초월                    [-]  0  [+]             │
│  원정                    [-]  0  [+]             │
│  일일던전                [-]  0  [+]             │
│  각성전                  [-]  0  [+]             │
│  토벌전                  [-]  0  [+]             │
│  악몽                    [-]  0  [+]             │
│  차원침공                [-]  0  [+]             │
│  성역                    [-]  0  [+]             │
│                                                   │
│  ─────────────────────────────────────────────   │
│  총 적용 개수: 0개                               │
│                                                   │
├─────────────────────────────────────────────────┤
│                        [적용]                    │
└─────────────────────────────────────────────────┘
```

### 모달 스펙

#### 크기
- **너비**: 400px
- **높이**: auto (컨텐츠에 맞춰 조절)
- **최대 높이**: 600px (스크롤 가능)

#### 컨텐츠 아이템
각 컨텐츠마다:
- **컨텐츠 이름**: 왼쪽 정렬 (14px, #E5E7EB)
- **카운터**:
  - [-] 버튼: 24x24px, 회색 배경
  - 숫자: 32px width, 중앙 정렬
  - [+] 버튼: 24x24px, 노란색 배경
- **최소값**: 0
- **최대값**: 99 (제한 없을 수도 있음)

#### 하단 요약
- **총 적용 개수**: 실시간 업데이트
- 구분선으로 본문과 분리

#### 적용 버튼
- **크기**: 전체 너비, 높이 48px
- **색상**: #FACC15 (노란색)
- **텍스트**: "적용" (검정색, 16px, 굵게)

## 🔧 CSS 코드

### 하단 바 레이아웃
```css
.bottomIncomeBar {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);

  width: 100%;
  max-width: 1200px;
  height: 70px;
  padding: 0 16px;

  background: #0B0D12;
  border-top: 2px solid rgba(250, 204, 21, 0.2);
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;

  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.3);

  display: grid;
  grid-template-columns: 30% 1px 30% 1px 40%;
  align-items: center;
  gap: 16px;

  z-index: 100;
}

.incomeSection {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.sectionLabel {
  font-size: 12px;
  font-weight: 500;
  color: #9CA3AF;
  letter-spacing: 0.5px;
}

.sectionValue {
  font-size: 24px;
  font-weight: 700;
  color: #FACC15;
  font-family: 'Rajdhani', sans-serif;
}

.divider {
  width: 1px;
  height: 40px;
  background: linear-gradient(
    to bottom,
    transparent,
    rgba(250, 204, 21, 0.3),
    transparent
  );
}

/* 스페셜 이용권 섹션 */
.specialTicketSection {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  position: relative;
}

.specialTicketHeader {
  display: flex;
  align-items: center;
  gap: 8px;
}

.specialTicketLabel {
  font-size: 12px;
  font-weight: 500;
  color: #9CA3AF;
  letter-spacing: 0.5px;
}

.settingsButton {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background: rgba(250, 204, 21, 0.1);
  border: 1px solid rgba(250, 204, 21, 0.3);
  color: #FACC15;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.settingsButton:hover {
  background: rgba(250, 204, 21, 0.2);
  border-color: rgba(250, 204, 21, 0.5);
}

.specialTicketCount {
  font-size: 16px;
  font-weight: 600;
  color: #FACC15;
  font-family: 'Rajdhani', sans-serif;
}
```

### 모달 스타일
```css
.modalOverlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.specialTicketModal {
  background: #1b1b1e;
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modalHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modalTitle {
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
}

.closeButton {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: #a5a8b4;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.closeButton:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.1);
}

.modalBody {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.contentRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.contentRow:last-child {
  border-bottom: none;
}

.contentName {
  font-size: 14px;
  font-weight: 500;
  color: #E5E7EB;
}

.counterGroup {
  display: flex;
  align-items: center;
  gap: 8px;
}

.counterButton {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: #212227;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #E5E7EB;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.counterButton:hover {
  border-color: #FACC15;
  color: #FACC15;
}

.counterButton:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.counterButton.increment {
  background: rgba(250, 204, 21, 0.1);
  border-color: rgba(250, 204, 21, 0.3);
  color: #FACC15;
}

.counterButton.increment:hover {
  background: rgba(250, 204, 21, 0.2);
}

.counterValue {
  width: 48px;
  height: 32px;
  background: #161618;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: #FACC15;
  font-family: 'Rajdhani', sans-serif;
}

.counterValue:focus {
  outline: none;
  border-color: #FACC15;
}

.totalSummary {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
  font-size: 14px;
  color: #9CA3AF;
}

.totalCount {
  font-weight: 700;
  color: #FACC15;
  font-size: 18px;
}

.modalFooter {
  padding: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.applyButton {
  width: 100%;
  height: 48px;
  border-radius: 8px;
  background: #FACC15;
  border: none;
  color: #0B0D12;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s;
}

.applyButton:hover {
  opacity: 0.9;
}

.applyButton:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

## 📱 반응형 디자인

```css
@media (max-width: 768px) {
  .bottomIncomeBar {
    height: 90px;
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto;
    padding: 12px 16px;
    gap: 8px;
  }

  .divider {
    display: none;
  }

  .sectionValue {
    font-size: 20px;
  }

  .specialTicketCount {
    font-size: 14px;
  }
}
```

## 🔄 적용 로직 (컨텐츠 카드 표시)

### 잔여 횟수 표시 예시

#### 스페셜 이용권 적용 전
```
┌─────────────────────────┐
│   초월                   │
│   잔여 횟수: 3/5        │
└─────────────────────────┘
```

#### 스페셜 이용권 적용 후 (2개 적용)
```
┌─────────────────────────┐
│   초월                   │
│   잔여 횟수: 3/5 (+2)   │
└─────────────────────────┘
```

### 표시 스타일
```css
.progressText {
  font-size: 24px;
  font-weight: 700;
  color: var(--card-color);
  font-family: 'Rajdhani', sans-serif;
  text-shadow: 0 0 12px var(--card-color-glow), 0 2px 4px rgba(0, 0, 0, 0.8);
  line-height: 1;
}

.bonusCount {
  font-size: 18px;
  font-weight: 700;
  color: #10B981; /* 초록색 강조 */
  margin-left: 4px;
  text-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
}
```

## 💾 데이터 구조

### 스페셜 이용권 설정
```typescript
interface SpecialTicketConfig {
  초월: number
  원정: number
  일일던전: number
  각성전: number
  토벌전: number
  악몽: number
  차원침공: number
  성역: number
}

// 예시
const specialTickets: SpecialTicketConfig = {
  초월: 2,
  원정: 1,
  일일던전: 3,
  각성전: 0,
  토벌전: 1,
  악몽: 0,
  차원침공: 2,
  성역: 3
}

// 총 개수 계산
const totalTickets = Object.values(specialTickets).reduce((sum, val) => sum + val, 0)
// 결과: 12
```

### 컨텐츠 표시 로직
```typescript
// 컨텐츠 카드에서 잔여 횟수 표시
function getProgressText(content: DailyContent, specialTickets: SpecialTicketConfig): string {
  const baseProgress = `${content.completionCount}/${content.maxCount}`
  const bonus = specialTickets[content.name] || 0

  if (bonus > 0) {
    return `${baseProgress} (+${bonus})`
  }

  return baseProgress
}
```

## 🎬 사용자 플로우

1. **초기 상태**
   - 하단 바에 "스페셜 이용권 적용: 0개 적용됨" 표시

2. **설정 버튼 클릭**
   - 모달창 열림
   - 현재 저장된 값 표시 (없으면 0)

3. **개수 조절**
   - +/- 버튼으로 조절
   - 또는 직접 숫자 입력
   - 총 개수 실시간 업데이트

4. **적용 버튼 클릭**
   - 설정 저장
   - 모달 닫힘
   - 하단 바 총 개수 업데이트
   - 각 컨텐츠 카드에 보너스 횟수 표시

5. **컨텐츠 카드 확인**
   - 잔여 횟수 옆에 (+숫자) 표시
   - 초록색으로 강조

## 📦 파일 구조

### 생성 파일
1. `frontend/src/app/ledger/components/BottomIncomeBar.tsx`
2. `frontend/src/app/ledger/components/BottomIncomeBar.module.css`
3. `frontend/src/app/ledger/components/SpecialTicketModal.tsx`
4. `frontend/src/app/ledger/components/SpecialTicketModal.module.css`
5. `frontend/src/app/ledger/hooks/useSpecialTickets.ts`

### API 엔드포인트
- `GET /api/ledger/special-tickets?characterId=xxx` - 설정 조회
- `POST /api/ledger/special-tickets` - 설정 저장
  ```json
  {
    "characterId": "xxx",
    "tickets": {
      "초월": 2,
      "원정": 1,
      ...
    }
  }
  ```

## ⚠️ 주의사항

1. **저장 위치**: 캐릭터별로 저장 (characterId)
2. **유효성 검사**: 0 이상의 정수만 허용
3. **최대값**: 필요시 최대 99개로 제한
4. **실시간 반영**: 적용 즉시 모든 컨텐츠 카드 업데이트
5. **초기화**: 캐릭터 삭제 시 설정도 함께 삭제
