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

        // 1. Supabase DB에서 검색 (저장된 캐릭터는 항상 나옴)
        let dbQuery = supabase
            .from('characters')
            .select('character_id, name, server_id, class_name, race_name, level, combat_power, noa_score, item_level, profile_image, scraped_at')
            .ilike('name', `%${name}%`)
            .order('noa_score', { ascending: false, nullsFirst: false })
            .limit(50)  // DB에서 더 많이 가져옴

        if (serverId) {
            dbQuery = dbQuery.eq('server_id', serverId)
        }
        if (race) {
            const raceName = race === 1 || race === 'elyos' ? '천족' : race === 2 || race === 'asmodian' ? '마족' : null
            if (raceName) {
                dbQuery = dbQuery.eq('race_name', raceName)
            }
        }

        const { data: dbResults, error: dbError } = await dbQuery

        if (dbError) {
            console.error('[Live Search] DB error:', dbError)
        }

        console.log('[Live Search] DB results:', dbResults?.length || 0, 'items')

        // 캐시만 요청한 경우
        if (cacheOnly && dbResults && dbResults.length > 0) {
            return NextResponse.json({
                list: dbResults.map(transformCachedToApiFormat),
                pagination: { total: dbResults.length, page: 1 },
                source: 'db'
            })
        }

        // 2. 외부 API 호출 (새로운 캐릭터 발견용)
        let apiResults: any[] = []
        let apiTotal = 0

        try {
            const url = new URL('https://aion2.plaync.com/ko-kr/api/search/aion2/search/v2/character')
            url.searchParams.append('keyword', name)
            url.searchParams.append('page', (page || 1).toString())
            url.searchParams.append('size', '30')
            if (serverId) url.searchParams.append('serverId', serverId.toString())
            if (race) url.searchParams.append('race', race.toString())

            console.log('[Live Search] Fetching API:', url.toString())

            const response = await fetch(url.toString(), {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://aion2.plaync.com/',
                    'Accept': 'application/json'
                }
            })

            if (response.ok) {
                const data = await response.json()
                apiResults = data.list || []
                apiTotal = data.pagination?.total || 0
                console.log('[Live Search] API results:', apiResults.length, 'items, total:', apiTotal)

                // API 결과를 DB에 캐싱 (백그라운드)
                if (apiResults.length > 0) {
                    cacheSearchResults(supabase, apiResults).catch(err => {
                        console.error('[Live Search] Cache save error:', err)
                    })
                }
            } else {
                console.error('[Live Search] API failed:', response.status)
            }
        } catch (apiErr) {
            console.error('[Live Search] API error:', apiErr)
            // API 실패해도 DB 결과는 반환
        }

        // 3. DB 결과와 API 결과 병합 (중복 제거)
        const mergedMap = new Map<string, any>()

        // DB 결과 먼저 추가 (우선순위 높음 - 더 상세한 데이터)
        if (dbResults) {
            dbResults.forEach(item => {
                const key = item.character_id
                mergedMap.set(key, transformCachedToApiFormat(item))
            })
        }

        // API 결과 추가 (DB에 없는 것만)
        apiResults.forEach(item => {
            const key = item.characterId
            if (!mergedMap.has(key)) {
                mergedMap.set(key, item)
            }
        })

        // Map을 배열로 변환하고 noa_score/combatPower 기준 정렬
        const mergedList = Array.from(mergedMap.values())
            .sort((a, b) => {
                const scoreA = a.noaScore || a.combatPower || 0
                const scoreB = b.noaScore || b.combatPower || 0
                return scoreB - scoreA
            })
            .slice(0, 50)  // 최대 50개

        const totalCount = Math.max(mergedList.length, apiTotal, dbResults?.length || 0)

        console.log('[Live Search] Merged results:', mergedList.length, 'items (DB:', dbResults?.length || 0, '+ API:', apiResults.length, ')')

        return NextResponse.json({
            list: mergedList,
            pagination: { total: totalCount, page: page || 1 },
            source: 'merged',
            dbCount: dbResults?.length || 0,
            apiCount: apiResults.length
        })

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
        noaScore: cached.noa_score,  // HITON 전투력 추가
        itemLevel: cached.item_level,
        // DB에서 온 데이터 표시
        fromDb: true
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
