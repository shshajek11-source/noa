# /build - 빌드 테스트

프로덕션 빌드를 실행하여 오류가 없는지 확인합니다.

## 사용법
```
/build
```

## 실행 단계

1. `cd frontend` 디렉토리로 이동
2. `npm run build` 실행
3. 빌드 결과 확인
4. 오류 발생 시 수정 방안 제시

## 빌드 오류 유형
- TypeScript 타입 오류
- ESLint 오류
- Import 오류
- 환경변수 누락

## 빌드 성공 시
- `.next` 폴더에 빌드 결과 생성
- Vercel 배포 준비 완료
