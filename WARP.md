# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project overview

AION2 캐릭터 검색/랭킹 및 활동 기록(ledger) 웹 서비스입니다.

- **Frontend**: Next.js 14 (App Router), TypeScript, custom CSS/ CSS Modules, dak.gg 스타일 다크 테마
- **Game data backend**: Supabase PostgreSQL + Edge Functions (Deno) under `supabase/`
- **External game API**: 공식 AION2 웹 API (검색/캐릭터 상세/장비/데바니온 등)
- **Optional external backend**: 문서에만 존재하는 Python `ExternalSourceAdapter` 서비스 (별도 `backend/` 리포지토리 기준)

프론트엔드는 AION2 공식 API와 Supabase를 동시에 사용해 데이터를 가져오고, Supabase는 검색/랭킹/ledger용 영속 저장소 역할을 합니다.

---

## Common commands

### Frontend (Next.js app in `frontend/`)

```bash
# Install dependencies
cd frontend
npm install

# Dev server (http://localhost:3000)
npm run dev

# Production build & start
npm run build
npm run start

# Lint (Next.js + TypeScript)
npm run lint

# E2E health check (expects frontend + external backend up)
npm run test:e2e          # runs node tests/e2e-check.js
```

**Notes for E2E checks (`frontend/tests/e2e-check.js`):**

- Uses `FRONTEND_URL` (default `http://localhost:3000`) and `BACKEND_URL` (default `http://localhost:8000`).
- Expects the external backend to expose `GET /health` and `GET /api/rankings`.
- To run a subset of checks, edit the `checks` array in `tests/e2e-check.js` or duplicate the script with your own list.

### Supabase backend (`supabase/`)

Local development with Supabase CLI:

```bash
cd supabase

# Link to an existing Supabase project (once)
supabase link --project-ref <your-project-ref>

# Start local stack (Postgres + auth + storage)
supabase start

# Run Edge Functions locally (hot reload)
supabase functions serve

# Deploy Edge Functions (to the linked project)
supabase functions deploy search-character
supabase functions deploy get-character
supabase functions deploy search-local-character
supabase functions deploy refresh-character
```

The deployed project URL and sample `fetch` calls are documented in `supabase/USAGE.md`. Treat any keys shown there as configuration examples only; prefer environment variables instead of hard‑coding them.

### External Python adapter / Docker (docs only)

Several root docs (`ACTIVATION_SUMMARY.md`, `EXTERNAL_ADAPTER_ACTIVATION.md`, `EXTERNAL_ADAPTER_CHECKLIST.md`, `ENVIRONMENT_VARIABLES.md`) describe a Python `ExternalSourceAdapter` service running behind `BACKEND_URL` (port 8000, `/health`, `/api/characters/search`, `/api/rankings`, etc.) and a Redis instance. That code is **not** in this repo; follow those docs only when editing the documentation or integrating with an already‑running backend.

---

## High‑level architecture

### 1. Frontend Next.js app (`frontend/`)

**Routing & pages (`frontend/src/app/`):**

- `page.tsx` (home) – 메인 검색 UI, 최근 검색, 대표 캐릭터 노출.
- `c/[server]/[name]/page.tsx` – 캐릭터 상세 페이지.
  - Orchestrates live search + DB sync + 상세 뷰.
  - Maps AION2 응답을 장비/스탯/데바니온/칭호/스킬 등 UI-friendly 구조로 변환.
- `analysis/page.tsx` – 파티 스크린샷 OCR 기반 분석 도구.
- `ledger/page.tsx`, `ledger/characters/page.tsx` – 활동 기록(ledger) 메인 및 캐릭터 관리.
- `admin/*` – 관리자용 크롤링/상태 모니터링 페이지.

**Client components & design system:**

- Shared UI library under `frontend/src/components/ui/` (see its `README.md`).
- AION2 전용 도메인 컴포넌트는 `frontend/src/app/components/` 및 하위 폴더에 위치:
  - 캐릭터 상세: `ProfileSection`, `EquipmentGrid`, `StatsSummaryView`, `SkillSection`, `DaevanionCard`, `DetailedViewSection` 등.
  - 랭킹: `RankingCard` + 랭킹 필터/리스트 컴포넌트 (see `ranking_system_design.md`).
  - Ledger: `ledger/` 하위 카드, 차트, 알림(Toast) 컴포넌트.
  - Analysis: `components/analysis/*` (파티 분석/스펙 카드 등).

**Core libraries (`frontend/src/lib/`):**

- `supabaseApi.ts`
  - Wraps **live search + Supabase local search** for characters.
  - Talks to internal Next API (`/api/search/live`) and Supabase REST (`/rest/v1/characters`).
  - Contains `SERVER_NAME_TO_ID`/`SERVER_ID_TO_NAME` mappings and `CharacterSearchResult` model.
  - Currently embeds the Supabase project URL and anon key as constants – when editing, prefer moving these into env vars instead of adding more hard‑coded copies.
- `supabaseClient.ts`
  - `@supabase/supabase-js` client for direct browser calls (e.g. ledger, weekly stats).
  - Also has a fallback URL/key; treat them as defaults and move to env where possible.
- Stats & combat logic:
  - `statsAggregator.ts` – merges base stats + equipment + 데바니온 + 칭호를 통합하고 카테고리(attack/defense/utility)로 분류.
  - `statBonusCalculator.ts`, `realStatSystem.ts`, `combatClassifier.ts` – "실제 게임" 수치와 근접하게 보정하고 빌드 성향 분석.
  - `statsValidator.ts` – 외부 데이터와 비교해 스탯 일치 여부 검증/로그.
- Ledger support:
  - `ledgerUtils.ts` – device 기반 ID, 날짜 포맷, Kina 포맷.
- Infra/helpers:
  - `rateLimit.ts` – Next API 레이트 리밋 유틸.
  - `theme.ts` – 다크 + 옐로 테마 토큰 (UI 컴포넌트에서 사용).

### 2. Next.js API layer (`frontend/src/app/api/`)

This is the BFF between the browser, the official AION2 API, Supabase, and (optionally) the external Python adapter.

Key routes (대표적인 것만):

- `api/search/live/route.ts`
  - POST endpoint used by `supabaseApi.searchCharacter` for **live search**.
  - Wraps AION2 검색 API, normalizes responses to `CharacterSearchResult` shape.
- `api/character/route.ts`
  - GET `?id=<characterId>&server=<serverId>`.
  - Calls AION2 info + equipment APIs, fetches per‑item detail data, computes NOA 전투 점수, aggregates 스탯/데바니온/스킬/타이틀, then:
    - returns a rich JSON payload for the 캐릭터 상세 UI;
    - upserts into Supabase `characters` 테이블 (`combat_power`, `noa_score`, `item_level`, etc.) using service role or anon key.
- `api/character/sync-job/route.ts`
  - POST; lightweight job called from 캐릭터 상세 페이지.
  - Ensures Supabase `characters` row has 정규화된 직업명/레벨/종족을 저장해서 로컬 검색 품질을 높입니다.
- `api/ledger/*`
  - `ledger/user` – device ID 기반 유저 생성/last_seen 업데이트.
  - `ledger/characters` – ledger용 캐릭터 CRUD.
  - `ledger/records` – 일자별 기록(원정/초월/버스/Kina + 아이템 기록) upsert 및 조회.
  - `ledger/stats/summary` – 주간/월간 요약 통계.
  - `ledger/stats/weekly` – 최근 7일 수입 차트 데이터.
- 기타
  - `api/ocr` – 파티 스크린샷 OCR → 파티 인식용 백엔드 (Playwright/Tesseract 기반 디버그 자료가 `.playwright-mcp/`에 존재).
  - `api/chzzk/*`, `api/soop/*`, `api/live-previews` 등 – Twitch/아프리카/치지직류 연동 or live preview endpoints.

이 레이어를 손볼 때는 **Supabase와 공식 AION2 API 호출 구조, rate limit, 캐싱 전략**을 동시에 고려해야 합니다.

### 3. Supabase Edge Functions (`supabase/functions/`)

These are Deno functions deployed to Supabase and are an alternative/companion to the Next API layer.

- `_shared/`
  - `types.ts` – 타입 정의 (`DbCharacter`, `AionCharacterInfoResponse`, etc.) 및 `normalizeRaceName` 헬퍼.
  - `cors.ts` – CORS 설정 (`getCorsHeaders`, `corsHeaders`).
- `search-character` – 공식 검색 API 프록시.
- `search-local-character` – Supabase `characters` 테이블에서 이름 기반 로컬 검색.
- `get-character`
  - 캐시 TTL(기본 5분)을 고려해 캐릭터 상세를 Supabase에서 먼저 조회.
  - 캐시 만료 시 AION2 info/equipment + per‑item detail API를 호출하고, 변환 + DB upsert 후 결과 반환.
- `refresh-character`
  - 항상 AION2에서 최신 데이터를 가져와 Supabase에 upsert (강제 새로고침용).

실제 서비스에서는 Next API와 Supabase Edge Functions가 모두 같은 `characters` 테이블을 갱신/조회하므로, **스키마 및 필드명(`noa_score`, `combat_power`, `item_level` 등)의 일관성**을 유지해야 합니다.

### 4. Ledger subsystem

Ledger는 유저별 AION2 플레이 기록(원정/초월/버스/획득 아이템/수입 등)을 브라우저 로컬 식별자 + Supabase로 관리합니다.

- 클라이언트:
  - `ledger/page.tsx` – 메인 ledger 화면, 날짜 네비게이션, 캐릭터 카드, Today/Prev/Next, 검색, auto‑register 로직 등.
  - `ledger/characters/page.tsx` – ledger 전용 캐릭터 등록/편집/삭제 페이지 (검색 자동완성 포함).
  - `components/ledger/*` – `LedgerCharacterCard`, `WeeklyChart`, `StatsSummary`, `Toast` 등.
  - `hooks/useMainCharacter` + `SearchBar` 의 대표 캐릭터 설정과도 연동되어, 글로벌 대표 캐릭터를 ledger에 자동 등록합니다.
- 서버(API):
  - `api/ledger/user`, `api/ledger/characters`, `api/ledger/records`, `api/ledger/stats/*` (위 참조).
- DB (Supabase migrations):
  - `supabase/migrations/*ledger*.sql` 에 `ledger_users`, `ledger_characters`, `ledger_daily_records`, `ledger_record_items` 등 정의.
  - Primary key로 user/device → characters → daily_records → record_items 계층 구조를 가지며, 대부분의 질의는 `device_id` 헤더에서 출발합니다.

Ledger 기능을 변경할 때는 항상:

1. `ledgerUtils.ts` 의 device ID / 날짜 유틸 정책,
2. API 레이어의 `x-device-id` 헤더 처리,
3. 관련 Supabase 테이블/뷰 스키마

를 함께 확인해야 합니다.

### 5. Party analysis / OCR subsystem

- 메인 페이지: `frontend/src/app/analysis/page.tsx`
  - 전역 paste 핸들러(클립보드 이미지 감지) + 파일 업로드 버튼.
  - `usePartyScanner` 훅을 통해 OCR + 파티 멤버 인식 + 서버 선택 흐름 제어.
  - `PartyAnalysisResult` 컴포넌트로 요약/스캔 상태/수동 업로드/서버 선택 UI 렌더링.
  - `PartySpecView` 및 `PartySpecCard` 를 사용해 각 파티원의 세부 스펙 카드/돌파 합산 표시.
- 백엔드:
  - `/api/ocr` 와 관련 Playwright MCP 스냅샷들이 `.playwright-mcp/`에 있으며, 스크린샷 구조와 툴팁 포맷에 맞춰 OCR/파서가 동작합니다.

이 서브시스템은 **이미지 → 텍스트(OCR) → 캐릭터 검색 → 스펙 집계**로 이어지는 파이프라인이므로, 어느 한 단계의 출력 포맷을 바꿀 때는 전 단계/후 단계 타입도 함께 확인해야 합니다.

---

## Ranking & stats domain

### Ranking pipeline

- `ranking_system_design.md` 가 NOA 전투 점수 / 전투력 / 컨텐츠 랭킹 전반 설계를 정의합니다.
- NOA 전투 점수는:
  - Next API `api/character/route.ts` 에서 `calculateCombatPower` + 스탯 정보를 이용해 계산하고,
  - Supabase `characters.noa_score` 컬럼으로 저장합니다.
- 랭킹 페이지(예: `/ranking`)는 Supabase에서 `noa_score` / `combat_power` / 컨텐츠 지표(`ranking_ap`, `ranking_gp`)로 정렬된 스냅샷을 읽는 구조로 설계되어 있습니다.

랭킹 관련 변경 시에는 반드시:

1. `ranking_system_design.md` 설계를 먼저 확인
2. AION2 API 스탯 필드명과 내부 스키마(`DbCharacter`, `CharacterStats`) 간 매핑 타당성 검토
3. 프론트엔드 정렬/필터/페이지네이션 UX (`RankingFilterBar`, 랭킹 테이블 컴포넌트)

를 함께 고려해야 합니다.

### Stats summary & validation

- 전체 능력치 요약/분해는 다음 세 계층이 협업합니다:
  - `StatsSummaryView` 컴포넌트 (`frontend/src/app/components/StatsSummaryView.tsx`)
  - Stats aggregation 로직 (`statsAggregator.ts`, `getDaevanionStats`, `types/stats.ts`)
  - Real/validation 시스템 (`realStatSystem.ts`, `statBonusCalculator.ts`, `statsValidator.ts`)
- 설계 문서 `STATS_SUMMARY_DESIGN.md` 에 공식 사이트 기준 능력치 목록, 카테고리, UI 와 집계 알고리즘이 상세히 정의되어 있습니다.

능력치 관련 로직을 변경하기 전에 **반드시 `STATS_SUMMARY_DESIGN.md`를 먼저 읽고**, 설계와 코드가 일치하는지 확인하는 것이 좋습니다.

---

## Environment & configuration

### Frontend `.env.local`

(README 및 CLAUDE.md 기준)

```bash
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
# Optional when calling Supabase from Next API:
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
# Optional BFF base URL override for server-side API calls
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

### External adapter env (Python service)

See `ENVIRONMENT_VARIABLES.md`, `EXTERNAL_ADAPTER_ACTIVATION.md`, `EXTERNAL_ADAPTER_CHECKLIST.md`, `ACTIVATION_SUMMARY.md` for the full matrix. 핵심 개념만 요약하면:

- `SOURCE_ADAPTER_TYPE` – `dummy` vs `external` 모드.
- `EXTERNAL_CONNECT_TIMEOUT`, `EXTERNAL_READ_TIMEOUT`, `EXTERNAL_MAX_RETRIES` – 네트워크 안정성 vs 응답 속도 트레이드오프.
- `EXTERNAL_CACHE_ENABLED`, `EXTERNAL_CACHE_TTL` – Redis 캐시 동작.
- `EXTERNAL_RATE_LIMIT_ENABLED`, `EXTERNAL_RATE_LIMIT_WINDOW` – 캐릭터별 레이트리밋.
- `EXTERNAL_SOURCE_URL`, `EXTERNAL_USER_AGENT` – 실제 스크래핑/공식 API 엔드포인트 및 UA.

이 서비스는 별도 Docker Compose 기반 Python 백엔드와 Redis를 전제로 하므로, 이 리포 내부 코드만 수정할 때는 **문서의 기대 API 인터페이스**(예: `/api/characters/search`, `/api/rankings`)가 깨지지 않도록 참고용으로만 사용하면 됩니다.

### Secrets and keys

- Supabase anon key와 project URL이 `supabase/USAGE.md`, `supabaseApi.ts`, `supabaseClient.ts`에 하드코딩된 상태로 포함되어 있습니다.
- 새로운 코드를 작성하거나 리팩터링할 때는:
  - 이미 존재하는 상수를 재복제하지 말 것 (필요하다면 공통 config로 추출).
  - 가능하면 `.env.local` / Supabase 대시보드 환경변수로 옮기고, 코드에서는 `process.env.*`만 참조하도록 유도.
  - 테스트/샘플 코드에서 실제 키를 노출하지 말고, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 같은 플레이스홀더를 사용.

---

## AI‑specific guidelines from existing rules (CLAUDE.md / AGENTS.md)

이 리포지토리는 이미 Claude/기타 에이전트를 위한 가이드를 포함하고 있습니다. Warp에서 작업할 때도 다음 프로젝트 특화 규칙은 가능한 한 존중하는 것이 좋습니다.

### Commands & workflows

From `.claude/claude.md` and `AGENTS.md`:

- 항상 **프로젝트 루트 → `frontend/`로 이동 후 npm 스크립트 실행**:
  - `cd frontend && npm run dev|build|start|lint|test:e2e`.
- Supabase 함수 작업 시에는 `supabase/` 디렉토리에서 Supabase CLI를 사용.

### Language & UX conventions

- UI 텍스트, 사용자에게 보이는 메시지, 에러 문자열은 **한국어**를 기본으로 합니다.
- UI는 **컴팩트한 카드/폰트/버튼**을 지향하여 스크롤을 최소화합니다 (dak.gg 스타일).
- 에러는 Next API에서 JSON으로 명확하게 반환하고, 프론트에서는 사용자 친화적인 한국어 메시지와 함께 필요한 경우 개발용 상세 로그/복사 버튼을 제공합니다.

### Code style (when editing/adding TSX)

Summarized from `AGENTS.md`:

- Import 순서:
  1. React/Next hooks
  2. Next primitives (e.g. `NextRequest`, `NextResponse`, router hooks)
  3. 외부 라이브러리
  4. 로컬 모듈 (절대 경로 `@/` 선호)
- 컴포넌트:
  - `'use client'` 를 맨 위에 둘 것 (클라이언트 컴포넌트일 경우).
  - props 타입은 `interface`/`type`으로 명확히 정의하되 `I` prefix 는 사용하지 않음.
  - 이벤트 핸들러는 컴포넌트 내부에 정의, hooks는 항상 컴포넌트 최상단에서 호출.
- 타입/네이밍:
  - 파일/컴포넌트: PascalCase (`SearchBar.tsx`, `CharacterDetailPage`).
  - 변수/함수: camelCase.
  - 상수: UPPER_SNAKE_CASE.
  - 공용 타입: PascalCase (`CharacterSearchResult`, `ApiResponse<T>`).

### Data flow patterns to preserve

- **Hybrid search** (검색 UX 핵심 패턴):
  - 먼저 Supabase 로컬 검색(`searchLocalCharacter`)으로 빠르게 결과를 보여주고,
  - 동시에 공식 AION2 API 기반 라이브 검색(`searchCharacter`)을 병렬로 실행, 더 신선한 결과를 도착 순서대로 병합.
- **Global search when server is not selected**:
  - `SearchBar` 설계 문서 `frontend/search-improvement-design.md`에 따라, 서버 미선택 + 자동완성 결과가 없을 때는 전체 서버 대상 검색을 시도하고 결과 개수(0,1,다수)에 따라 행동을 분기합니다.
- **DB sync on detail view**:
  - 캐릭터 상세 뷰에 들어가면 항상 Supabase `characters` 테이블을 최신 데이터로 upsert하여 랭킹/검색 품질을 유지합니다 (`api/character` + `api/character/sync-job`).
- **Device‑scoped ledger**:
  - Ledger 관련 모든 API는 `x-device-id` 헤더에 의존하므로, 클라이언트/서버 코드에서 이 값을 제거하거나 재정의하지 않도록 주의합니다.

---

## When making non‑trivial changes

- 캐릭터 상세/능력치/랭킹 관련 변경 전:
  - `STATS_SUMMARY_DESIGN.md`, `ranking_system_design.md`, `AION2_TOOL_HANDOFF.md`를 먼저 읽고 도메인 규칙을 파악하세요.
- 외부 데이터 소스/스크래핑/레이트리밋 관련 변경 전:
  - `ENVIRONMENT_VARIABLES.md`, `EXTERNAL_ADAPTER_*`, `ACTIVATION_SUMMARY.md` 에 정의된 어댑터 동작과 운영 가이드를 참고하세요.
- UI 디자인/컴포넌트 라이브러리 변경 전:
  - `frontend/src/components/ui/README.md` 와 `.agent/workflows/color-guidelines.md`를 참고해 기존 dak.gg 스타일과 테마 토큰을 유지하세요.

이 WARP.md는 큰 흐름과 핵심 제약만 요약합니다. 세부 구현을 변경할 때는 반드시 관련 설계 문서와 코드(특히 `supabaseApi`, Next API 라우트, Supabase 함수, migrations)를 함께 검토하는 것을 전제로 합니다.