import { NextRequest, NextResponse } from 'next/server'
import { LiveCardData, LivePreviewResponse } from '@/types/live'

export const dynamic = 'force-dynamic'

// Simple In-Memory Cache
interface CacheEntry {
    data: LiveCardData[]
    timestamp: number
}

// 15 seconds TTL
const CACHE_TTL = 15 * 1000
const cache: Record<string, CacheEntry> = {}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const platform = (searchParams.get('platform') || 'chzzk') as 'chzzk' | 'soop' | 'all'
    const size = parseInt(searchParams.get('size') || '20', 10)

    try {
        let cards: LiveCardData[] = []
        let errors: string[] = []

        // Check Cache
        const now = Date.now()
        const cacheKey = `${platform}_${size}`
        const cached = cache[cacheKey]

        if (cached && (now - cached.timestamp < CACHE_TTL)) {
            return NextResponse.json({
                updatedAt: cached.timestamp,
                stale: false,
                platform,
                cards: cached.data,
                error: null
            })
        }

        // Fetch Data
        const promises = []
        if (platform === 'chzzk' || platform === 'all') {
            promises.push(fetchChzzk(size).catch(e => {
                console.error('Chzzk Error:', e)
                errors.push(`Chzzk: ${e.message}`)
                return []
            }))
        }
        if (platform === 'soop' || platform === 'all') {
            promises.push(fetchSoop(size).catch(e => {
                console.error('Soop Error:', e)
                errors.push(`Soop: ${e.message}`)
                return []
            }))
        }

        const results = await Promise.all(promises)
        cards = results.flat()

        // Sort by viewers desc if 'all'
        if (platform === 'all') {
            cards.sort((a, b) => b.viewers - a.viewers)
        }

        // Only take requested size if strictly enforced (optional, usually per platform limit applies)
        // But for 'all', we might want to slice after sorting.
        if (platform === 'all') {
            cards = cards.slice(0, size)
        }

        const response: LivePreviewResponse = {
            updatedAt: now,
            stale: false,
            platform,
            cards,
            error: errors.length > 0 ? errors.join(', ') : null
        }

        // Update Cache (only if we got some data or explicit empty, not total failure?)
        // If partial failure, we still cache what we got? 
        // Let's cache if we have cards.
        if (cards.length > 0) {
            cache[cacheKey] = {
                data: cards,
                timestamp: now
            }
        } else if (cached) {
            // If fetch failed deeply but we have old cache, return stale
            return NextResponse.json({
                updatedAt: cached.timestamp,
                stale: true,
                platform,
                cards: cached.data,
                error: errors.join(', ') || 'Unknown error'
            })
        }

        return NextResponse.json(response)

    } catch (error: any) {
        console.error('Live Preview API Error:', error)

        // Return stale cache if available on crash
        const cacheKey = `${platform}_${size}`
        const cached = cache[cacheKey]
        if (cached) {
            return NextResponse.json({
                updatedAt: cached.timestamp,
                stale: true,
                platform,
                cards: cached.data,
                error: error.message
            })
        }

        return NextResponse.json({
            updatedAt: Date.now(),
            stale: false,
            platform,
            cards: [],
            error: error.message
        }, { status: 500 })
    }
}

async function fetchChzzk(size: number): Promise<LiveCardData[]> {
    const clientId = process.env.CHZZK_CLIENT_ID
    const clientSecret = process.env.CHZZK_CLIENT_SECRET

    if (!clientId || !clientSecret) {
        // Fallback for development/demo without keys (Optional: throw error)
        console.warn('Missing CHZZK keys')
        return []
    }

    const res = await fetch(`https://openapi.chzzk.naver.com/open/v1/lives?size=${size}`, {
        headers: {
            'Client-Id': clientId,
            'Client-Secret': clientSecret,
            'Content-Type': 'application/json'
        },
        next: { revalidate: 0 }
    })

    if (!res.ok) {
        throw new Error(`Chzzk API Error: ${res.status}`)
    }

    const json = await res.json()
    // json.content.data or json.data check schema
    // Search result said: { data: [...] }
    const list = json.content?.data || json.data || []

    return list.map((item: any) => ({
        platform: 'chzzk',
        liveId: item.liveId?.toString(),
        channelId: item.channel?.channelId || item.channelId,
        channelName: item.channel?.channelName || item.channelName,
        title: item.liveTitle,
        thumb: item.liveThumbnailImageUrl?.replace('{type}', '480'), // common pattern
        viewers: item.concurrentUserCount,
        category: item.liveCategoryValue,
        startedAt: item.openDate,
        link: `https://chzzk.naver.com/live/${item.channel?.channelId || item.channelId}`
    }))
}

async function fetchSoop(size: number): Promise<LiveCardData[]> {
    const clientId = process.env.SOOP_CLIENT_ID
    if (!clientId) {
        console.warn('Missing SOOP keys')
        return []
    }

    const params = new URLSearchParams()
    params.set('client_id', clientId)
    params.set('order_type', 'view_cnt')
    params.set('page_no', '1')
    // SOOP might not have a clean 'size' param, it returns 60 by default?
    // We can slice later.

    const res = await fetch(`https://openapi.sooplive.co.kr/broad/list?${params.toString()}`, {
        headers: {
            'Accept': '*/*'
        },
        next: { revalidate: 0 }
    })

    if (!res.ok) {
        throw new Error(`SOOP API Error: ${res.status}`)
    }

    const json = await res.json()
    // { broad: [...] }
    const list = json.broad || []

    return list.slice(0, size).map((item: any) => ({
        platform: 'soop',
        liveId: item.broad_no?.toString(),
        channelId: item.user_id,
        channelName: item.user_nick,
        title: item.broad_title,
        thumb: item.broad_thumb?.startsWith('//') ? `https:${item.broad_thumb}` : item.broad_thumb,
        viewers: parseInt(item.total_view_cnt, 10),
        category: item.broad_cate_no?.toString(), // Or map ID to name if we had the list
        startedAt: item.broad_start,
        link: `https://play.sooplive.co.kr/${item.user_id}/${item.broad_no}`
    }))
}
