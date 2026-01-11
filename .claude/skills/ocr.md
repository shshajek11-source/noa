# /ocr - OCR 설정 관리

파티 분석 OCR 관련 설정을 확인하고 수정합니다.

## 사용법
```
/ocr [옵션]
```

## 옵션
- `/ocr status` - 현재 OCR 설정 확인
- `/ocr model [모델명]` - OCR 모델 변경
- `/ocr prompt` - OCR 프롬프트 확인/수정
- `/ocr scan` - 스캔 영역 설정 확인/수정

## 관련 파일
- `frontend/src/app/api/ocr/route.ts` - OCR API
- `frontend/src/hooks/usePartyScanner.ts` - 스캔 로직

## 사용 가능한 모델
- `gemini-2.5-flash` - 정식 버전 (정확도 높음)
- `gemini-2.5-flash-lite` - 경량 버전 (빠름)
- `gemini-2.0-flash-exp` - 실험 버전

## 스캔 영역 설정
- 높이: img.height * 0.10
- 시작X: img.width * 0.12
- 너비: img.width * 0.55
- 확대: 3배
