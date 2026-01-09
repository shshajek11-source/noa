import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Define the structure of incoming data
interface SyncCharacter {
    characterId: string
    name: string
    server_id: number
    level: number
    job: string // class_name
    race: string // race_name
    imageUrl?: string
}

// AION2 공식 API에서 캐릭터 상세 정보 조회
async function fetchCharacterDetail(characterId: string, serverId: number) {
    try {
        const url = `https://aion2.plaync.com/ko-kr/api/characters/${encodeURIComponent(characterId)}/server/${serverId}`
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://aion2.plaync.com/',
                'Accept': 'application/json'
            }
        })
        if (!res.ok) return null
        return await res.json()
    } catch (e) {
        console.error(`[Sync] Failed to fetch detail for ${characterId}:`, e)
        return null
    }
}

// 아이템 레벨 계산 함수
function calculateItemLevel(equipment: any): number {
    if (!equipment || !Array.isArray(equipment)) return 0

    let totalItemLevel = 0
    let count = 0

    equipment.forEach((item: any) => {
        if (item && item.itemLevel) {
            totalItemLevel += item.itemLevel
            count++
        }
    })

    return count > 0 ? Math.round(totalItemLevel / count) : 0
}

// NOA 점수(HITON 전투력) 계산 함수
function calculateNoaScore(stats: any, equipment: any): number {
    if (!stats) return 0

    let score = 0

    // 기본 스탯 기반 점수
    score += (stats.attack_power || 0) * 2
    score += (stats.magic_boost || 0) * 2
    score += (stats.accuracy || 0)
    score += (stats.magic_accuracy || 0)
    score += (stats.crit_strike || 0) * 1.5
    score += (stats.magic_crit || 0) * 1.5
    score += (stats.defense || 0) * 0.5
    score += (stats.magic_resist || 0) * 0.5
    score += (stats.hp || 0) * 0.1
    score += (stats.pvp_attack || 0) * 3
    score += (stats.pvp_defense || 0) * 3

    // 장비 티어/강화 보너스
    if (equipment && Array.isArray(equipment)) {
        equipment.forEach((item: any) => {
            if (item) {
                score += (item.tier || 0) * 100
                score += (item.enhanceLevel || 0) * 50
            }
        })
    }

    return Math.round(score)
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Handle both array directly and object with characters property
        let characters: SyncCharacter[]
        if (Array.isArray(body)) {
            characters = body
        } else if (body && Array.isArray(body.characters)) {
            characters = body.characters
        } else {
            return NextResponse.json({ message: 'Invalid data format' }, { status: 400 })
        }

        if (!characters || characters.length === 0) {
            return NextResponse.json({ message: 'No data provided' }, { status: 200 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase Credentials')
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        // Helper to remove HTML tags (like <strong>)
        const cleanName = (name: string) => name.replace(/<\/?[^>]+(>|$)/g, "");

        // 유효한 캐릭터 필터링
        const validCharacters = characters.filter(char => {
            if (!char.level || char.level <= 0) return false
            if (!char.characterId) return false
            if (char.job === 'Unknown' || char.job.startsWith('pcId:')) return false
            return true
        })

        // 각 캐릭터에 대해 상세 정보 조회 후 저장
        const results = await Promise.allSettled(
            validCharacters.map(async (char) => {
                const characterId = decodeURIComponent(char.characterId)

                // 먼저 DB에 이미 item_level과 noa_score가 있는지 확인
                const { data: existing } = await supabase
                    .from('characters')
                    .select('item_level, noa_score, updated_at')
                    .eq('character_id', characterId)
                    .single()

                // 이미 데이터가 있고 1시간 이내에 업데이트됐으면 스킵
                if (existing?.item_level && existing?.noa_score) {
                    const lastUpdate = new Date(existing.updated_at).getTime()
                    const oneHourAgo = Date.now() - (60 * 60 * 1000)
                    if (lastUpdate > oneHourAgo) {
                        console.log(`[Sync] Skipping ${char.name}: recently updated`)
                        return { skipped: true, name: char.name }
                    }
                }

                // 상세 정보 조회
                const detail = await fetchCharacterDetail(characterId, char.server_id)

                let itemLevel = 0
                let noaScore = 0
                let equipment = null
                let stats = null

                if (detail) {
                    equipment = detail.equipment
                    stats = detail.stats
                    itemLevel = calculateItemLevel(equipment)
                    noaScore = calculateNoaScore(stats, equipment)
                }

                // DB에 저장
                const row = {
                    character_id: characterId,
                    server_id: char.server_id,
                    name: cleanName(char.name),
                    level: char.level,
                    class_name: char.job,
                    race_name: char.race,
                    profile_image: char.imageUrl,
                    item_level: itemLevel || null,
                    noa_score: noaScore || null,
                    equipment: equipment ? JSON.stringify(equipment) : null,
                    stats: stats ? JSON.stringify(stats) : null,
                    updated_at: new Date().toISOString()
                }

                const { error } = await supabase
                    .from('characters')
                    .upsert(row, { onConflict: 'character_id' })

                if (error) {
                    console.error(`[Sync] Failed to upsert ${char.name}:`, error)
                    return { error: true, name: char.name }
                }

                console.log(`[Sync] Saved ${char.name}: IL=${itemLevel}, NOA=${noaScore}`)
                return { success: true, name: char.name, itemLevel, noaScore }
            })
        )

        const successCount = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length
        const skippedCount = results.filter(r => r.status === 'fulfilled' && (r.value as any).skipped).length

        return NextResponse.json({
            success: true,
            total: validCharacters.length,
            synced: successCount,
            skipped: skippedCount,
            message: `Synced ${successCount} characters, skipped ${skippedCount}`
        })

    } catch (err: any) {
        console.error('[Sync API] Error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
