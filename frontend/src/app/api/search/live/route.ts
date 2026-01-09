import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit'

export async function POST(request: NextRequest) {
    // Rate Limiting (외부 API 호출이므로 엄격하게)
    const rateLimit = checkRateLimit(request, RATE_LIMITS.external)
    if (!rateLimit.success) {
        return rateLimit.error!
    }

    try {
        const { name, serverId, race, page } = await request.json()

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        const url = new URL('https://aion2.plaync.com/ko-kr/api/search/aion2/search/v2/character')
        url.searchParams.append('keyword', name)
        url.searchParams.append('page', (page || 1).toString())
        url.searchParams.append('size', '30')
        if (serverId) url.searchParams.append('serverId', serverId.toString())
        if (race) url.searchParams.append('race', race.toString())

        console.log('[Live Search] Fetching:', url.toString())

        const response = await fetch(url.toString(), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://aion2.plaync.com/',
                'Accept': 'application/json'
            }
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('[Live Search] AION API error:', response.status, errorText)
            throw new Error(`AION API returned ${response.status}`)
        }

        const data = await response.json()
        console.log('[Live Search] Results:', data.list?.length || 0, 'items, total:', data.pagination?.total)
        return NextResponse.json(data)

    } catch (error) {
        console.error('Proxy Search Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
