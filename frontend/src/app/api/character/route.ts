import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { CLASSES } from '../../constants/game-data'
import { aggregateStats } from '@/lib/statsAggregator'
import { calculateDualCombatPowerFromStats } from '@/lib/combatPower'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit'
import type {
    ExternalDetailResponse,
    TransformedItemDetail,
    StatListItem,
    EquipmentItem,
    CharacterStats
} from '@/types/api'

/**
 * Transform detail data from AION2 API to standardized format
 * Actual API response structure: { mainStats, subStats, magicStoneStat, godStoneStat, sources }
 */
function transformDetailData(detailData: ExternalDetailResponse | null): TransformedItemDetail | null {
    if (!detailData) return null

    const result: TransformedItemDetail = {
        options: [],
        randomOptions: [],
        manastones: [],
        godstones: [],
        arcanas: [],
        setEffects: [],
        source: null,
        _raw: detailData
    }

    // 1. Main Stats (기본 옵션) - 공격력, 명중, 치명타 등
    if (detailData.mainStats && Array.isArray(detailData.mainStats)) {
        result.options = detailData.mainStats.map((stat) => ({
            name: stat.name,
            value: stat.value + (stat.extra && stat.extra !== '0' ? ` (+${stat.extra})` : '')
        }))
    }

    // 2. Sub Stats (랜덤 옵션) - 전투 속도, 무기 피해 증폭 등
    if (detailData.subStats && Array.isArray(detailData.subStats)) {
        result.randomOptions = detailData.subStats.map((stat) => ({
            name: stat.name,
            value: stat.value
        }))
    }

    // 3. Magic Stones (마석) - API returns name field, not type
    if (detailData.magicStoneStat && Array.isArray(detailData.magicStoneStat)) {
        result.manastones = detailData.magicStoneStat.map((stone: any) => ({
            type: stone.name || stone.type || '',  // API uses 'name' not 'type'
            value: stone.value,
            grade: stone.grade
        }))
    }

    // 4. God Stones (신석)
    if (detailData.godStoneStat && Array.isArray(detailData.godStoneStat)) {
        result.godstones = detailData.godStoneStat.map((stone) => ({
            name: stone.name,
            desc: stone.desc,
            grade: stone.grade,
            icon: stone.icon
        }))
    }

    // 5. Arcanas (아르카나) - subSkills에서 가져옴
    if (detailData.subSkills && Array.isArray(detailData.subSkills)) {
        result.arcanas = detailData.subSkills.map((skill) => ({
            id: skill.id,
            name: skill.name,
            level: skill.level,
            icon: skill.icon
        }))
    }

    // Also check arcanaStat (for equipment with arcana stones)
    if (detailData.arcanaStat && Array.isArray(detailData.arcanaStat)) {
        result.arcanas.push(...detailData.arcanaStat.map((arcana) => ({
            name: arcana.name,
            desc: arcana.desc,
            grade: arcana.grade,
            icon: arcana.icon,
            value: arcana.value
        })))
    }

    // 6. Sources (획득처)
    if (detailData.sources && Array.isArray(detailData.sources)) {
        result.source = detailData.sources.join(', ')
    }

    // 7. Set Effects (세트 효과)
    if (detailData.set && detailData.set.bonuses) {
        result.setEffects = [{
            name: detailData.set.name || '세트 효과',
            equippedCount: detailData.set.equippedCount,
            bonuses: detailData.set.bonuses,
            items: detailData.set.items
        }]
    } else if (detailData.setEffects && Array.isArray(detailData.setEffects)) {
        result.setEffects = detailData.setEffects
    }

    return result
}

// OCR 스탯을 API 스탯에 머지하는 함수
function mergeOcrStats(
    statList: StatListItem[],
    ocrStats: { name: string; value: string; isPercentage?: boolean }[]
): StatListItem[] {
    if (!ocrStats || ocrStats.length === 0) return statList

    const ocrMap = new Map(ocrStats.map(s => [s.name, s.value]))

    return statList.map(stat => {
        const ocrValue = ocrMap.get(stat.name)
        if (ocrValue !== undefined) {
            // OCR 값으로 대체 (숫자로 파싱)
            const numericValue = parseFloat(ocrValue.replace(/[,%]/g, ''))
            return {
                ...stat,
                value: isNaN(numericValue) ? stat.value : numericValue,
                isOcr: true
            }
        }
        return stat
    })
}

export async function GET(request: NextRequest) {
    // Rate Limiting (외부 API 호출이므로 엄격하게)
    const rateLimit = checkRateLimit(request, RATE_LIMITS.external)
    if (!rateLimit.success) {
        return rateLimit.error!
    }

    const searchParams = request.nextUrl.searchParams
    const characterId = searchParams.get('id')
    const serverId = searchParams.get('server')
    const forceUpdate = searchParams.get('force') === 'true'

    if (!characterId || !serverId) {
        return NextResponse.json({ error: 'Missing characterId or serverId' }, { status: 400 })
    }

    // characterId 정규화: URL 인코딩된 값이 들어올 수 있으므로 디코딩
    let normalizedCharacterId: string
    try {
        if (characterId.includes('%')) {
            normalizedCharacterId = decodeURIComponent(characterId)
        } else {
            normalizedCharacterId = characterId
        }
    } catch {
        normalizedCharacterId = characterId
    }

    try {
        console.log(`[API] Fetching data for characterId=${characterId}, normalized=${normalizedCharacterId}, serverId=${serverId}, force=${forceUpdate}`)

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // 0. Cache Check (If not forced)
        // 정규화된 ID로 조회 (인코딩된 버전과 디코딩된 버전 모두 시도)
        if (!forceUpdate) {
            let cachedData = null
            let cacheError = null

            // 먼저 정규화된 ID로 시도
            const { data: data1, error: err1 } = await supabase
                .from('characters')
                .select('*')
                .eq('character_id', normalizedCharacterId)
                .single()

            if (data1 && !err1) {
                cachedData = data1
            } else if (characterId !== normalizedCharacterId) {
                // 원본 ID로도 시도 (레거시 데이터 호환)
                const { data: data2, error: err2 } = await supabase
                    .from('characters')
                    .select('*')
                    .eq('character_id', characterId)
                    .single()
                if (data2 && !err2) {
                    cachedData = data2
                    cacheError = err2
                }
            }

            if (cachedData && !cacheError) {
                const scrapedAt = new Date(cachedData.scraped_at).getTime()
                const now = Date.now()
                // Cache duration: 60 minutes
                const isFresh = (now - scrapedAt) < 60 * 60 * 1000

                // 캐시된 데이터에 profile이 없으면 캐시 미스로 처리
                if (!cachedData.profile || !cachedData.profile.characterId) {
                    console.log(`[API] Cache INVALID for ${characterId} - missing profile data. Fetching fresh...`)
                    // Continue to fetch fresh data below
                } else if (isFresh) {
                    console.log(`[API] Returning CACHED data for ${characterId} (Age: ${Math.floor((now - scrapedAt) / 60000)}m)`)

                    // Transform DB structure back to API response structure
                    // The frontend expects: { profile, stats, titles, rankings, daevanion, equipment, skill, petwing, scraped_at }
                    // Our DB stores these JSONBs directly, so we can just return them.
                    const responseData: any = {
                        profile: {
                            ...cachedData.profile,
                            pve_score: cachedData.pve_score || cachedData.noa_score,
                            pvp_score: cachedData.pvp_score || 0,
                            noa_score: cachedData.noa_score // 호환성 유지
                        },
                        stats: cachedData.stats,
                        titles: cachedData.titles,
                        rankings: cachedData.rankings,
                        daevanion: cachedData.daevanion,
                        equipment: cachedData.equipment,
                        skill: cachedData.skills, // DB column is 'skills', API expects 'skill'
                        petwing: cachedData.pet_wing, // DB column is 'pet_wing', API expects 'petwing'
                        scraped_at: cachedData.scraped_at,
                        cached: true
                    }

                    // OCR 스탯 조회 및 머지 (정규화된 ID로 조회)
                    try {
                        const { data: ocrData } = await supabase
                            .from('character_ocr_stats')
                            .select('stats, updated_at')
                            .eq('character_id', normalizedCharacterId)
                            .order('updated_at', { ascending: false })
                            .limit(1)
                            .single()

                        if (ocrData?.stats && responseData.stats?.statList) {
                            responseData.stats.statList = mergeOcrStats(responseData.stats.statList, ocrData.stats)
                            responseData.ocrUpdatedAt = ocrData.updated_at
                            console.log(`[API] OCR stats merged for ${characterId}`)
                        }
                    } catch (ocrErr) {
                        // OCR 데이터가 없으면 무시 (정상)
                    }

                    return NextResponse.json(responseData)
                } else {
                    console.log(`[API] Cache EXPIRED for ${characterId} (Age: ${Math.floor((now - scrapedAt) / 60000)}m). Fetching fresh...`)
                }
            }
        }


        // Common headers to look like a browser
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://aion2.plaync.com/',
            'Accept': 'application/json'
        }

        // characterId가 이미 인코딩되어 있는지 확인 (% 문자 포함 여부)
        const needsEncoding = !characterId.includes('%')
        const encodedCharId = needsEncoding ? encodeURIComponent(characterId) : characterId
        console.log(`[API] needsEncoding=${needsEncoding}, encodedCharId=${encodedCharId}`)

        // 1. Fetch Basic Info & Equipment List in Parallel
        const infoUrl = `https://aion2.plaync.com/api/character/info?lang=ko&characterId=${encodedCharId}&serverId=${serverId}`
        const equipUrl = `https://aion2.plaync.com/api/character/equipment?lang=ko&characterId=${encodedCharId}&serverId=${serverId}`

        console.log(`[API] infoUrl=${infoUrl}`)

        const [infoRes, equipRes] = await Promise.all([
            fetch(infoUrl, { headers }),
            fetch(equipUrl, { headers })
        ])

        if (!infoRes.ok || !equipRes.ok) {
            const infoText = await infoRes.text().catch(() => '')
            // const equipText = await equipRes.text().catch(() => '') // equipment 200일 수 있으나 info 실패면 의미 없음
            console.warn(`[API] Basic fetch failed for ${encodedCharId}. Info: ${infoRes.status}, Equip: ${equipRes.status}`)
            // 500 에러를 throw하면 터미널이 시끄러우므로 404 반환
            return NextResponse.json({ error: 'Character data not found or API error' }, { status: 404 })
        }

        const infoData = await infoRes.json()
        const equipData = await equipRes.json()

        // Extract Combat Power from statList (공식 API는 stat.statList 배열 안에 전투력 정보를 담고 있음)
        const statList: StatListItem[] = infoData.stat?.statList || []
        const cpStat = statList.find((s) => s.name === '전투력')
        const combatPower = cpStat?.value || 0
        // console.log(`[API] Combat Power for ${infoData.profile.characterName}: ${combatPower}`)

        // 2. Fetch Detailed Info for EACH item in parallel
        let enrichedEquipmentList: EquipmentItem[] = []

        if (equipData.equipment && equipData.equipment.equipmentList) {
            // Check if equipment data already contains detailed info
            const firstItem = equipData.equipment.equipmentList[0]
            if (firstItem) {
                // console.log('[API] Available fields in item:', Object.keys(firstItem))
            }

            // Fetch detail for each item using the correct /item endpoint
            const equipmentList = equipData.equipment.equipmentList as EquipmentItem[]
            // console.log(`[API] Fetching details for ${equipmentList.length} items using /item endpoint...`)

            enrichedEquipmentList = await Promise.all(
                equipmentList.map(async (item) => {
                    try {
                        // Use the correct endpoint: /api/character/equipment/item
                        const itemId = item.id || item.itemId
                        if (!itemId) {
                            console.warn('[API] Item ID missing for slot', item.slotPos)
                            return { ...item, detail: null }
                        }

                        // Correct endpoint and parameters (exceedLevel 추가!)
                        const detailUrl = `https://aion2.plaync.com/api/character/equipment/item?id=${encodeURIComponent(itemId)}&enchantLevel=${item.enchantLevel || 0}&exceedLevel=${item.exceedLevel || 0}&characterId=${encodedCharId}&serverId=${serverId}&slotPos=${item.slotPos}&lang=ko`

                        const detailRes = await fetch(detailUrl, { headers })

                        if (!detailRes.ok) {
                            console.warn(`[API] Detail fetch failed for item ${itemId}: ${detailRes.status}`)
                            return { ...item, detail: null }
                        }

                        const detailData: ExternalDetailResponse = await detailRes.json()

                        // Transform detail to standardized format
                        const transformedDetail = transformDetailData(detailData)

                        return { ...item, detail: transformedDetail }
                    } catch (e) {
                        console.error(`[API] Error fetching detail for item ${item.id}:`, e)
                        return { ...item, detail: null }
                    }
                })
            )
        }

        // Calculate NOA Score (HITON 전투력) - 새로운 방식: aggregateStats + calculateCombatPowerFromStats
        // 장비, 칭호, 대바니온, 스탯 집계 후 전투력 계산
        const titles = infoData.title || { titleList: [] }
        const daevanion = infoData.daevanion || { boardList: [] }
        const equippedTitleId = infoData.profile?.titleId

        // 전투력 계산에서 제외할 아이템 필터링 - 클라이언트와 동일한 계산 방식
        // - 아르카나: slotPos 41-45 또는 slotPosName이 'Arcana'로 시작
        // - 펫: slotPos 51
        // - 날개: slotPos 52
        const equipmentForCalc = enrichedEquipmentList.filter((item: any) => {
            const pos = item.slotPos
            const slotName = item.slotPosName || ''
            const isArcana = (pos >= 41 && pos <= 45) || slotName.startsWith('Arcana')
            const isPet = pos === 51
            const isWings = pos === 52
            return !isArcana && !isPet && !isWings
        })

        // 스탯 집계
        const aggregatedStats = aggregateStats(equipmentForCalc, titles, daevanion, infoData.stat, equippedTitleId)

        // PVE/PVP 전투력 계산
        const dualCombatPower = calculateDualCombatPowerFromStats(aggregatedStats, infoData.stat)
        const pveScore = dualCombatPower.pve
        const pvpScore = dualCombatPower.pvp

        // 3. Construct Final Response
        const finalData = {
            profile: {
                ...infoData.profile,
                pve_score: pveScore,
                pvp_score: pvpScore,
                noa_score: pveScore // 호환성 유지
            },
            stats: infoData.stat,
            titles: infoData.title,
            rankings: infoData.ranking,
            daevanion: infoData.daevanion,
            equipment: {
                ...equipData.equipment,
                equipmentList: enrichedEquipmentList
            },
            skill: equipData.skill,
            petwing: equipData.petwing,
            scraped_at: new Date().toISOString()
        }

        // 4. DB Upsert (Synchronizing with Supabase)
        if (supabaseUrl && supabaseKey) {
            // supabase client is already created at the top


            const dbCharacter = {
                character_id: infoData.profile.characterId,
                server_id: parseInt(infoData.profile.serverId || '0'),
                name: infoData.profile.characterName,
                level: infoData.profile.characterLevel,
                class_name: (() => {
                    const rawClass = infoData.profile.className;
                    // Check if it's already Korean (simple check)
                    if (/[가-힣]/.test(rawClass)) return rawClass;

                    // Try to find by English ID (e.g. 'Gladiator' -> '검성')
                    const matched = CLASSES.find(c => c.id === rawClass);
                    if (matched) return matched.name;

                    // Try by pcId if available
                    if (infoData.profile.pcId) {
                        const byId = CLASSES.find(c => c.pcId === infoData.profile.pcId);
                        if (byId) return byId.name;
                    }

                    return rawClass; // Fallback to raw if logic fails
                })(),
                race_name: infoData.profile.raceName,
                combat_power: combatPower, // Extract from statList
                noa_score: pveScore, // 호환성 유지
                pve_score: pveScore,
                pvp_score: pvpScore,
                item_level: (() => {
                    // stats.statList에서 아이템레벨 찾기
                    const itemStatList: StatListItem[] = infoData.stat?.statList || []
                    const itemLevelStat = itemStatList.find((s) =>
                        s.name === '아이템레벨' || s.type === 'ItemLevel'
                    )
                    // nullish coalescing: 값이 없으면 null, 0이면 0 반환
                    return itemLevelStat?.value ?? null
                })(),
                ranking_ap: 0, // Placeholder, need to map from infoData if available
                ranking_gp: 0, // Placeholder
                profile_image: infoData.profile.profileImage,

                profile: infoData.profile,
                stats: infoData.stat,
                titles: infoData.title,
                rankings: infoData.ranking,
                daevanion: infoData.daevanion,
                equipment: finalData.equipment,
                skills: equipData.skill,
                pet_wing: equipData.petwing,

                scraped_at: new Date().toISOString()
            }

            const { error: upsertError } = await supabase
                .from('characters')
                .upsert(dbCharacter, { onConflict: 'character_id' })

            if (upsertError) {
                console.error('[Supabase] Upsert error:', upsertError)
            } else {
                // 상세 수집 로그 저장 (유저가 "캐릭터수집"이라고 부르는 활동)
                try {
                    await supabase.from('collector_logs').insert({
                        server_name: infoData.profile.serverName || serverId,
                        keyword: `${infoData.profile.characterName}`,
                        collected_count: 1,
                        type: 'detail'
                    })
                } catch (logErr) {
                    console.error('[Log Error]', logErr)
                }
            }
        } else {
            // console.warn('[Supabase] Credentials missing, skipping DB save')
        }

        // OCR 스탯 조회 및 머지 (신규 데이터에도 적용, 정규화된 ID 사용)
        if (supabaseUrl && supabaseKey) {
            try {
                const { data: ocrData } = await supabase
                    .from('character_ocr_stats')
                    .select('stats, updated_at')
                    .eq('character_id', normalizedCharacterId)
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .single()

                if (ocrData?.stats && finalData.stats?.statList) {
                    finalData.stats.statList = mergeOcrStats(finalData.stats.statList, ocrData.stats)
                    ;(finalData as any).ocrUpdatedAt = ocrData.updated_at
                    console.log(`[API] OCR stats merged for fresh data ${characterId}`)
                }
            } catch (ocrErr) {
                // OCR 데이터가 없으면 무시 (정상)
            }
        }

        return NextResponse.json(finalData)

    } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        console.error('[API Error]', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
