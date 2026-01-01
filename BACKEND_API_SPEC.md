# AION2 검색 기반 데이터 누적 MVP - Backend API 명세서

## 개요

이 문서는 AION2 캐릭터 검색 및 랭킹 시스템의 백엔드 API 명세서입니다.

**핵심 원칙:**
- ✅ 랭킹/투력은 우리 DB 기준 (검색되지 않은 캐릭터는 랭킹에 없음)
- ✅ 수집 실패 시 서비스 중단 금지 (이전 데이터 유지)
- ✅ 동일 캐릭터 재검색 쿨타임 적용 (60초 권장)
- ✅ "투력"은 공식 전투력 복제 금지 (배치에서 별도 산정)

---

## 인증

현재 인증 없음 (MVP)

---

## API 엔드포인트

### 1. POST /api/search

캐릭터 검색 및 데이터 수집

**요청:**
```json
{
  "server": "Siel",
  "name": "캐릭터명"
}
```

**응답 (성공 - 200):**
```json
{
  "id": 1,
  "name": "캐릭터명",
  "server": "Siel",
  "class": "Warrior",
  "level": 60,
  "power": 450000,
  "power_score": null,
  "power_rank": null,
  "percentile": null,
  "last_fetched_at": "2025-12-31T20:00:00Z",
  "last_scored_at": null,
  "stats_payload": {
    "attack": 1200,
    "damage_amp": 250,
    "crit_rate": 85,
    "crit_damage": 280,
    "attack_speed": 120,
    "defense": 900,
    "damage_reduction": 60,
    "hp": 18000
  },
  "fetch_status": "success"
}
```

**fetch_status 값:**
- `"success"`: 외부 데이터 수집 성공
- `"cached"`: 쿨타임 내 캐시 데이터 반환
- `"failed"`: 수집 실패, 기존 DB 데이터 반환

**응답 (실패 - 404):**
```json
{
  "detail": "Character not found and fetch failed: [에러 메시지]"
}
```

**동작:**
1. DB에서 기존 데이터 조회
2. 쿨타임 체크 (기본 60초)
3. 쿨타임 통과 시 외부 데이터 수집 시도
4. DB Upsert (raw_payload, stats_payload 저장)
5. 투력/랭크는 NULL 유지 (배치에서 계산)
6. 수집 실패 시 기존 데이터 반환 (서비스 중단 금지)

---

### 2. GET /api/character

캐릭터 상세 조회 (DB 저장된 데이터만 반환)

**요청:**
```
GET /api/character?server=Siel&name=캐릭터명
```

**응답 (성공 - 200):**
```json
{
  "id": 1,
  "name": "캐릭터명",
  "server": "Siel",
  "class": "Warrior",
  "level": 60,
  "power": 450000,
  "power_score": 1250,
  "power_rank": "A3",
  "percentile": 5.2,
  "last_fetched_at": "2025-12-31T20:00:00Z",
  "last_scored_at": "2025-12-31T20:05:00Z",
  "stats_payload": {
    "attack": 1200,
    "damage_amp": 250,
    "crit_rate": 85,
    "crit_damage": 280,
    "attack_speed": 120,
    "defense": 900,
    "damage_reduction": 60,
    "hp": 18000
  },
  "fetch_status": "cached"
}
```

**응답 (실패 - 404):**
```json
{
  "detail": "Character not found"
}
```

**동작:**
- DB에서만 조회 (외부 수집 안 함)
- 없으면 404 반환
- power_score/power_rank는 배치에서 계산된 값 반환

---

### 3. GET /api/ranking/top

TOP N 랭킹 조회

**요청:**
```
GET /api/ranking/top?server=Siel&limit=100
```

**파라미터:**
- `server` (optional): 서버 필터
- `limit` (optional, default=100): 조회 개수

**응답 (성공 - 200):**
```json
{
  "items": [
    {
      "rank": 1,
      "name": "캐릭터1",
      "server": "Siel",
      "class": "Warrior",
      "level": 60,
      "power": 500000,
      "power_score": 1350,
      "power_rank": "S2"
    },
    ...
  ],
  "generated_at": "2025-12-31T20:00:00Z",
  "is_snapshot": true,
  "total": 100
}
```

**동작:**
1. ranking_snapshots 테이블에서 최신 top_list 조회
2. 스냅샷 없으면 실시간 조회 (fallback)
3. power 기준 내림차순 정렬

---

### 4. GET /api/ranking

페이지네이션 랭킹 조회

**요청:**
```
GET /api/ranking?server=Siel&page=1&page_size=20
```

**파라미터:**
- `server` (optional): 서버 필터
- `page` (optional, default=1): 페이지 번호
- `page_size` (optional, default=20): 페이지당 아이템 수

**응답 (성공 - 200):**
```json
{
  "items": [
    {
      "rank": 1,
      "name": "캐릭터1",
      "server": "Siel",
      "class": "Warrior",
      "level": 60,
      "power": 500000,
      "power_score": 1350,
      "power_rank": "S2"
    },
    ...
  ],
  "page": 1,
  "page_size": 20,
  "total": 1500,
  "total_pages": 75,
  "generated_at": "2025-12-31T20:00:00Z",
  "is_snapshot": true
}
```

**동작:**
1. ranking_snapshots 테이블에서 최신 rank_list 조회
2. 스냅샷 없으면 실시간 조회 (fallback)
3. 페이지네이션 적용

---

### 5. GET /api/updates

최근 업데이트 로그

**요청:**
```
GET /api/updates?limit=10
```

**파라미터:**
- `limit` (optional, default=10): 조회 개수

**응답 (성공 - 200):**
```json
{
  "updates": [
    {
      "character_name": "캐릭터1",
      "server": "Siel",
      "class": "Warrior",
      "level": 60,
      "power": 450000,
      "updated_at": "2025-12-31T20:00:00Z",
      "last_fetched_at": "2025-12-31T20:00:00Z"
    },
    ...
  ],
  "total": 10
}
```

**동작:**
- characters 테이블에서 updated_at 기준 내림차순 조회
- 최근 업데이트된 캐릭터 리스트 반환

---

## DB 스키마

### characters 테이블

| 필드 | 타입 | 설명 |
|------|------|------|
| id | BIGINT (PK) | 캐릭터 ID |
| server | VARCHAR(64) | 서버명 (인덱스) |
| name | VARCHAR(64) | 캐릭터명 (인덱스) |
| class | VARCHAR(64) | 직업 |
| level | INTEGER | 레벨 |
| power | BIGINT | 공식 전투력 |
| raw_payload | JSONB | 외부 소스 원본 데이터 |
| stats_payload | JSONB | 정규화된 스탯 데이터 |
| power_score | BIGINT | 사이트 투력 점수 (배치 계산) |
| power_rank | VARCHAR(16) | D1~S5 랭크 (배치 계산) |
| percentile | INTEGER | 퍼센타일 0~100 |
| last_fetched_at | TIMESTAMP | 마지막 외부 수집 시각 |
| last_scored_at | TIMESTAMP | 마지막 투력 계산 시각 |
| created_at | TIMESTAMP | 생성 시각 |
| updated_at | TIMESTAMP | 업데이트 시각 |

**제약조건:**
- UNIQUE(server, name)
- level >= 0
- power >= 0

---

### ranking_snapshots 테이블

| 필드 | 타입 | 설명 |
|------|------|------|
| id | BIGINT (PK) | ID |
| server | VARCHAR(64) | 서버명 (인덱스) |
| generated_at | TIMESTAMP | 생성 시각 (인덱스) |
| rank_list | JSONB | 전체 랭킹 리스트 |
| top_list | JSONB | TOP N 리스트 |

---

## 환경 변수

### Backend 설정

| 변수명 | 기본값 | 설명 |
|--------|--------|------|
| SOURCE_ADAPTER_TYPE | dummy | 데이터 소스 (dummy/external) |
| FETCH_COOLDOWN_SECONDS | 60 | 캐릭터별 재검색 쿨타임 (초) |
| DATABASE_URL | - | PostgreSQL 연결 URL |
| REDIS_URL | - | Redis 연결 URL |
| CORS_ORIGINS | http://localhost:3000 | CORS 허용 오리진 |

---

## 에러 코드

| HTTP 코드 | 설명 |
|-----------|------|
| 200 | 성공 |
| 404 | 리소스 없음 |
| 429 | Rate Limit 초과 |
| 500 | 서버 내부 오류 |

---

## 쿨타임 정책

- 동일 캐릭터 재검색: 60초 (환경 변수로 조정 가능)
- 쿨타임 내 요청: 캐시된 데이터 반환 (fetch_status="cached")
- Rate Limit: Redis 기반 per-character 제한

---

## 배치 작업 (별도 구현 필요)

**투력 계산 배치:**
- 주기: 10분마다 (권장)
- 동작:
  1. characters 테이블의 stats_payload 조회
  2. 서버별 평균 스탯 계산
  3. 투력 점수 (power_score) 계산
  4. 퍼센타일 기반 D1~S5 랭크 산정
  5. power_score, power_rank, percentile 업데이트
  6. last_scored_at 업데이트

**랭킹 스냅샷 생성:**
- 주기: 5분마다 (권장)
- 동작:
  1. power_score 기준 내림차순 정렬
  2. rank_list (전체), top_list (TOP 100) 생성
  3. ranking_snapshots 테이블에 저장

---

## 테스트 결과

### 1. POST /api/search
```bash
curl -X POST "http://localhost:8000/api/search" \\
  -H "Content-Type: application/json" \\
  -d '{"server": "Siel", "name": "TestChar1"}'
```

**결과:** ✅ 성공 (fetch_status="success")

---

### 2. GET /api/character
```bash
curl "http://localhost:8000/api/character?server=Siel&name=TestChar1"
```

**결과:** ✅ 성공 (DB 데이터 반환)

---

### 3. GET /api/ranking/top
```bash
curl "http://localhost:8000/api/ranking/top?limit=5"
```

**결과:** ✅ 성공 (TOP 5 반환)

---

### 4. GET /api/ranking
```bash
curl "http://localhost:8000/api/ranking?page=1&page_size=20"
```

**결과:** ✅ 성공 (페이지네이션 동작)

---

### 5. GET /api/updates
```bash
curl "http://localhost:8000/api/updates?limit=10"
```

**결과:** ✅ 성공 (최근 업데이트 10건 반환)

---

## 복붙 프롬프트 템플릿

```
AION2 검색 기반 데이터 누적 MVP 백엔드를 구현해줘.
POST /api/search로 외부 데이터 수집→정규화→DB upsert.
GET /api/character, /api/ranking/top, /api/ranking, /api/updates 제공.
투력/랭크는 여기서 계산 금지(배치에서), DB 필드만 반환.
수집 실패 시 서비스 중단 금지(이전 데이터 유지), 쿨타임/레이트리밋/로그 포함.
DB: characters, ranking_snapshots 스키마 준수.
```

---

## 구현 완료 사항

✅ DB 스키마 업데이트 (raw_payload, stats_payload, last_fetched_at, last_scored_at)
✅ POST /api/search 엔드포인트 (투력 계산 제거, 쿨타임 적용)
✅ GET /api/character 엔드포인트
✅ GET /api/ranking/top 엔드포인트
✅ GET /api/ranking 페이지네이션 엔드포인트
✅ GET /api/updates 엔드포인트
✅ 수집 실패 시 기존 데이터 반환 로직
✅ Adapter raw_payload/stats_payload 생성
✅ 쿨타임 시스템 (60초)

---

## 향후 구현 필요

✅ 투력 계산 배치 작업 (완료)
✅ 랭킹 스냅샷 생성 배치 작업 (완료)
⏳ 실제 외부 소스 파서 구현 (현재 더미)
⏳ 관리자 API (배치 수동 실행, 통계 조회 등)

---

## 배치 작업 구현 완료

### 투력 계산 및 랭킹 배치 (worker.py)

**작업 이름:** `calculate_power_and_rank_batch`

**실행 주기:** 10분마다 자동 실행 (Celery Beat)

**작업 내용:**

1. **데이터 수집**
   - characters 테이블에서 stats_payload가 있는 캐릭터 조회
   - 서버별로 그룹화

2. **서버 평균 계산**
   - 각 서버의 캐릭터들로부터 평균 스탯 계산
   - stats_payload 기반으로 실시간 계산 (별도 테이블 불필요)

3. **투력 점수 계산**
   - power_calculator.py의 calculate_power_index() 사용
   - 서버 평균 대비 정규화 비율 계산
   - 가중치 적용 (공격력 30%, 피증 20%, 치명 30%, 공속 10%, 생존 10%)
   - power_score 필드에 저장

4. **랭크 산정**
   - rank_calculator.py의 calculate_percentile(), get_tier_rank() 사용
   - 서버별 퍼센타일 계산
   - D1~S5 (25개 티어) 랭크 산정
   - power_rank, percentile 필드에 저장

5. **타임스탬프 업데이트**
   - last_scored_at 업데이트

6. **랭킹 스냅샷 생성**
   - power_score 기준 내림차순 정렬
   - rank_list (전체), top_list (TOP 100) 생성
   - ranking_snapshots 테이블에 저장
   - 서버별 + 전체 통합 스냅샷

**배치 실행 결과 예시:**
```json
{
  "status": "success",
  "processed": 150,
  "failed": 0,
  "servers": 5,
  "timestamp": "2025-12-31T21:47:16.898687"
}
```

**수동 실행 방법:**
```bash
docker exec aion2tool-worker-1 python -c "
from app.worker import calculate_power_and_rank_batch
result = calculate_power_and_rank_batch.apply_async()
print(result.get(timeout=30))
"
```

**로그 확인:**
```bash
docker-compose logs worker --tail 50
docker-compose logs beat --tail 30
```

---

## 참고

- 백엔드 포트: 8000
- 프론트엔드 포트: 3000
- PostgreSQL 포트: 5432
- Redis 포트: 6379
- Celery Worker: app.worker.calculate_power_and_rank_batch
- Celery Beat Schedule: 600초 (10분)
