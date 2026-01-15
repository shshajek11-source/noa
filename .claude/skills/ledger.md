# /ledger - 레저(가계부) 페이지 관리

레저 페이지 관련 기능 디버깅 및 관리를 도와줍니다.

## 사용법
```
/ledger [옵션]
```

## 옵션
- `/ledger status` - 현재 레저 페이지 상태 확인
- `/ledger debug` - 디버그 패널 활성화 방법 안내
- `/ledger clear` - 로컬스토리지 데이터 초기화 안내
- `/ledger api` - 레저 관련 API 목록

## 주요 컴포넌트

| 컴포넌트 | 설명 | 파일 |
|----------|------|------|
| DailyContentSection | 일일던전/각성전/토벌전/악몽/차원침공 | `components/DailyContentSection.tsx` |
| DungeonContentSection | 초월/원정/성역 던전 | `components/DungeonContentSection.tsx` |
| WeeklyContentSection | 주간 지령서/슈고/어비스회랑 | `components/WeeklyContentSection.tsx` |
| ShugoFestaCard | 슈고 페스타 티켓 | `components/ShugoFestaCard.tsx` |
| OdEnergyBar | 오드 에너지 관리 | `components/OdEnergyBar.tsx` |
| TicketChargePopup | 티켓 충전 일정 팝업 | `components/TicketChargePopup.tsx` |

## 관련 API
- `/api/ledger/character-state` - 캐릭터별 상태 저장/조회
- `/api/ledger/dungeon-data` - 던전 데이터
- `/api/ledger/daily-content` - 일일 컨텐츠 (현재 localStorage 사용)

## 데이터 저장 방식

### Supabase (영구 저장)
- 캐릭터 상태 (tickets, odEnergy)
- 테이블: `ledger_character_state`

### localStorage (임시 저장)
- 일일 컨텐츠: `dailyContent_{characterId}_{date}`
- 주간 컨텐츠: `weeklyContent_{characterId}`
- 던전 기록: `dungeonRecords_{characterId}`

## 디버깅 팁
1. 개발자 도구 → Application → Local Storage에서 데이터 확인
2. 디버그 패널 활성화: 페이지에서 디버그 토글
3. 캐릭터 전환 시 데이터 분리 확인

## 흔한 문제
- **401 오류**: device-id 헤더 누락 → getAuthHeader 확인
- **데이터 덮어쓰기**: isLoadingRef 패턴 사용 여부 확인
- **캐릭터 연동 안됨**: characterId 기반 저장 키 확인
