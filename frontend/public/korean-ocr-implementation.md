# 한국어 OCR 웹 구현 가이드

## 📋 개요

이 문서는 `@areb0s/ocr` 라이브러리와 PP-OCRv5 한국어 모델을 사용하여 웹사이트에 OCR 기능을 구현하는 방법을 설명합니다.

## 🔗 참조 링크

- OCR 라이브러리: https://github.com/areb0s/ocr
- 한국어 모델: https://github.com/areb0s/ppocrv5-korean-models

## 📦 필요한 파일

### 1. NPM 패키지 설치
```bash
npm install @areb0s/ocr-browser
# 또는
bun add @areb0s/ocr-browser
```

### 2. 모델 파일 다운로드
아래 파일들을 `/public/models/` 폴더에 저장:

- `ch_PP-OCRv5_mobile_det.onnx` - 텍스트 영역 감지 모델
- `korean_PP-OCRv5_rec_mobile_infer.onnx` - 한국어 문자 인식 모델  
- `ppocrv5_korean_dict.txt` - 한국어 문자 사전

다운로드 URL:
```
https://raw.githubusercontent.com/areb0s/ppocrv5-korean-models/main/ch_PP-OCRv5_mobile_det.onnx
https://raw.githubusercontent.com/areb0s/ppocrv5-korean-models/main/korean_PP-OCRv5_rec_mobile_infer.onnx
https://raw.githubusercontent.com/areb0s/ppocrv5-korean-models/main/ppocrv5_korean_dict.txt
```

---

## 🚀 구현 코드

### React 컴포넌트 (TypeScript)

```tsx
// KoreanOCR.tsx
import { useState, useRef, useCallback } from 'react';
import Ocr from '@areb0s/ocr-browser';

interface TextLine {
  text: string;
  mean: number;  // 신뢰도 (0-1)
  box?: number[][];  // 텍스트 위치 좌표
}

interface OCRResult {
  texts: TextLine[];
  resizedImageWidth: number;
  resizedImageHeight: number;
}

export default function KoreanOCR() {
  const [ocr, setOcr] = useState<Ocr | null>(null);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // OCR 엔진 초기화
  const initializeOCR = useCallback(async () => {
    if (isInitialized) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const ocrInstance = await Ocr.create({
        models: {
          detectionPath: '/models/ch_PP-OCRv5_mobile_det.onnx',
          recognitionPath: '/models/korean_PP-OCRv5_rec_mobile_infer.onnx',
          dictionaryPath: '/models/ppocrv5_korean_dict.txt'
        },
        isDebug: false
      });
      
      setOcr(ocrInstance);
      setIsInitialized(true);
    } catch (err) {
      setError('OCR 엔진 초기화 실패: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [isInitialized]);

  // 이미지에서 텍스트 추출
  const detectText = async (file: File) => {
    if (!ocr) {
      await initializeOCR();
    }
    
    if (!ocr) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // 파일을 ImageBitmap으로 변환
      const bitmap = await createImageBitmap(file);
      
      // OCR 실행
      const ocrResult = await ocr.detect(bitmap);
      setResult(ocrResult);
      
    } catch (err) {
      setError('텍스트 인식 실패: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 파일 선택 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      detectText(file);
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      detectText(file);
    }
  };

  return (
    <div className="korean-ocr">
      <h2>한국어 OCR</h2>
      
      {/* 파일 업로드 영역 */}
      <div 
        className="upload-area"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <p>이미지를 드래그하거나 클릭하여 업로드</p>
      </div>

      {/* 로딩 상태 */}
      {loading && <div className="loading">처리 중...</div>}
      
      {/* 에러 메시지 */}
      {error && <div className="error">{error}</div>}
      
      {/* 결과 표시 */}
      {result && (
        <div className="result">
          <h3>인식 결과</h3>
          <div className="text-lines">
            {result.texts.map((line, index) => (
              <div key={index} className="text-line">
                <span className="text">{line.text}</span>
                <span className="confidence">
                  신뢰도: {(line.mean * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
          
          {/* 전체 텍스트 복사 */}
          <button 
            onClick={() => {
              const fullText = result.texts.map(t => t.text).join('\n');
              navigator.clipboard.writeText(fullText);
            }}
          >
            전체 텍스트 복사
          </button>
        </div>
      )}
    </div>
  );
}
```

### CSS 스타일

```css
/* KoreanOCR.css */
.korean-ocr {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.upload-area {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.3s;
}

.upload-area:hover {
  border-color: #007bff;
}

.loading {
  text-align: center;
  padding: 20px;
  color: #666;
}

.error {
  background: #fee;
  color: #c00;
  padding: 10px;
  border-radius: 4px;
  margin: 10px 0;
}

.result {
  margin-top: 20px;
}

.text-lines {
  background: #f9f9f9;
  border-radius: 8px;
  padding: 15px;
}

.text-line {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.text-line:last-child {
  border-bottom: none;
}

.text {
  font-size: 16px;
}

.confidence {
  color: #888;
  font-size: 14px;
}

button {
  margin-top: 15px;
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background: #0056b3;
}
```

---

## 🔧 바닐라 JavaScript 버전

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>한국어 OCR</title>
  <style>
    /* 위의 CSS 스타일 적용 */
  </style>
</head>
<body>
  <div id="app">
    <h1>한국어 OCR</h1>
    <input type="file" id="fileInput" accept="image/*">
    <div id="result"></div>
  </div>

  <script type="module">
    import Ocr from 'https://esm.sh/@areb0s/ocr-browser';

    let ocr = null;

    // OCR 초기화
    async function initOCR() {
      if (ocr) return ocr;
      
      ocr = await Ocr.create({
        models: {
          detectionPath: '/models/ch_PP-OCRv5_mobile_det.onnx',
          recognitionPath: '/models/korean_PP-OCRv5_rec_mobile_infer.onnx',
          dictionaryPath: '/models/ppocrv5_korean_dict.txt'
        }
      });
      
      return ocr;
    }

    // 파일 처리
    document.getElementById('fileInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const resultDiv = document.getElementById('result');
      resultDiv.innerHTML = '처리 중...';

      try {
        await initOCR();
        const bitmap = await createImageBitmap(file);
        const result = await ocr.detect(bitmap);
        
        resultDiv.innerHTML = result.texts
          .map(t => `<p>${t.text} <small>(${(t.mean * 100).toFixed(1)}%)</small></p>`)
          .join('');
          
      } catch (err) {
        resultDiv.innerHTML = `<p style="color:red">오류: ${err.message}</p>`;
      }
    });
  </script>
</body>
</html>
```

---

## 📖 API 참조

### Ocr.create(options)

OCR 인스턴스를 생성합니다.

```typescript
const ocr = await Ocr.create({
  models: {
    detectionPath: string,      // 텍스트 감지 모델 경로
    recognitionPath: string,    // 문자 인식 모델 경로
    dictionaryPath: string      // 문자 사전 경로
  },
  isDebug?: boolean            // 디버그 모드 (선택)
});
```

### ocr.detect(image)

이미지에서 텍스트를 추출합니다.

```typescript
const result = await ocr.detect(image);

// 지원하는 image 타입:
// - string (URL 또는 data URL)
// - ImageBitmap
// - HTMLImageElement (<img>)
// - HTMLCanvasElement (<canvas>)
// - HTMLVideoElement (<video> 현재 프레임)
// - { data: Uint8Array, width: number, height: number }

// 반환값:
interface OCRResult {
  texts: Array<{
    text: string;       // 인식된 텍스트
    mean: number;       // 신뢰도 (0-1)
    box?: number[][];   // 텍스트 영역 좌표 [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
  }>;
  resizedImageWidth: number;
  resizedImageHeight: number;
}
```

---

## ⚠️ 주의사항

1. **모델 파일 크기**: ONNX 모델 파일이 크므로 초기 로딩 시간이 필요합니다.
2. **브라우저 호환성**: WebAssembly와 ONNX Runtime을 지원하는 최신 브라우저 필요
3. **메모리 관리**: ImageBitmap 사용 시 라이브러리가 자동으로 `close()`를 호출합니다.
4. **CORS**: 모델 파일은 동일 출처에서 제공하거나 CORS 설정이 필요합니다.

---

## 🎯 사용 예시

### Canvas에서 OCR

```javascript
const canvas = document.getElementById('myCanvas');
const result = await ocr.detect(canvas);
```

### Video 프레임 캡처 OCR

```javascript
const video = document.getElementById('myVideo');
// 현재 재생 중인 프레임에서 텍스트 추출
const result = await ocr.detect(video);
```

### URL 이미지 OCR

```javascript
const result = await ocr.detect('https://example.com/image.jpg');
```

---

## 📁 프로젝트 구조 예시

```
your-project/
├── public/
│   └── models/
│       ├── ch_PP-OCRv5_mobile_det.onnx
│       ├── korean_PP-OCRv5_rec_mobile_infer.onnx
│       └── ppocrv5_korean_dict.txt
├── src/
│   └── components/
│       ├── KoreanOCR.tsx
│       └── KoreanOCR.css
└── package.json
```
