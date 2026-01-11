# /deploy - 배포하기

변경사항을 커밋하고 푸시하여 Vercel에 자동 배포합니다.

## 사용법
```
/deploy [커밋 메시지]
```

## 실행 단계

1. `git status`로 변경된 파일 확인
2. `git diff`로 변경 내용 확인
3. 변경된 파일을 스테이징 (`git add`)
4. 커밋 메시지 생성 (사용자 제공 또는 자동 생성)
5. 커밋 및 푸시
6. Vercel 자동 배포 안내

## 커밋 메시지 규칙
- feat: 새 기능
- fix: 버그 수정
- improve: 개선
- chore: 기타 작업
- refactor: 리팩토링

## 예시
```
/deploy OCR 정확도 개선
```
