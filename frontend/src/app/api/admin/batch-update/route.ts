import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculatePvEScore, calculatePvPScore } from '../../../../lib/combatPower'
import { aggregateStats, AggregatedStats } from '../../../../lib/statsAggregator'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Vercel serverless timeout (최대 60초)

const BATCH_SIZE = 10 // 한 번에 조회할 캐릭터 수

// 공식 API에서 캐릭터 상세 정보 가져오기
async function fetchCharacterDetail(characterId: string, serverId: number) {
    const infoUrl = `https://aion2.plaync.com/api/character/info?lang=ko&characterId=${encodeURIComponent(characterId)}&serverId=${serverId}`

    const res = await fetch(infoUrl, {
        headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    })

    if (!res.ok) {
        throw new Error(`API returned ${res.status}`)
    }

    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
        throw new Error('Non-JSON response (API maintenance)')
    }

    return res.json()
}

export async function GET(request: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    try {
        // stats가 null이거나 pve_score가 null인 캐릭터 조회 (상세 정보 미수집)
        const { data: characters, error } = await supabase
            .from('characters')
            .select('character_id, server_id, name')
            .or('stats.is.null,pve_score.is.null')
            .order('updated_at', { ascending: true, nullsFirst: true })
            .limit(BATCH_SIZE)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (!characters || characters.length === 0) {
            return NextResponse.json({
                message: 'No characters to update',
                results: [],
                remaining: 0
            })
        }

        const results: { name: string; success: boolean; pve_score?: number; pvp_score?: number; error?: string }[] = []

        // 순차 처리 (Rate Limit 방지)
        for (const char of characters) {
            try {
                // 공식 API에서 상세 정보 가져오기
                const data = await fetchCharacterDetail(char.character_id, char.server_id)

                if (!data || !data.stat) {
                    results.push({ name: char.name, success: false, error: 'No stat data' })
                    continue
                }

                // 스탯 집계
                const statList = data.stat?.statList || []
                const equipmentList = data.equipment?.equipmentList || []

                // 아이템레벨 추출
                const itemLevelStat = statList.find((s: any) =>
                    s.name === '아이템레벨' || s.type === 'ItemLevel'
                )
                const itemLevel = itemLevelStat?.value || 0

                // 스탯 집계 및 전투력 계산
                let pveScore = 0
                let pvpScore = 0

                try {
                    const aggregated: AggregatedStats = aggregateStats(statList, equipmentList)
                    pveScore = calculatePvEScore(aggregated)
                    pvpScore = calculatePvPScore(aggregated)
                } catch (calcErr) {
                    // 계산 실패 시 기본값 사용
                    console.warn(`[Batch] Combat power calc failed for ${char.name}:`, calcErr)
                }

                // DB 업데이트
                const { error: updateError } = await supabase
                    .from('characters')
                    .update({
                        stats: data.stat,
                        equipment: data.equipment,
                        item_level: itemLevel,
                        pve_score: pveScore,
                        pvp_score: pvpScore,
                        updated_at: new Date().toISOString()
                    })
                    .eq('character_id', char.character_id)

                if (updateError) {
                    results.push({ name: char.name, success: false, error: updateError.message })
                } else {
                    results.push({ name: char.name, success: true, pve_score: pveScore, pvp_score: pvpScore })
                    console.log(`[Batch] Updated ${char.name}: PVE=${pveScore}, PVP=${pvpScore}`)
                }

            } catch (e: any) {
                results.push({ name: char.name, success: false, error: e.message })
            }

            // Rate Limit 방지 딜레이 (200ms)
            await new Promise(resolve => setTimeout(resolve, 200))
        }

        // 남은 캐릭터 수 확인
        const { count } = await supabase
            .from('characters')
            .select('*', { count: 'exact', head: true })
            .or('stats.is.null,pve_score.is.null')

        return NextResponse.json({
            message: `Updated ${results.filter(r => r.success).length}/${characters.length} characters`,
            results,
            remaining: count || 0
        })

    } catch (err: any) {
        console.error('[Batch Error]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
