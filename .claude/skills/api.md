# /api - API 디버깅 및 테스트

프로젝트의 API를 테스트하고 디버깅합니다.

## 사용법
```
/api [옵션]
```

## 옵션
- `/api list` - 모든 API 엔드포인트 목록
- `/api test [endpoint]` - 특정 API 테스트
- `/api debug` - API 디버깅 가이드

## 주요 API 목록

### 캐릭터 관련
| 엔드포인트 | 메서드 | 설명 |
|------------|--------|------|
| `/api/search/live` | GET | 캐릭터 검색 |
| `/api/character` | GET | 캐릭터 상세 정보 |
| `/api/ranking` | GET | 랭킹 조회 |

### 레저(가계부) 관련
| 엔드포인트 | 메서드 | 설명 |
|------------|--------|------|
| `/api/ledger/character-state` | GET/POST | 캐릭터 상태 |
| `/api/ledger/dungeon-data` | GET | 던전 데이터 |

### 파티/스캔 관련
| 엔드포인트 | 메서드 | 설명 |
|------------|--------|------|
| `/api/party/scan` | POST | 파티 스캔 |
| `/api/ocr` | POST | OCR 처리 |

### 아이템 관련
| 엔드포인트 | 메서드 | 설명 |
|------------|--------|------|
| `/api/item/search` | GET | 아이템 검색 |

## API 테스트 방법

### curl 사용
```bash
# 캐릭터 검색
curl "http://localhost:3000/api/search/live?term=캐릭터명"

# 캐릭터 상태 조회
curl "http://localhost:3000/api/ledger/character-state?characterId=123" \
  -H "x-device-id: test-device"
```

### 브라우저에서 테스트
1. 개발자 도구 → Network 탭
2. API 호출 확인
3. Request/Response 검토

## 인증 헤더
일부 API는 인증이 필요합니다:
```typescript
headers: {
  'x-device-id': deviceId  // 필수
}
```

## 에러 코드
| 코드 | 의미 | 해결 방법 |
|------|------|----------|
| 401 | 인증 실패 | x-device-id 헤더 확인 |
| 404 | 리소스 없음 | 엔드포인트 경로 확인 |
| 500 | 서버 오류 | Supabase 연결/RLS 확인 |

## API 우선순위 원칙
1. **Supabase 캐시 먼저** (10-50ms)
2. **자체 API** (50-200ms)
3. **외부 API 최후** (500-2000ms)
