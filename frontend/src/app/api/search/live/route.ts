import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit'

// characterId 정규화 함수 (URL 인코딩 해제)
const normalizeCharacterId = (id: string): string => {
    if (!id) return id
    try {
        if (id.includes('%')) {
            return decodeURIComponent(id)
        }
        return id
    } catch {
        return id
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
    // Rate Limiting (외부 API 호출이므로 엄격하게)
    const rateLimit = checkRateLimit(request, RATE_LIMITS.external)
    if (!rateLimit.success) {
        return rateLimit.error!
    }

    try {
        const { name, serverId, race, page, cacheOnly, forceFresh } = await request.json()

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        // 에러/경고 메시지 추적
        let apiWarning: string | undefined = undefined

        // race를 숫자로 정규화
        let numericRace: number | undefined = undefined
        if (race === 1 || race === '1' || race === 'elyos' || race === 'ELYOS') {
            numericRace = 1
        } else if (race === 2 || race === '2' || race === 'asmodian' || race === 'ASMODIANS' || race === 'asmodians') {
            numericRace = 2
        }

        // 1. Supabase DB에서 검색 (정확히 일치하는 이름만)
        let dbQuery = supabase
            .from('characters')
            .select('character_id, name, server_id, class_name, race_name, level, combat_power, item_level, pve_score, pvp_score, profile_image, scraped_at')
            .eq('name', name)  // 정확히 일치하는 이름만 검색
            .order('level', { ascending: false })
            .limit(50)

        if (serverId) {
            dbQuery = dbQuery.eq('server_id', serverId)
        }
        if (numericRace) {
            // DB에 한국어('천족', '마족') 또는 영어('Elyos', 'Asmodian') 둘 다 저장될 수 있으므로 둘 다 검색
            const raceNames = numericRace === 1
                ? ['천족', 'Elyos', 'ELYOS', 'elyos']
                : ['마족', 'Asmodian', 'ASMODIAN', 'asmodian', 'ASMODIANS']
            dbQuery = dbQuery.in('race_name', raceNames)
        }

        const { data: dbResults, error: dbError } = await dbQuery

        if (dbError) {
            console.error('[Live Search] DB error:', dbError)
        }

        // 결과가 없고 서버 필터가 적용된 경우, 서버 필터 없이 재검색 시도
        let fallbackDbResults: typeof dbResults = null
        if ((!dbResults || dbResults.length === 0) && serverId) {
            const fallbackQuery = supabase
                .from('characters')
                .select('character_id, name, server_id, class_name, race_name, level, combat_power, item_level, pve_score, pvp_score, profile_image, scraped_at')
                .eq('name', name)
                .order('level', { ascending: false })
                .limit(10)

            const { data: fbResults, error: fbError } = await fallbackQuery
            if (fbResults && fbResults.length > 0) {
                fallbackDbResults = fbResults
            }
        }

        // 캐시만 요청한 경우 (forceFresh가 아닐 때만)
        if (cacheOnly && !forceFresh && dbResults && dbResults.length > 0) {
            return NextResponse.json({
                list: dbResults.map(transformCachedToApiFormat),
                pagination: { total: dbResults.length, page: 1 },
                source: 'db'
            })
        }

        // forceFresh 요청 시 DB 결과 무시하고 외부 API 우선
        const skipDbResults = forceFresh === true

        // 2. 외부 API 호출 (새로운 캐릭터 발견용)
        let apiResults: any[] = []
        let apiTotal = 0

        try {
            const url = new URL('https://aion2.plaync.com/ko-kr/api/search/aion2/search/v2/character')
            url.searchParams.append('keyword', name)
            url.searchParams.append('page', (page || 1).toString())
            url.searchParams.append('size', '30')
            if (serverId) url.searchParams.append('serverId', serverId.toString())
            if (numericRace) url.searchParams.append('race', numericRace.toString())

            // 5초 타임아웃 설정
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 5000)

            try {
                const response = await fetch(url.toString(), {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Referer': 'https://aion2.plaync.com/',
                        'Accept': 'application/json'
                    },
                    signal: controller.signal
                })

                clearTimeout(timeoutId)

                if (response.ok) {
                    const data = await response.json()
                    apiResults = data.list || []
                    apiTotal = data.pagination?.total || 0

                    // API 결과를 DB에 캐싱 (백그라운드)
                    if (apiResults.length > 0) {
                        const collectionPromise = cacheSearchResults(supabase, apiResults)
                        const logPromise = logCollection(supabase, name, serverId, apiResults.length)

                        // 둘 다 기다리지 않고 백그라운드 처리
                        Promise.all([collectionPromise, logPromise]).catch(err => {
                            console.error('[Live Search] Background task error:', err)
                        })
                    }
                } else {
                    console.error('[Live Search] API failed:', response.status)
                    apiWarning = `외부 검색 오류 (${response.status})`
                    // 에러 로그 저장
                    logCollection(supabase, name, serverId, 0, `(Error ${response.status})`).catch(e => console.error(e))
                }
            } catch (fetchErr: any) {
                clearTimeout(timeoutId)
                if (fetchErr.name === 'AbortError') {
                    console.error('[Live Search] API timeout (5s)')
                    apiWarning = '검색 시간 초과 (5초)'
                } else {
                    throw fetchErr
                }
            }
        } catch (apiErr) {
            console.error('[Live Search] API error:', apiErr)
            apiWarning = '외부 검색 연결 실패'
            // API 실패해도 DB 결과는 반환
        }

        // 3. DB 결과와 API 결과 병합 (중복 제거)
        const mergedMap = new Map<string, any>()

        // 키 정규화 함수 (URL 인코딩 차이 해결)
        const normalizeKey = (key: string) => {
            try {
                return decodeURIComponent(key)
            } catch {
                return key
            }
        }

        // DB 결과 먼저 추가 (우선순위 높음 - 더 상세한 데이터)
        // forceFresh 모드에서는 DB 결과를 나중에 추가 (API 결과 우선)
        // 결과가 없으면 fallback 결과 사용
        const effectiveDbResults = (dbResults && dbResults.length > 0) ? dbResults : fallbackDbResults
        if (!skipDbResults && effectiveDbResults) {
            effectiveDbResults.forEach(item => {
                const key = normalizeKey(item.character_id)
                mergedMap.set(key, transformCachedToApiFormat(item))
            })
        }

        // pcId를 직업명으로 변환하는 맵
        const pcIdToClassName: Record<number, string> = {
            6: '검성', 7: '검성', 8: '검성', 9: '검성',
            10: '수호성', 11: '수호성', 12: '수호성', 13: '수호성',
            14: '궁성', 15: '궁성', 16: '궁성', 17: '궁성',
            18: '살성', 19: '살성', 20: '살성', 21: '살성',
            22: '정령성', 23: '정령성', 24: '정령성', 25: '정령성',
            26: '마도성', 27: '마도성', 28: '마도성', 29: '마도성',
            30: '치유성', 31: '치유성', 32: '치유성', 33: '치유성',
            34: '호법성', 35: '호법성', 36: '호법성', 37: '호법성'
        }

        // API 결과 필터링: 정확히 일치하는 이름만 (HTML 태그 제거 후 비교)
        const cleanName = (n: string) => n?.replace(/<[^>]*>/g, '').trim()
        const filteredApiResults = apiResults.filter(item => {
            const itemName = cleanName(item.name)
            return itemName === name
        })

        // API 결과 추가 (DB에 없는 것만, forceFresh면 항상 추가)
        filteredApiResults.forEach(item => {
            const key = normalizeKey(item.characterId)
            if (!mergedMap.has(key) || skipDbResults) {
                mergedMap.set(key, {
                    ...item,
                    name: cleanName(item.name),  // HTML 태그 제거
                    // className 결정: className > jobName > pcId 매핑 순서
                    className: item.className || item.jobName || pcIdToClassName[item.pcId] || null
                })
            }
        })

        // forceFresh 모드: DB 결과를 API 결과 뒤에 추가 (API에 없는 것만)
        if (skipDbResults && effectiveDbResults) {
            effectiveDbResults.forEach(item => {
                const key = normalizeKey(item.character_id)
                if (!mergedMap.has(key)) {
                    mergedMap.set(key, transformCachedToApiFormat(item))
                }
            })
        }

        // Map을 배열로 변환하고 레벨/combatPower 기준 정렬
        const mergedList = Array.from(mergedMap.values())
            .sort((a, b) => {
                const scoreA = a.combatPower || a.level || 0
                const scoreB = b.combatPower || b.level || 0
                return scoreB - scoreA
            })
            .slice(0, 50)  // 최대 50개

        const totalCount = Math.max(mergedList.length, apiTotal, effectiveDbResults?.length || 0)

        return NextResponse.json({
            list: mergedList,
            pagination: { total: totalCount, page: page || 1 },
            source: skipDbResults ? 'fresh' : 'merged',
            dbCount: effectiveDbResults?.length || 0,
            apiCount: filteredApiResults.length,
            warning: apiWarning
        })

    } catch (error) {
        console.error('Proxy Search Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// 캐시된 데이터를 API 형식으로 변환
function transformCachedToApiFormat(cached: any) {
    const serverIdToName: Record<number, string> = {
        1001: '시엘', 1002: '네자칸', 1003: '바이젤', 1004: '카이시넬',
        1005: '유스티엘', 1006: '아리엘', 1007: '프레기온', 1008: '메스람타에다',
        1009: '히타니에', 1010: '나니아', 1011: '타하바타', 1012: '루터스',
        1013: '페르노스', 1014: '다미누', 1015: '카사카', 1016: '바카르마',
        1017: '챈가룽', 1018: '코치룽', 1019: '이슈타르', 1020: '티아마트',
        1021: '포에타', 2001: '이스라펠', 2002: '지켈', 2003: '트리니엘',
        2004: '루미엘', 2005: '마르쿠탄', 2006: '아스펠', 2007: '에레슈키갈',
        2008: '브리트라', 2009: '네몬', 2010: '하달', 2011: '루드라',
        2012: '울고른', 2013: '무닌', 2014: '오다르', 2015: '젠카카',
        2016: '크로메데', 2017: '콰이링', 2018: '바바룽', 2019: '파프니르',
        2020: '인드나흐', 2021: '이스할겐'
    }

    return {
        characterId: cached.character_id,
        name: cached.name,
        serverId: cached.server_id,
        serverName: serverIdToName[cached.server_id] || `서버${cached.server_id}`,
        className: cached.class_name,
        pcId: cached.pc_id,
        raceName: cached.race_name,
        race: cached.race_name === '천족' ? 1 : 2,
        level: cached.level,
        profileImageUrl: cached.profile_image,
        // 추가 정보
        combatPower: cached.combat_power,
        itemLevel: cached.item_level,
        // 프론트엔드 호환성을 위한 snake_case 필드 추가
        item_level: cached.item_level,
        pve_score: cached.pve_score,
        // PVE/PVP 전투력 (DB에 저장된 값)
        pve_score: cached.pve_score,
        pvp_score: cached.pvp_score,
        // DB에서 온 데이터 표시
        fromDb: true
    }
}

// 검색 결과를 Supabase에 캐싱 (기존 item_level, pve_score 보존)
async function cacheSearchResults(supabase: any, results: any[]) {
    if (results.length === 0) return

    // 먼저 기존 DB 데이터 조회 (item_level, pve_score 보존용)
    // characterId 정규화하여 일관성 유지
    const characterIds = results.map(item => normalizeCharacterId(item.characterId))

    const { data: existingData } = await supabase
        .from('characters')
        .select('character_id, item_level, pve_score')
        .in('character_id', characterIds)

    // DB의 character_id도 정규화하여 매핑
    const existingMap = new Map<string, { character_id: string; item_level: number | null; pve_score: number | null }>(
        existingData?.map((d: any) => [normalizeCharacterId(d.character_id), d]) || []
    )

    const charactersToUpsert = results.map(item => {
        const normalizedId = normalizeCharacterId(item.characterId)
        const existing = existingMap.get(normalizedId)
        return {
            character_id: normalizedId,
            name: item.name?.replace(/<[^>]*>/g, '') || item.name,
            server_id: item.serverId,
            class_name: item.className || item.jobName,
            race_name: item.raceName || (item.race === 1 ? '천족' : '마족'),
            level: item.level,
            profile_image: item.profileImageUrl?.startsWith('http')
                ? item.profileImageUrl
                : item.profileImageUrl ? `https://profileimg.plaync.com${item.profileImageUrl}` : null,
            // 기존 item_level, pve_score 보존 (있으면 유지, 없으면 null)
            item_level: existing?.item_level ?? null,
            pve_score: existing?.pve_score ?? null,
            scraped_at: new Date().toISOString()
        }
    })

    const { error } = await supabase
        .from('characters')
        .upsert(charactersToUpsert, {
            onConflict: 'character_id',
            ignoreDuplicates: false
        })

    if (error) {
        console.error('[Cache] Upsert error:', error)
    } else {
        console.log('[Cache] Saved', charactersToUpsert.length, 'characters (preserved existing stats)')
    }

    // 전투력 없는 캐릭터 백그라운드 동기화 트리거
    const needsSync = results.filter(r => {
        const existing = existingMap.get(normalizeCharacterId(r.characterId))
        return !existing || existing.pve_score === null || existing.pve_score === undefined
    })

    if (needsSync.length > 0) {
        triggerBackgroundSync(needsSync.slice(0, 3)).catch(err => {
            console.error('[Background Sync] Trigger error:', err)
        })
    }
}

// 백그라운드 상세 동기화 (전투력 없는 캐릭터 자동 수집)
async function triggerBackgroundSync(results: any[]) {
    if (results.length === 0) return

    const characters = results.map(r => ({
        characterId: normalizeCharacterId(r.characterId),
        name: r.name?.replace(/<[^>]*>/g, '') || r.name,
        server_id: r.serverId,
        level: r.level,
        job: r.className || r.jobName,
        race: r.raceName || (r.race === 1 ? '천족' : '마족'),
        imageUrl: r.profileImageUrl
    }))

    console.log('[Background Sync] Triggering sync for', characters.length, 'characters')

    try {
        // 내부 API 호출로 상세 정보 동기화
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'http://localhost:3000'

        await fetch(`${baseUrl}/api/search/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ characters })
        })
    } catch (e) {
        console.error('[Background Sync] Failed:', e)
    }
}

async function logCollection(supabase: any, keyword: string, serverId: number | undefined, count: number, errorMsg?: string) {
    const serverIdToName: Record<number, string> = {
        1001: '시엘', 1002: '네자칸', 1003: '바이젤', 1004: '카이시넬',
        1005: '유스티엘', 1006: '아리엘', 1007: '프레기온', 1008: '메스람타에다',
        1009: '히타니에', 1010: '나니아', 1011: '타하바타', 1012: '루터스',
        1013: '페르노스', 1014: '다미누', 1015: '카사카', 1016: '바카르마',
        1017: '챈가룽', 1018: '코치룽', 1019: '이슈타르', 1020: '티아마트',
        1021: '포에타', 2001: '이스라펠', 2002: '지켈', 2003: '트리니엘',
        2004: '루미엘', 2005: '마르쿠탄', 2006: '아스펠', 2007: '에레슈키갈',
        2008: '브리트라', 2009: '네몬', 2010: '하달', 2011: '루드라',
        2012: '울고른', 2013: '무닌', 2014: '오다르', 2015: '젠카카',
        2016: '크로메데', 2017: '콰이링', 2018: '바바룽', 2019: '파프니르',
        2020: '인드나흐', 2021: '이스할겐'
    }

    const serverName = serverId ? (serverIdToName[serverId] || `서버${serverId}`) : '전체'

    try {
        await supabase.from('collector_logs').insert({
            server_name: serverName,
            keyword: errorMsg ? `${keyword} ${errorMsg}` : keyword,
            collected_count: count,
            type: 'user'
        })
    } catch (err) {
        console.error('[Log Error]', err)
    }
}
