# /test - 테스트 실행

프로젝트 테스트를 실행합니다.

## 사용법
```
/test [옵션]
```

## 옵션
- `/test` - E2E 헬스 체크 실행
- `/test e2e` - E2E 테스트 실행
- `/test build` - 빌드 테스트 (타입 검사 포함)

## 테스트 실행

### E2E 헬스 체크
```bash
cd frontend && npm run test:e2e
```

### 빌드 테스트 (타입 검사)
```bash
cd frontend && npm run build
```

## 테스트 전 체크리스트

1. **개발 서버 실행 확인**
   ```bash
   cd frontend && npm run dev
   ```

2. **환경변수 설정 확인**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **의존성 설치 확인**
   ```bash
   cd frontend && npm install
   ```

## 흔한 테스트 실패 원인

### 타입 에러
- TypeScript 컴파일 에러
- `npm run build`로 확인

### API 에러
- Supabase 연결 실패
- 환경변수 누락

### 렌더링 에러
- 클라이언트/서버 불일치
- hydration 에러

## 수동 테스트 체크리스트

### 레저 페이지
- [ ] 캐릭터 검색 동작
- [ ] 캐릭터 선택 시 데이터 로드
- [ ] 티켓 증감 버튼 동작
- [ ] 오드 에너지 조절 동작
- [ ] 던전 완료 토글 동작
- [ ] 캐릭터 전환 시 데이터 분리

### 메인 페이지
- [ ] 캐릭터 검색 동작
- [ ] 랭킹 페이지 로드
- [ ] 캐릭터 상세 페이지 로드

## 디버깅
테스트 실패 시:
1. 브라우저 개발자 도구 콘솔 확인
2. Network 탭에서 API 응답 확인
3. `/api debug` 명령으로 API 상태 확인
