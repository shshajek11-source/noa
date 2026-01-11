# /collector - 캐릭터 수집 관리

캐릭터 수집 기능 관련 설정 및 문제 해결을 도와줍니다.

## 사용법
```
/collector [옵션]
```

## 옵션
- `/collector status` - 현재 수집 상태 확인
- `/collector start` - 로컬에서 수집 시작 방법 안내
- `/collector fix` - 일반적인 문제 해결

## 로컬에서 수집 실행
1. `cd frontend && npm run dev`
2. http://localhost:3000/admin/collector 접속
3. 설정 조절 (권장: 3초 이상 간격)
4. "수집 시작" 클릭

## 주의사항
- Vercel(서버리스)에서는 장시간 수집 불가
- 로컬에서만 수집 실행 권장
- 브라우저 닫으면 수집 중단

## 관련 파일
- `frontend/src/app/admin/collector/page.tsx` - UI
- `frontend/src/app/api/admin/collector/route.ts` - API

## 체크포인트 기능
- 수집 진행상황을 DB에 저장
- 중단 후 재시작 시 이어서 수집
- `settings` 테이블 필요
