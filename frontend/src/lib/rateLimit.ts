import { NextRequest, NextResponse } from 'next/server'

interface RateLimitEntry {
    count: number
    resetTime: number
}

// 인메모리 저장소 (프로덕션에서는 Redis 권장)
const rateLimitStore = new Map<string, RateLimitEntry>()

// 주기적으로 만료된 엔트리 정리 (메모리 누수 방지)
const CLEANUP_INTERVAL = 60 * 1000 // 1분
let lastCleanup = Date.now()

function cleanup() {
    const now = Date.now()
    if (now - lastCleanup < CLEANUP_INTERVAL) return

    rateLimitStore.forEach((entry, key) => {
        if (now > entry.resetTime) {
            rateLimitStore.delete(key)
        }
    })
    lastCleanup = now
}

export interface RateLimitConfig {
    /** 윈도우당 최대 요청 수 */
    limit: number
    /** 윈도우 크기 (밀리초) */
    windowMs: number
    /** 식별자 추출 함수 (기본: IP) */
    keyGenerator?: (request: NextRequest) => string
    /** 제한 초과 시 메시지 */
    message?: string
}

const DEFAULT_CONFIG: RateLimitConfig = {
    limit: 100,
    windowMs: 60 * 1000, // 1분
    message: 'Too many requests, please try again later.'
}

/**
 * IP 주소 추출
 */
function getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    if (forwarded) {
        return forwarded.split(',')[0].trim()
    }
    const realIP = request.headers.get('x-real-ip')
    if (realIP) {
        return realIP
    }
    return 'unknown'
}

/**
 * Rate Limit 검사
 */
export function checkRateLimit(
    request: NextRequest,
    config: Partial<RateLimitConfig> = {}
): { success: boolean; remaining: number; resetTime: number; error?: NextResponse } {
    const { limit, windowMs, keyGenerator, message } = { ...DEFAULT_CONFIG, ...config }

    cleanup()

    const key = keyGenerator ? keyGenerator(request) : getClientIP(request)
    const now = Date.now()

    let entry = rateLimitStore.get(key)

    // 새 엔트리 또는 윈도우 리셋
    if (!entry || now > entry.resetTime) {
        entry = {
            count: 1,
            resetTime: now + windowMs
        }
        rateLimitStore.set(key, entry)
        return {
            success: true,
            remaining: limit - 1,
            resetTime: entry.resetTime
        }
    }

    // 기존 엔트리 업데이트
    entry.count++

    if (entry.count > limit) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
        return {
            success: false,
            remaining: 0,
            resetTime: entry.resetTime,
            error: NextResponse.json(
                {
                    error: message,
                    retryAfter
                },
                {
                    status: 429,
                    headers: {
                        'Retry-After': retryAfter.toString(),
                        'X-RateLimit-Limit': limit.toString(),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': entry.resetTime.toString()
                    }
                }
            )
        }
    }

    return {
        success: true,
        remaining: limit - entry.count,
        resetTime: entry.resetTime
    }
}

/**
 * Rate Limiting 미들웨어 래퍼
 */
export function withRateLimit(
    handler: (request: NextRequest) => Promise<NextResponse>,
    config: Partial<RateLimitConfig> = {}
) {
    return async (request: NextRequest): Promise<NextResponse> => {
        const result = checkRateLimit(request, config)

        if (!result.success) {
            return result.error!
        }

        const response = await handler(request)

        // Rate limit 헤더 추가
        response.headers.set('X-RateLimit-Limit', (config.limit || DEFAULT_CONFIG.limit).toString())
        response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
        response.headers.set('X-RateLimit-Reset', result.resetTime.toString())

        return response
    }
}

/**
 * 사전 정의된 Rate Limit 설정
 */
export const RATE_LIMITS = {
    /** 일반 API: 분당 100회 */
    standard: { limit: 100, windowMs: 60 * 1000 },
    /** 검색 API: 분당 60회 */
    search: { limit: 60, windowMs: 60 * 1000 },
    /** 외부 API 프록시: 분당 30회 */
    external: { limit: 30, windowMs: 60 * 1000 },
    /** Admin API: 분당 20회 */
    admin: { limit: 20, windowMs: 60 * 1000 },
    /** 무거운 작업: 분당 10회 */
    heavy: { limit: 10, windowMs: 60 * 1000 }
} as const
