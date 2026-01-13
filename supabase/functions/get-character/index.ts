import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { AionCharacterInfoResponse, AionCharacterEquipmentResponse, DbCharacter, normalizeRaceName } from '../_shared/types.ts'

const CACHE_TTL_SECONDS = 300; // 5분 캐시 정책

/**
 * Transform detail data from AION2 API to standardized format
 */
function transformDetailData(detailData: any) {
    if (!detailData) return null

    // Initialize result structure
    const result: any = {
        options: [],
        randomOptions: [],
        setEffects: [],
        source: null
    }

    // Handle various possible API response structures
    // Pattern 1: detail.equipment.options (nested)
    if (detailData.equipment) {
        const equip = detailData.equipment

        // Base options
        if (equip.options && Array.isArray(equip.options)) {
            result.options = equip.options.map((opt: any) => ({
                name: opt.name || opt.optionName || opt.type,
                value: opt.value || opt.optionValue || opt.point || ''
            }))
        }

        // Random options
        if (equip.randomOptions && Array.isArray(equip.randomOptions)) {
            result.randomOptions = equip.randomOptions.map((opt: any) => ({
                name: opt.name || opt.optionName || opt.type,
                value: opt.value || opt.optionValue || opt.point || ''
            }))
        }

        // Set effects
        if (equip.setInfo || equip.setEffects) {
            const setData = equip.setInfo || equip.setEffects
            if (Array.isArray(setData)) {
                result.setEffects = setData.map((set: any) => ({
                    name: set.name || set.setName,
                    options: set.effects || set.options || []
                }))
            } else if (setData.name) {
                result.setEffects = [{
                    name: setData.name,
                    options: setData.effects || setData.options || []
                }]
            }
        }

        // Source
        result.source = equip.source || equip.dropSource || equip.obtainMethod
    }

    // Pattern 2: detail directly contains options (flat structure)
    if (!result.options.length && detailData.options && Array.isArray(detailData.options)) {
        result.options = detailData.options.map((opt: any) => ({
            name: opt.name || opt.optionName || opt.type,
            value: opt.value || opt.optionValue || opt.point || ''
        }))
    }

    if (!result.randomOptions.length && detailData.randomOptions && Array.isArray(detailData.randomOptions)) {
        result.randomOptions = detailData.randomOptions.map((opt: any) => ({
            name: opt.name || opt.optionName || opt.type,
            value: opt.value || opt.optionValue || opt.point || ''
        }))
    }

    if (!result.setEffects.length && (detailData.setInfo || detailData.setEffects)) {
        const setData = detailData.setInfo || detailData.setEffects
        if (Array.isArray(setData)) {
            result.setEffects = setData.map((set: any) => ({
                name: set.name || set.setName,
                options: set.effects || set.options || []
            }))
        } else if (setData.name) {
            result.setEffects = [{
                name: setData.name,
                options: setData.effects || setData.options || []
            }]
        }
    }

    if (!result.source && detailData.source) {
        result.source = detailData.source || detailData.dropSource || detailData.obtainMethod
    }

    // Keep the original data for debugging
    result._raw = detailData

    return result
}

serve(async (req) => {
    // CORS 헤더 처리
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { characterId, serverId, forceRefresh } = await req.json()

        if (!characterId || !serverId) {
            throw new Error('characterId and serverId are required')
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
        const supabase = createClient(supabaseUrl, supabaseKey)

        // 1. 캐시 확인 (강제 새로고침이 아닌 경우)
        if (!forceRefresh) {
            const { data: cachedData, error: cacheError } = await supabase
                .from('characters')
                .select('*')
                .eq('character_id', characterId)
                .single()

            if (cachedData) {
                const updatedAt = new Date(cachedData.scraped_at).getTime()
                const now = new Date().getTime()
                const diffSeconds = (now - updatedAt) / 1000

                if (diffSeconds < CACHE_TTL_SECONDS) {
                    console.log(`Cache hit for ${characterId}`)
                    return new Response(
                        JSON.stringify(cachedData),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                    )
                }
            }
        }

        console.log(`Fetching from AION2 API for ${characterId}`)
        const infoUrl = `https://aion2.plaync.com/api/character/info?lang=ko&characterId=${characterId}&serverId=${serverId}`
        const equipUrl = `https://aion2.plaync.com/api/character/equipment?lang=ko&characterId=${characterId}&serverId=${serverId}`

        // 2. 1단계 병렬 호출: 기본 정보 + 장비 목록
        const [infoRes, equipRes] = await Promise.all([
            fetch(infoUrl),
            fetch(equipUrl)
        ])

        if (!infoRes.ok || !equipRes.ok) {
            throw new Error('Failed to fetch character data from Aion server')
        }

        const infoData: AionCharacterInfoResponse = await infoRes.json()
        const equipData: AionCharacterEquipmentResponse = await equipRes.json()

        // 3. 2단계 병렬 호출: 장비별 상세 정보 조회
        // 장비 리스트가 존재할 경우에만 상세 조회 수행
        let enrichedEquipmentList = [];
        if (equipData.equipment && equipData.equipment.equipmentList) {
            enrichedEquipmentList = await Promise.all(
                equipData.equipment.equipmentList.map(async (item: any) => {
                    try {
                        // 각 아이템의 상세 정보 호출
                        const detailUrl = `https://aion2.plaync.com/api/character/equipment/detail?lang=ko&characterId=${characterId}&serverId=${serverId}&itemId=${item.id}&slotPos=${item.slotPos}`;
                        const detailRes = await fetch(detailUrl);

                        if (!detailRes.ok) {
                            return { ...item, detail: null };
                        }

                        const detailData = await detailRes.json();

                        // Log the detail structure for debugging (first item only)
                        if (item.slotPos === 1) {
                            console.log('[Edge Function] Sample Detail Structure:', JSON.stringify(detailData, null, 2));
                        }

                        // Transform detail to standardized format
                        const transformedDetail = transformDetailData(detailData);

                        return { ...item, detail: transformedDetail }; // 기존 아이템 정보에 상세 정보 결합
                    } catch (e) {
                        console.error(`Failed to fetch detail for item ${item.id}`, e);
                        return { ...item, detail: null }; // 에러 발생 시 프로세스 유지를 위해 null 처리
                    }
                })
            );
        }

        // 4. 최종 데이터 구조 생성 및 DB 저장
        // 원본 equipData 구조를 유지하되, equipmentList만 상세 정보가 포함된 버전으로 교체
        const enrichedEquipment = {
            ...equipData.equipment,
            equipmentList: enrichedEquipmentList
        };

        // 4-1. 아이템 레벨 계산 (장비 슬롯의 itemLevel 평균)
        let calculatedItemLevel = 0
        if (enrichedEquipmentList && enrichedEquipmentList.length > 0) {
            // 주요 장비 슬롯: 무기, 방어구, 악세사리 (펫/날개 제외)
            const mainSlots = enrichedEquipmentList.filter((item: any) =>
                item.slotPos && [1, 2, 3, 5, 6, 7, 11, 12, 13, 14, 15, 16].includes(item.slotPos) && item.itemLevel
            )

            if (mainSlots.length > 0) {
                const totalItemLevel = mainSlots.reduce((sum: number, item: any) =>
                    sum + (item.itemLevel || 0), 0
                )
                calculatedItemLevel = Math.floor(totalItemLevel / mainSlots.length)
                console.log(`[Item Level] Calculated from ${mainSlots.length} items: ${calculatedItemLevel}`)
            }
        }

        const dbCharacter: DbCharacter = {
            character_id: infoData.profile.characterId,
            server_id: infoData.profile.serverId,
            name: infoData.profile.characterName,
            level: infoData.profile.characterLevel,
            item_level: calculatedItemLevel, // 장비 아이템 레벨 평균
            class_name: infoData.profile.className,
            race_name: normalizeRaceName(infoData.profile.raceId, infoData.profile.raceName),
            combat_power: 0, // 필요 시 계산 로직 추가
            profile_image: infoData.profile.profileImage,

            profile: infoData.profile,
            stats: infoData.stat,
            titles: infoData.title,
            rankings: infoData.ranking,
            daevanion: infoData.daevanion,
            equipment: enrichedEquipment, // 상세 정보가 포함된 장비 데이터 저장
            skills: equipData.skill,
            pet_wing: equipData.petwing,

            scraped_at: new Date().toISOString()
        }

        const { data: savedData, error: upsertError } = await supabase
            .from('characters')
            .upsert(dbCharacter, { onConflict: 'character_id' })
            .select()
            .single()

        if (upsertError) {
            console.error('Upsert error:', upsertError)
            throw new Error('Failed to save character data')
        }

        return new Response(
            JSON.stringify(savedData),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error: any) {
        console.error(error)
        return new Response(
            JSON.stringify({ error: error.message || 'Unknown error' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
