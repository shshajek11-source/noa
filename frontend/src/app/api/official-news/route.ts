import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface NewsItem {
    id: string
    title: string
    summary: string
    thumbnailUrl: string | null
    postedAt: string
    viewCount: number
    link: string
    boardType: 'update' | 'notice'
}

// Simple In-Memory Cache
interface CacheEntry {
    data: NewsItem[]
    timestamp: number
}

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const cache: Record<string, CacheEntry> = {}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const board = searchParams.get('board') || 'update_ko' // update_ko or notice_ko
    const size = parseInt(searchParams.get('size') || '5', 10)

    try {
        const cacheKey = `${board}_${size}`
        const now = Date.now()
        const cached = cache[cacheKey]

        // Return cached data if fresh
        if (cached && (now - cached.timestamp < CACHE_TTL)) {
            return NextResponse.json({
                success: true,
                items: cached.data,
                cached: true,
                updatedAt: cached.timestamp
            })
        }

        // Fetch from PlayNC API
        const apiUrl = `https://api-community.plaync.com/aion2/board/${board}/article?page=1&size=${size}`

        const res = await fetch(apiUrl, {
            headers: {
                'Referer': 'https://aion2.plaync.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            },
            next: { revalidate: 0 }
        })

        if (!res.ok) {
            throw new Error(`PlayNC API Error: ${res.status}`)
        }

        const json = await res.json()
        const contentList = json.contentList || []

        // Transform to simpler format
        const items: NewsItem[] = contentList.map((item: any) => ({
            id: item.id,
            title: item.title,
            summary: item.summary || '',
            thumbnailUrl: item.thumbnailUrl || null,
            postedAt: item.timestamps?.postDateTime || item.timestamps?.postedAt || '',
            viewCount: item.reactions?.viewCount || 0,
            link: `https://aion2.plaync.com/ko-kr/board/${board === 'update_ko' ? 'update' : 'notice'}/view?articleId=${item.id}`,
            boardType: board === 'update_ko' ? 'update' : 'notice'
        }))

        // Update cache
        cache[cacheKey] = {
            data: items,
            timestamp: now
        }

        return NextResponse.json({
            success: true,
            items,
            cached: false,
            updatedAt: now
        })

    } catch (error: any) {
        console.error('[Official News API Error]', error)

        // Return stale cache if available
        const cacheKey = `${board}_${size}`
        const cached = cache[cacheKey]
        if (cached) {
            return NextResponse.json({
                success: true,
                items: cached.data,
                cached: true,
                stale: true,
                updatedAt: cached.timestamp,
                error: error.message
            })
        }

        return NextResponse.json({
            success: false,
            items: [],
            error: error.message
        }, { status: 500 })
    }
}
