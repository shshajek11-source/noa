// CORS 설정
// 프로덕션에서는 ALLOWED_ORIGINS 환경변수를 설정하세요
// 예: ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || ['*']

export function getCorsHeaders(origin?: string | null): Record<string, string> {
    // 허용된 origin 확인
    let allowOrigin = '*'

    if (allowedOrigins[0] !== '*' && origin) {
        if (allowedOrigins.includes(origin)) {
            allowOrigin = origin
        } else {
            // 허용되지 않은 origin은 첫 번째 허용 origin 반환
            allowOrigin = allowedOrigins[0]
        }
    }

    return {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Max-Age': '86400',
    }
}

// 기존 코드 호환성을 위한 기본 헤더 (개발용)
export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
