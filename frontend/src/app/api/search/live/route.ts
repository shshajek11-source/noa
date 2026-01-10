import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
    // Rate Limiting (외부 API 호출이므로 엄격하게)
    const rateLimit = checkRateLimit(request, RATE_LIMITS.external)
    if (!rateLimit.success) {
        return rateLimit.error!
    }

    try {
        const { name, serverId, race, page, cacheOnly } = await request.json()

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        // 1. 먼저 Supabase 캐시에서 검색 (빠름)
        let query = supabase
            .from('characters')
            .select('character_id, name, server_id, class_name, race_name, level, combat_power, item_level, profile_image, scraped_at')
            .ilike('name', `%${name}%`)
            .limit(30)

        if (serverId) {
            query = query.eq('server_id', serverId)
        }
        if (race) {
            const raceName = race === 1 || race === 'elyos' ? '천족' : race === 2 || race === 'asmodian' ? '마족' : null
            if (raceName) {
                query = query.eq('race_name', raceName)
            }
        }

        const { data: cachedResults, error: cacheError } = await query

        // 캐시에 결과가 있고, 최근 데이터인 경우 (24시간 이내) 캐시만 반환
        const freshCacheThreshold = 24 * 60 * 60 * 1000 // 24시간
        const hasFreshCache = cachedResults && cachedResults.length > 0 && cachedResults.some(r => {
            const scrapedAt = r.scraped_at ? new Date(r.scraped_at).getTime() : 0
            return Date.now() - scrapedAt < freshCacheThreshold
        })

        if (cacheOnly && cachedResults && cachedResults.length > 0) {
            console.log('[Live Search] Cache hit:', cachedResults.length, 'items')
            return NextResponse.json({
                list: cachedResults.map(transformCachedToApiFormat),
                pagination: { total: cachedResults.length, page: 1 },
                source: 'cache'
            })
        }

        // 2. 외부 API 호출 (신선한 데이터)
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
            // 외부 API 실패 시 캐시 결과라도 반환
            if (cachedResults && cachedResults.length > 0) {
                console.log('[Live Search] API failed, returning cache:', cachedResults.length, 'items')
                return NextResponse.json({
                    list: cachedResults.map(transformCachedToApiFormat),
                    pagination: { total: cachedResults.length, page: 1 },
                    source: 'cache_fallback'
                })
            }
            const errorText = await response.text()
            console.error('[Live Search] AION API error:', response.status, errorText)
            throw new Error(`AION API returned ${response.status}`)
        }

        const data = await response.json()
        console.log('[Live Search] Results:', data.list?.length || 0, 'items, total:', data.pagination?.total)

        // 3. 검색 결과를 Supabase에 캐싱 (백그라운드)
        if (data.list && data.list.length > 0) {
            cacheSearchResults(supabase, data.list).catch(err => {
                console.error('[Live Search] Cache save error:', err)
            })
        }

        return NextResponse.json({ ...data, source: 'api' })

    } catch (error) {
        console.error('Proxy Search Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// 캐시된 데이터를 API 형식으로 변환
function transformCachedToApiFormat(cached: any) {
    const serverIdToName: Record<number, string> = {
        1001: '아트레이아', 1002: '시엘', 1003: '이스라펠', 1004: '유스티엘',
        1005: '지페르', 1006: '카이시넬', 1007: '네자칸', 1008: '루미엘',
        1009: '마르쿠탄', 1010: '트리니엘', 1011: '아리엘', 1012: '아자투란',
        1017: '에레슈키갈', 2001: '아폴론', 2002: '지켈'
    }

    return {
        characterId: cached.character_id,
        name: cached.name,
        serverId: cached.server_id,
        serverName: serverIdToName[cached.server_id] || `서버${cached.server_id}`,
        className: cached.class_name,
        raceName: cached.race_name,
        race: cached.race_name === '천족' ? 1 : 2,
        level: cached.level,
        profileImageUrl: cached.profile_image,
        // 추가 정보
        combatPower: cached.combat_power,
        itemLevel: cached.item_level
    }
}

// 검색 결과를 Supabase에 캐싱
async function cacheSearchResults(supabase: any, results: any[]) {
    const serverIdToName: Record<number, string> = {
        1001: '아트레이아', 1002: '시엘', 1003: '이스라펠', 1004: '유스티엘',
        1005: '지페르', 1006: '카이시넬', 1007: '네자칸', 1008: '루미엘',
        1009: '마르쿠탄', 1010: '트리니엘', 1011: '아리엘', 1012: '아자투란',
        1017: '에레슈키갈', 2001: '아폴론', 2002: '지켈'
    }

    const charactersToUpsert = results.map(item => ({
        character_id: item.characterId,
        name: item.name?.replace(/<[^>]*>/g, '') || item.name, // HTML 태그 제거
        server_id: item.serverId,
        server_name: serverIdToName[item.serverId] || item.serverName,
        class_name: item.className || item.jobName,
        race_name: item.raceName || (item.race === 1 ? '천족' : '마족'),
        level: item.level,
        profile_image: item.profileImageUrl?.startsWith('http')
            ? item.profileImageUrl
            : item.profileImageUrl ? `https://profileimg.plaync.com${item.profileImageUrl}` : null,
        scraped_at: new Date().toISOString()
    }))

    // character_id 기준으로 upsert (기존 데이터는 업데이트, 새 데이터는 삽입)
    const { error } = await supabase
        .from('characters')
        .upsert(charactersToUpsert, {
            onConflict: 'character_id',
            ignoreDuplicates: false
        })

    if (error) {
        console.error('[Cache] Upsert error:', error)
    } else {
        console.log('[Cache] Saved', charactersToUpsert.length, 'characters')
    }
}
