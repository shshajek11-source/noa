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

                // 캐시된 데이터에 필수 필드가 없으면 캐시 미스로 처리
                // v2.2: stats, equipment도 필수로 체크 (NULL이면 다시 조회)
                const isCacheValid = cachedData.profile &&
                    cachedData.profile.characterId &&
                    cachedData.stats &&
                    cachedData.equipment

                if (!isCacheValid) {
                    const missing = []
                    if (!cachedData.profile) missing.push('profile')
                    if (!cachedData.stats) missing.push('stats')
                    if (!cachedData.equipment) missing.push('equipment')
                    console.log(`[API] Cache INVALID for ${characterId} - missing: ${missing.join(', ')}. Fetching fresh...`)
                    // Continue to fetch fresh data below
                } else if (isFresh) {
                    // OCR 데이터가 캐시보다 최신인지 먼저 확인
                    let ocrIsNewer = false
                    try {
                        const { data: ocrCheck } = await supabase
                            .from('character_ocr_stats')
                            .select('updated_at')
                            .eq('character_id', normalizedCharacterId)
                            .order('updated_at', { ascending: false })
                            .limit(1)
                            .single()

                        if (ocrCheck?.updated_at) {
                            const ocrUpdatedAt = new Date(ocrCheck.updated_at).getTime()
                            if (ocrUpdatedAt > scrapedAt) {
                                ocrIsNewer = true
                                console.log(`[API] OCR is newer than cache for ${characterId}. Force refresh for combat power recalculation.`)
                            }
                        }
                    } catch {
                        // OCR 데이터 없음 - 정상
                    }

                    // OCR이 캐시보다 최신이면 캐시 무시하고 새로 계산
                    if (ocrIsNewer) {
                        console.log(`[API] Cache INVALIDATED by newer OCR for ${characterId}. Fetching fresh...`)
                        // 아래 fresh fetch 로직으로 진행 (캐시 반환 안 함)
                    } else {
                        console.log(`[API] Returning CACHED data for ${characterId} (Age: ${Math.floor((now - scrapedAt) / 60000)}m)`)

                        // Transform DB structure back to API response structure
                        const responseData: any = {
                            profile: {
                                ...cachedData.profile,
                                pve_score: cachedData.pve_score || null,
                                pvp_score: cachedData.pvp_score || null
                            },
                            stats: cachedData.stats,
                            titles: cachedData.titles,
                            rankings: cachedData.rankings,
                            daevanion: cachedData.daevanion,
                            equipment: cachedData.equipment,
                            skill: cachedData.skills,
                            petwing: cachedData.pet_wing,
                            scraped_at: cachedData.scraped_at,
                            cached: true
                        }

                        // OCR 스탯 머지 (표시용)
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
                    }
                    // ocrIsNewer가 true면 여기로 와서 아래 fresh fetch로 진행
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

        // OCR 스탯 먼저 조회 (전투력 계산 전에 머지하기 위함)
        let ocrData: { stats: any; updated_at: string } | null = null
        let statForCalculation = infoData.stat // 기본값: API 스탯

        try {
            const { data: ocrResult } = await supabase
                .from('character_ocr_stats')
                .select('stats, updated_at')
                .eq('character_id', normalizedCharacterId)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single()

            if (ocrResult?.stats && infoData.stat?.statList) {
                ocrData = ocrResult
                // OCR 스탯을 API 스탯에 머지
                const mergedStatList = mergeOcrStats(infoData.stat.statList, ocrResult.stats)
                statForCalculation = { ...infoData.stat, statList: mergedStatList }
                console.log(`[API] OCR stats merged BEFORE combat power calculation for ${characterId}`)
            }
        } catch (ocrErr) {
            // OCR 데이터가 없으면 API 스탯 사용 (정상)
        }

        // 스탯 집계 (OCR 머지된 스탯 사용)
        // OCR 스탯이 있으면 6번째 파라미터로 전달하여 최종값 오버라이드 활성화
        const aggregatedStats = aggregateStats(equipmentForCalc, titles, daevanion, statForCalculation, equippedTitleId, ocrData?.stats)

        // PVE/PVP 전투력 계산
        // 레벨이 0이거나 장비가 없으면 전투력 계산하지 않음 (잘못된 값 방지)
        const characterLevel = infoData.profile?.characterLevel || 0
        const hasValidEquipment = equipmentForCalc.length > 0

        let pveScore: number | null = null
        let pvpScore: number | null = null

        if (characterLevel > 0 && hasValidEquipment) {
            const dualCombatPower = calculateDualCombatPowerFromStats(aggregatedStats, statForCalculation)
            pveScore = dualCombatPower.pve
            pvpScore = dualCombatPower.pvp
        } else {
            console.log(`[API] Skipping combat power calculation - Level: ${characterLevel}, Equipment: ${equipmentForCalc.length} items`)
        }

        // 3. Construct Final Response (OCR 머지된 스탯 사용)
        const finalData: any = {
            profile: {
                ...infoData.profile,
                pve_score: pveScore,
                pvp_score: pvpScore
            },
            stats: statForCalculation, // OCR 머지된 스탯
            titles: infoData.title,
            rankings: infoData.ranking,
            daevanion: infoData.daevanion,
            equipment: {
                ...equipData.equipment,
                equipmentList: enrichedEquipmentList
            },
            skill: equipData.skill,
            petwing: equipData.petwing,
            scraped_at: new Date().toISOString(),
            ocrUpdatedAt: ocrData?.updated_at || null // OCR 적용 여부 표시
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

        // OCR 머지는 이미 전투력 계산 전에 완료됨 (위쪽 코드 참조)

        return NextResponse.json(finalData)

    } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        console.error('[API Error]', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
