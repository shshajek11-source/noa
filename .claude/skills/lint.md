# /lint - 코드 린트 검사

ESLint를 실행하여 코드 품질을 검사합니다.

## 사용법
```
/lint
```

## 실행 단계

1. `cd frontend && npm run lint` 실행
2. 에러/경고 목록 표시
3. 자동 수정 가능한 항목 안내

## 자동 수정
```bash
cd frontend && npm run lint -- --fix
```

## 주요 규칙

### TypeScript
- 미사용 변수 금지 (`@typescript-eslint/no-unused-vars`)
- any 타입 사용 경고 (`@typescript-eslint/no-explicit-any`)
- 타입 명시 권장

### React
- 훅 규칙 준수 (`react-hooks/rules-of-hooks`)
- 의존성 배열 검사 (`react-hooks/exhaustive-deps`)
- key 속성 필수

### Import
- 미사용 import 정리
- import 순서 정렬

## 흔한 에러 패턴

### 1. 미사용 변수
```typescript
// 에러: 'unused' is defined but never used
const unused = 1

// 수정: 제거하거나 언더스코어 접두사
const _unused = 1  // 의도적 무시
```

### 2. any 타입
```typescript
// 경고: Unexpected any
const data: any = {}

// 수정: 적절한 타입 지정
const data: SomeType = {}
```

### 3. 훅 의존성
```typescript
// 경고: React Hook useEffect has missing dependency
useEffect(() => {
  doSomething(value)
}, [])

// 수정: 의존성 추가
useEffect(() => {
  doSomething(value)
}, [value])
```

## 무시 방법 (권장하지 않음)
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = {}

/* eslint-disable */
// 파일 전체 무시
/* eslint-enable */
```
