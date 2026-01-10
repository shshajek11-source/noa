import { NextRequest, NextResponse } from 'next/server';

// Gemini 1.5 Flash OCR API
export async function POST(request: NextRequest) {
    try {
        const { image } = await request.json();

        if (!image) {
            return NextResponse.json({ error: 'Image is required' }, { status: 400 });
        }

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_VISION_API_KEY;

        if (!GEMINI_API_KEY) {
            console.error('[OCR API] Missing Gemini API key');
            return NextResponse.json({ error: 'OCR service not configured' }, { status: 500 });
        }

        // base64 데이터에서 prefix 제거 및 mime type 추출
        const matches = image.match(/^data:(image\/\w+);base64,(.+)$/);
        let mimeType = 'image/png';
        let base64Data = image;

        if (matches) {
            mimeType = matches[1];
            base64Data = matches[2];
        } else {
            base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        }

        const requestBody = {
            contents: [
                {
                    parts: [
                        {
                            text: `이 이미지에서 모든 텍스트를 추출해주세요. 게임 화면의 파티원 목록입니다.

중요 지침:
1. 캐릭터 이름과 서버명(대괄호 안)을 정확히 읽어주세요.
2. 한글 쌍자음(ㄲ, ㄸ, ㅃ, ㅅㅅ, ㅆ, ㅉ)을 주의해서 구분해주세요.
   - ㄸ와 ㄷ를 정확히 구분 (예: 또롱, 뚜벅이, 땡칠이 등)
   - ㄲ와 ㄱ를 정확히 구분 (예: 까망이, 꽃님 등)
   - ㅃ와 ㅂ를 정확히 구분 (예: 빠른손 등)
   - ㅆ와 ㅅ를 정확히 구분 (예: 쏘울, 싸움꾼 등)
   - ㅉ와 ㅈ를 정확히 구분 (예: 짱구 등)
3. 텍스트만 출력하고 다른 설명은 하지 마세요.`
                        },
                        {
                            inline_data: {
                                mime_type: mimeType,
                                data: base64Data
                            }
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 1024
            }
        };

        console.log('[OCR API] Calling Gemini 1.5 Flash...');

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[OCR API] Gemini error:', response.status, errorText);
            return NextResponse.json({ error: `OCR failed: ${response.status}` }, { status: response.status });
        }

        const result = await response.json();
        console.log('[OCR API] Gemini response:', JSON.stringify(result).substring(0, 500));

        // Gemini 결과에서 텍스트 추출
        let extractedText = '';
        if (result.candidates && result.candidates[0]?.content?.parts) {
            extractedText = result.candidates[0].content.parts
                .map((part: any) => part.text || '')
                .join('\n');
        }

        console.log('[OCR API] Extracted text:', extractedText);

        return NextResponse.json({
            success: true,
            text: extractedText,
            raw: result
        });

    } catch (error: any) {
        console.error('[OCR API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
