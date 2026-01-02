---
description: 프로젝트 컬러 사용 규칙 및 가이드라인
---

# 컬러 사용 규칙 – 용도 기준

## 1. 배경 컬러 (Background)
- `#0B0D12`, `#111318`
- 전체 화면 및 섹션의 기본 배경으로만 사용한다.
- 모든 페이지의 시각적 기반은 반드시 다크 컬러여야 한다.

## 2. 기본 텍스트 컬러 (Primary Text)
- `#E5E7EB`
- 제목, 주요 수치, 핵심 정보 텍스트에 사용한다.
- 가장 높은 가독성이 필요한 영역에만 적용한다.

## 3. 보조 텍스트 컬러 (Sub Text)
- `#9CA3AF`
- 설명 문구, 부가 정보, 메타 데이터에 사용한다.
- 기본 텍스트보다 시각적 우선순위가 낮아야 한다.

## 4. 강조 컬러 – 옐로우 (Accent Yellow)
- `#FACC15`, `#FBBF24`
- 아래 용도로만 제한적으로 사용한다:
  - Hover 상태
  - Active 상태
  - 선택된 메뉴/탭
  - 상위 데이터(랭킹 상위, 최고 수치, 핵심 지표)
- 일반 텍스트, 넓은 배경, 기본 UI 요소에는 사용하지 않는다.

## 5. 경계선 컬러 (Border)
- `#1F2433`
- 카드, 테이블, 섹션 구분선에만 사용한다.
- 시각적 구분 목적이며 강조 용도로 사용하지 않는다.

## 6. 금지 규칙
- 옐로우를 배경 전체 또는 큰 면적에 사용 금지
- 의미 없는 장식용 컬러 사용 금지
- 상태/의미 없이 색상만으로 주목도를 높이는 표현 금지

---

## CSS 변수 참조

```css
:root {
  --bg-primary: #0B0D12;
  --bg-secondary: #111318;
  --text-primary: #E5E7EB;
  --text-secondary: #9CA3AF;
  --accent-yellow: #FACC15;
  --accent-yellow-hover: #FBBF24;
  --border-color: #1F2433;
}
```

## 적용 예시

### 카드 컴포넌트
```css
.card {
  background: #111318;
  border: 1px solid #1F2433;
  color: #E5E7EB;
}

.card-subtitle {
  color: #9CA3AF;
}

.card:hover {
  border-color: #FACC15;
}
```

### 강조 데이터
```css
.highlight-value {
  color: #FACC15; /* 상위 랭킹, 최고 수치 등에만 사용 */
}
```
