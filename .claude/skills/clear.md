# /clear - 캐시 및 데이터 초기화

로컬스토리지, 빌드 캐시 등을 초기화합니다.

## 사용법
```
/clear [옵션]
```

## 옵션
- `/clear cache` - Next.js 빌드 캐시 초기화
- `/clear storage` - 로컬스토리지 초기화 가이드
- `/clear all` - 전체 초기화

## Next.js 캐시 초기화
```bash
cd frontend && rm -rf .next
cd frontend && npm run build
```

## 로컬스토리지 초기화

### 브라우저에서 수동 초기화
1. 개발자 도구 열기 (F12)
2. Application 탭 선택
3. Storage → Local Storage → localhost:3000
4. 원하는 키 삭제 또는 "Clear All"

### 레저 관련 키
| 키 패턴 | 설명 |
|---------|------|
| `dailyContent_{characterId}_{date}` | 일일 컨텐츠 기록 |
| `weeklyContent_{characterId}` | 주간 컨텐츠 기록 |
| `dungeonRecords_{characterId}` | 던전 완료 기록 |
| `deviceId` | 디바이스 식별자 |

### JavaScript로 초기화
```javascript
// 콘솔에서 실행

// 모든 레저 데이터 삭제
Object.keys(localStorage)
  .filter(k => k.startsWith('dailyContent_') ||
              k.startsWith('weeklyContent_') ||
              k.startsWith('dungeonRecords_'))
  .forEach(k => localStorage.removeItem(k))

// 전체 로컬스토리지 삭제
localStorage.clear()
```

## node_modules 재설치
```bash
cd frontend
rm -rf node_modules
rm package-lock.json
npm install
```

## 전체 초기화 (주의!)
```bash
cd frontend
rm -rf .next node_modules
npm install
npm run build
```

## 주의사항
- `localStorage.clear()`는 모든 데이터 삭제
- deviceId 삭제 시 새 ID 생성됨
- Supabase 데이터는 영향 없음
