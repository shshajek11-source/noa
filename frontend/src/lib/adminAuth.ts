import { NextRequest, NextResponse } from 'next/server'

/**
 * Admin API 인증 검증
 *
 * 환경변수 ADMIN_API_KEY가 설정되어 있으면 해당 키로 인증
 * Authorization: Bearer <ADMIN_API_KEY> 헤더 필요
 *
 * 개발환경(NODE_ENV=development)에서는 키가 없어도 허용 (선택적)
 */
export function verifyAdminAuth(request: NextRequest): { authorized: boolean; error?: NextResponse } {
    const adminApiKey = process.env.ADMIN_API_KEY

    // ADMIN_API_KEY가 설정되지 않은 경우
    if (!adminApiKey) {
        // 개발환경에서는 경고만 출력하고 허용
        if (process.env.NODE_ENV === 'development') {
            console.warn('[Admin Auth] ADMIN_API_KEY not set - allowing request in development mode')
            return { authorized: true }
        }
        // 프로덕션에서는 키가 없으면 거부
        console.error('[Admin Auth] ADMIN_API_KEY not configured')
        return {
            authorized: false,
            error: NextResponse.json(
                { error: 'Admin API not configured' },
                { status: 503 }
            )
        }
    }

    // Authorization 헤더 확인
    const authHeader = request.headers.get('Authorization')

    if (!authHeader) {
        return {
            authorized: false,
            error: NextResponse.json(
                { error: 'Authorization header required' },
                { status: 401 }
            )
        }
    }

    // Bearer 토큰 형식 확인
    if (!authHeader.startsWith('Bearer ')) {
        return {
            authorized: false,
            error: NextResponse.json(
                { error: 'Invalid authorization format. Use: Bearer <token>' },
                { status: 401 }
            )
        }
    }

    const token = authHeader.slice(7) // "Bearer " 제거

    // 토큰 검증
    if (token !== adminApiKey) {
        console.warn('[Admin Auth] Invalid token attempted')
        return {
            authorized: false,
            error: NextResponse.json(
                { error: 'Invalid or expired token' },
                { status: 403 }
            )
        }
    }

    return { authorized: true }
}

/**
 * Admin 인증을 적용하는 래퍼 함수
 * 사용 예:
 * export const POST = withAdminAuth(async (request) => { ... })
 */
export function withAdminAuth(
    handler: (request: NextRequest) => Promise<NextResponse>
) {
    return async (request: NextRequest): Promise<NextResponse> => {
        const auth = verifyAdminAuth(request)

        if (!auth.authorized) {
            return auth.error!
        }

        return handler(request)
    }
}
