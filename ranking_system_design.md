# 아이온2 랭킹 시스템 설계도 (AION2 Ranking System Blueprint)

## 1. 개요 (Overview)
본 문서는 아이온2 랭킹 시스템의 설계를 다룹니다. 사용자의 다양한 지표를 바탕으로 경쟁력 있는 순위를 제공하는 것을 목표로 합니다.
랭킹은 크게 다음 세 가지 카테고리로 나뉩니다:
1.  **노아 전투 점수 랭킹 (NOA Combat Score)**: 자체 산정 공식에 의한 종합 전투력 점수
2.  **전투력 랭킹 (Combat Power)**: 게임 내 표기되는 전투력 기반
3.  **컨텐츠 랭킹 (Content Ranking)**: 어비스 포인트, 투기장 등 게임 내 활동 점수 기반

모든 랭킹은 **종족(천/마)**, **서버**, **직업** 필터링 및 **캐릭터명 검색**을 지원해야 합니다.

---

## 2. 페이지 구조 및 네비게이션 (Page Structure)

### URL 구조
-   `/ranking` (메인 - 기본값인 노아 랭킹으로 리다이렉트)
-   `/ranking/noa` (노아 전투 점수)
-   `/ranking/cp` (전투력)
-   `/ranking/content` (컨텐츠 랭킹)

### 레이아웃 구성
-   **상단 탭 메뉴**: [노아 전투 점수] | [전투력] | [컨텐츠]
-   **필터 바 (Filter Bar)**: 상단 탭 바로 아래 위치
    -   **서버 선택**: 드롭다운 (전체 / 지켈 / 이스라펠 등)
    -   **종족 선택**: 토글 버튼 ([전체] | [천족] | [마족])
    -   **직업 선택**: 드롭다운 또는 아이콘 그리드 (검성, 수호성, 살성 등)
    -   **검색창**: "캐릭터명 검색..." (엔터 입력 시 실행)
-   **랭킹 테이블 (Ranking Table)**: 메인 컨텐츠 영역
    -   컬럼 구성: 순위 | 등락폭(▲/▼) | 캐릭터 정보(이름/서버/직업) | 점수/수치 | 레기온 | 갱신 시간

---

## 3. 데이터 아키텍처 (Data Architecture)

### A. 데이터 소스 (Data Sources)
1.  **공식 API**: 원본 데이터(전투력, 어비스 포인트 등) 제공.
2.  **Supabase DB**: 랭킹 집계 및 리더보드 엔진 역할.
    -   **전략**: 공식 API는 "전 서버 통합 랭킹"이나 "커스텀 정렬"을 직접 지원하지 않을 가능성이 높으므로, 검색된 캐릭터 데이터를 Supabase `characters` 테이블에 누적(Sync)하고, DB 쿼리로 랭킹을 산출합니다.

### B. 지표 정의 (Metric Definitions)

#### 1. 노아 전투 점수 (NOA Combat Score) - 자체 기준
*   **개념**: 단순 전투력이 아닌, 실제 성능에 기여하는 스탯(공격력, 명중, 치명타 등)을 가중 합산하여 산출한 "진짜 강함"의 척도.
*   **산출 공식 (예시)**:
    ```javascript
    노아 점수 = (공격력 * 1.5) + (마법증폭 * 1.2) + (치명타 * 0.8) + (명중 * 0.5) + ...
    ```
    *   *참고: 직업별 구체적인 가중치는 구현 단계에서 상세 조정 예정.*
*   **구현 방식**:
    -   캐릭터 조회(`route.ts`) 시점에 점수를 자동 계산.
    -   `characters` 테이블의 `noa_score` 컬럼에 저장 및 업데이트.

#### 2. 전투력 (Combat Power)
*   **출처**: 게임 내 `character.stats.combat_power` 값 사용 (없을 경우 아이템 레벨 활용).
*   **저장**: `DbCharacter` 테이블의 기존 `combat_power` 컬럼 사용.

#### 3. 컨텐츠 랭킹 (Content Ranking)
*   **지표**: 어비스 포인트(AP), 명예 포인트(GP), 투기장 평점 등.
*   **저장**: `rankings` JSONB 컬럼 또는 별도 정수형 컬럼(`ranking_ap`, `ranking_gp`)에 저장하여 정렬 최적화.

---

## 4. 데이터베이스 스키마 업데이트 (DB Updates)

랭킹 조회 성능을 위해 `characters` 테이블을 최적화해야 합니다.

```sql
-- 컬럼 추가
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS noa_score INTEGER DEFAULT 0,    -- 노아 점수
ADD COLUMN IF NOT EXISTS ranking_ap INTEGER DEFAULT 0,   -- 어비스 포인트
ADD COLUMN IF NOT EXISTS ranking_gp INTEGER DEFAULT 0;   -- 명예 포인트

-- 인덱스 추가 (빠른 정렬 조회용)
CREATE INDEX idx_characters_noa_score ON characters (noa_score DESC);
CREATE INDEX idx_characters_combat_power ON characters (combat_power DESC);
-- 필터링용 복합 인덱스
CREATE INDEX idx_characters_filters ON characters (server_id, race_name, class_name);
```

---

## 5. UI/UX 명세 (Specifications)

### 컴포넌트: `RankingFilterBar`
-   **상태 관리**: `server`, `race`, `job`, `searchQuery` 상태를 URL 파라미터와 동기화.
-   **동작**: 변경 시 즉시 URL을 업데이트하여(`pushRouter`) 랭킹 리스트 새로고침.

### 컴포넌트: `RankingTable`
-   **Props**: `data: RankingItem[]`, `loading: boolean`
-   **기능**:
    -   **무한 스크롤** 또는 **페이지네이션**: 1위~100위 등 순차 로딩.
    -   **행 클릭**: 해당 캐릭터의 상세 페이지(`/c/[server]/[name]`)로 이동.
    -   **메달 표시**: 1, 2, 3위에게는 금/은/동 메달 아이콘/이팩트 적용.

---

## 6. 구현 단계 (Implementation Stages)

### 1단계: DB 및 백엔드
1.  Supabase 스키마 업데이트 (`noa_score` 등 컬럼 및 인덱스 추가).
2.  캐릭터 조회 로직(`route.ts` 등)에 **노아 점수 계산 로직** 추가 및 저장 기능 구현.

### 2단계: 프론트엔드 - 기본 구조
1.  `/ranking` 폴더 및 페이지 라우팅 생성.
2.  공통 레이아웃 `RankingLayout` 및 `RankingFilterBar` 구현.

### 3단계: 프론트엔드 - 페이지 구현
1.  **노아 랭킹 페이지**: Supabase에서 `noa_score` 순으로 데이터 호출 및 표시.
2.  **전투력 랭킹 페이지**: `combat_power` 순 호출.
3.  **컨텐츠 랭킹 페이지**: 어비스 포인트 등 호출.

### 4단계: 디자인 및 폴리싱
1.  다크/골드 테마 적용 및 반응형 디자인(모바일 최적화).
2.  순위 변동 애니메이션 및 로딩 스켈레톤 적용.
