import { NextResponse } from 'next/server'

/**
 * 표준 API 응답 형식
 */
export interface ApiResponse<T = unknown> {
    success: boolean
    data?: T
    error?: string
    meta?: {
        total?: number
        page?: number
        limit?: number
        [key: string]: unknown
    }
}

/**
 * 성공 응답 생성
 */
export function successResponse<T>(
    data: T,
    meta?: ApiResponse['meta'],
    status: number = 200
): NextResponse<ApiResponse<T>> {
    return NextResponse.json(
        {
            success: true,
            data,
            ...(meta && { meta })
        },
        { status }
    )
}

/**
 * 에러 응답 생성
 */
export function errorResponse(
    message: string,
    status: number = 500,
    meta?: ApiResponse['meta']
): NextResponse<ApiResponse<null>> {
    return NextResponse.json(
        {
            success: false,
            error: message,
            ...(meta && { meta })
        },
        { status }
    )
}

/**
 * 페이지네이션 응답 생성
 */
export function paginatedResponse<T>(
    data: T[],
    options: {
        total: number
        page: number
        limit: number
        [key: string]: unknown
    }
): NextResponse<ApiResponse<T[]>> {
    return successResponse(data, {
        total: options.total,
        page: options.page,
        limit: options.limit,
        totalPages: Math.ceil(options.total / options.limit),
        hasMore: options.page * options.limit < options.total
    })
}

/**
 * 에러 타입별 응답
 */
export const ApiErrors = {
    badRequest: (message: string = 'Bad Request') =>
        errorResponse(message, 400),

    unauthorized: (message: string = 'Unauthorized') =>
        errorResponse(message, 401),

    forbidden: (message: string = 'Forbidden') =>
        errorResponse(message, 403),

    notFound: (message: string = 'Not Found') =>
        errorResponse(message, 404),

    tooManyRequests: (message: string = 'Too Many Requests', retryAfter?: number) => {
        const response = errorResponse(message, 429)
        if (retryAfter) {
            response.headers.set('Retry-After', retryAfter.toString())
        }
        return response
    },

    internal: (message: string = 'Internal Server Error') =>
        errorResponse(message, 500),

    serviceUnavailable: (message: string = 'Service Unavailable') =>
        errorResponse(message, 503)
}

/**
 * 에러 객체에서 메시지 추출
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message
    }
    if (typeof error === 'string') {
        return error
    }
    return 'Unknown error occurred'
}

/**
 * try-catch 래퍼
 */
export async function withErrorHandling<T>(
    fn: () => Promise<T>,
    errorMessage: string = 'Request failed'
): Promise<NextResponse<ApiResponse<T>> | NextResponse<ApiResponse<null>>> {
    try {
        const result = await fn()
        return successResponse(result)
    } catch (error) {
        console.error(`[API Error] ${errorMessage}:`, error)
        return errorResponse(getErrorMessage(error))
    }
}
