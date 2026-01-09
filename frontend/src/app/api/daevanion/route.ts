import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit'

// 유효한 boardId 범위
const VALID_BOARD_ID_RANGE = { min: 11, max: 86 }

export async function GET(request: NextRequest) {
    // Rate Limiting
    const rateLimit = checkRateLimit(request, RATE_LIMITS.external)
    if (!rateLimit.success) {
        return rateLimit.error!
    }

    const searchParams = request.nextUrl.searchParams
    const characterId = searchParams.get('characterId')
    const serverId = searchParams.get('serverId')
    const boardId = searchParams.get('boardId')

    // 필수 파라미터 검증
    if (!characterId || !serverId || !boardId) {
        return NextResponse.json(
            { success: false, error: 'Missing required parameters: characterId, serverId, boardId' },
            { status: 400 }
        )
    }

    // boardId 숫자 검증
    const boardIdNum = parseInt(boardId, 10)
    if (isNaN(boardIdNum)) {
        return NextResponse.json(
            { success: false, error: 'boardId must be a valid number' },
            { status: 400 }
        )
    }

    // boardId 범위 검증
    if (boardIdNum < VALID_BOARD_ID_RANGE.min || boardIdNum > VALID_BOARD_ID_RANGE.max) {
        return NextResponse.json(
            {
                success: false,
                error: `boardId must be between ${VALID_BOARD_ID_RANGE.min} and ${VALID_BOARD_ID_RANGE.max}`,
                received: boardIdNum
            },
            { status: 400 }
        )
    }

    // serverId 숫자 검증
    const serverIdNum = parseInt(serverId, 10)
    if (isNaN(serverIdNum)) {
        return NextResponse.json(
            { success: false, error: 'serverId must be a valid number' },
            { status: 400 }
        )
    }

    try {
        const url = `https://aion2.plaync.com/api/character/daevanion/detail?lang=ko&characterId=${encodeURIComponent(characterId)}&serverId=${serverIdNum}&boardId=${boardIdNum}`

        const res = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            signal: AbortSignal.timeout(10000) // 10초 타임아웃
        })

        if (!res.ok) {
            const errorText = await res.text()
            console.error('[Daevanion API] Request failed:', res.status, errorText)
            return NextResponse.json(
                {
                    success: false,
                    error: 'External API request failed',
                    status: res.status
                },
                { status: res.status >= 500 ? 502 : res.status }
            )
        }

        const data = await res.json()

        return NextResponse.json({
            success: true,
            data
        })
    } catch (error) {
        console.error('[Daevanion API] Error:', error instanceof Error ? error.message : error)

        // 타임아웃 에러 구분
        if (error instanceof Error && error.name === 'TimeoutError') {
            return NextResponse.json(
                { success: false, error: 'External API timeout' },
                { status: 504 }
            )
        }

        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
