import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { CLASSES } from '../../constants/game-data'
import { calculateCombatPower } from '../../utils/combatPower'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit'
import type {
    ExternalDetailResponse,
    TransformedItemDetail,
    StatListItem,
    EquipmentItem,
    EquipmentForCalc,
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

    // 3. Magic Stones (마석)
    if (detailData.magicStoneStat && Array.isArray(detailData.magicStoneStat)) {
        result.manastones = detailData.magicStoneStat.map((stone) => ({
            type: stone.type,
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

function calculateNoaScore(stats: CharacterStats | null, className: string): number {
    if (!stats) return 0;

    // Basic mapping - logic can be refined based on class
    // Currently using the general formula provided
    const attack = stats.attack_phy || stats.attack || 0;
    const magicBoost = stats.boost_mag || stats.magicBoost || 0;
    const crit = stats.crit_phy || stats.crit || 0;
    const accuracy = stats.accuracy_phy || stats.accuracy || 0;
    const magicAccuracy = stats.accuracy_mag || 0;

    // differentiate slightly by class type if needed, but for now using unified weighted sum
    // prioritizing primary stats
    let score = 0;

    // Physical classes
    if (['Gladiator', 'Templar', 'Ranger', 'Assassin', 'Chanter'].includes(className)) {
        score = (attack * 1.5) + (crit * 1.0) + (accuracy * 0.8) + (magicBoost * 0.2);
    }
    // Magical classes
    else if (['Sorcerer', 'Spiritmaster', 'Cleric'].includes(className)) {
        score = (magicBoost * 1.4) + (magicAccuracy * 1.0) + (crit * 0.5) + (attack * 0.2);
    }
    // Fallback / Hybrid
    else {
        score = (attack * 1.0) + (magicBoost * 1.0) + (crit * 0.8) + (accuracy * 0.8);
    }

    return Math.floor(score);
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

    if (!characterId || !serverId) {
        return NextResponse.json({ error: 'Missing characterId or serverId' }, { status: 400 })
    }

    try {
        console.log(`[API] Fetching data for ${characterId} / ${serverId}`)

        // Common headers to look like a browser
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://aion2.plaync.com/',
            'Accept': 'application/json'
        }

        // 1. Fetch Basic Info & Equipment List in Parallel
        const infoUrl = `https://aion2.plaync.com/api/character/info?lang=ko&characterId=${encodeURIComponent(characterId)}&serverId=${serverId}`
        const equipUrl = `https://aion2.plaync.com/api/character/equipment?lang=ko&characterId=${encodeURIComponent(characterId)}&serverId=${serverId}`

        const [infoRes, equipRes] = await Promise.all([
            fetch(infoUrl, { headers }),
            fetch(equipUrl, { headers })
        ])

        if (!infoRes.ok || !equipRes.ok) {
            console.error(`[API] Basic fetch failed. Info: ${infoRes.status}, Equip: ${equipRes.status}`)
            throw new Error('Failed to fetch from AION API')
        }

        const infoData = await infoRes.json()
        const equipData = await equipRes.json()

        // Extract Combat Power from statList (공식 API는 stat.statList 배열 안에 전투력 정보를 담고 있음)
        const statList: StatListItem[] = infoData.stat?.statList || []
        const cpStat = statList.find((s) => s.name === '전투력')
        const combatPower = cpStat?.value || 0
        console.log(`[API] Combat Power for ${infoData.profile.characterName}: ${combatPower}`)

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
            console.log(`[API] Fetching details for ${equipmentList.length} items using /item endpoint...`)

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
                        const detailUrl = `https://aion2.plaync.com/api/character/equipment/item?id=${encodeURIComponent(itemId)}&enchantLevel=${item.enchantLevel || 0}&exceedLevel=${item.exceedLevel || 0}&characterId=${encodeURIComponent(characterId)}&serverId=${serverId}&slotPos=${item.slotPos}&lang=ko`

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

        // Calculate NOA Score (HITON 전투력) - 캐릭터 상세 페이지와 동일한 방식
        // 장비 데이터를 calculateCombatPower 형식으로 변환
        const mappedEquipmentForCalc: EquipmentForCalc[] = enrichedEquipmentList.map((item) => ({
            itemLevel: item.itemLevel || 0,
            enhancement: (item.enchantLevel ?? 0) > 0 ? `+${item.enchantLevel}` : '',
            breakthrough: item.exceedLevel || 0,
            soulEngraving: item.soulEngraving,
            manastones: item.manastoneList || []
        }))
        const noaScore = calculateCombatPower(infoData.stat, mappedEquipmentForCalc);

        // 3. Construct Final Response
        const finalData = {
            profile: { ...infoData.profile, noa_score: noaScore }, // Inject score into profile for frontend convenience
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
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey)

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
                noa_score: noaScore,
                item_level: (() => {
                    // stats.statList에서 아이템레벨 찾기
                    const itemStatList: StatListItem[] = infoData.stat?.statList || []
                    const itemLevelStat = itemStatList.find((s) =>
                        s.name === '아이템레벨' || s.type === 'ItemLevel'
                    )
                    return itemLevelStat?.value || 0
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
                console.log(`[Supabase] Successfully saved character ${infoData.profile.characterName}`)
            }
        } else {
            // console.warn('[Supabase] Credentials missing, skipping DB save')
        }

        return NextResponse.json(finalData)

    } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        console.error('[API Error]', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
