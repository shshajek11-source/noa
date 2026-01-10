import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { aggregateStats } from '@/lib/statsAggregator'
import { calculateCombatPowerFromStats } from '@/lib/combatPower'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5분 타임아웃

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// DB에 저장된 데이터로 전투력 재계산 (외부 API 호출 없음 - 빠름)
function recalculateFromStoredData(character: any): {
    success: boolean
    newScore: number
    grade?: string
    error?: string
} {
    try {
        // DB에 저장된 장비, 칭호, 대바니온, 스탯 사용
        const equipment = character.equipment?.equipmentList || []
        const titles = character.titles || { titleList: [] }
        const daevanion = character.daevanion || { boardList: [] }
        const stats = character.stats
        const equippedTitleId = character.profile?.titleId

        // 장비 데이터가 없으면 스킵
        if (!equipment || equipment.length === 0) {
            return { success: false, error: 'No equipment data', newScore: 0 }
        }

        // 전투력 계산에서 제외할 아이템 필터링 (아르카나, 펫, 날개)
        const equipmentForCalc = equipment.filter((item: any) => {
            const pos = item.slotPos
            const slotName = item.slotPosName || ''
            const isArcana = (pos >= 41 && pos <= 45) || slotName.startsWith('Arcana')
            const isPet = pos === 51
            const isWings = pos === 52
            return !isArcana && !isPet && !isWings
        })

        // 스탯 집계
        const aggregatedStats = aggregateStats(equipmentForCalc, titles, daevanion, stats, equippedTitleId)

        // 새 전투력 계산
        const combatPowerResult = calculateCombatPowerFromStats(aggregatedStats, stats)

        return {
            success: true,
            newScore: combatPowerResult.totalScore,
            grade: combatPowerResult.grade
        }
    } catch (err: any) {
        return { success: false, error: err.message, newScore: 0 }
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { action, batchSize = 50, offset = 0 } = body  // 배치 사이즈 증가 (외부 API 호출 없으므로)

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json({ error: 'Supabase credentials missing' }, { status: 500 })
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        if (action === 'status') {
            // 현재 상태 반환 - 장비 데이터가 있는 캐릭터만 카운트
            const { count: totalCount } = await supabase
                .from('characters')
                .select('*', { count: 'exact', head: true })
                .not('equipment', 'is', null)

            const { count: noEquipCount } = await supabase
                .from('characters')
                .select('*', { count: 'exact', head: true })
                .is('equipment', null)

            return NextResponse.json({
                total: totalCount || 0,
                noEquipment: noEquipCount || 0,
                message: 'Ready to recalculate combat power (using stored data)'
            })
        }

        if (action === 'recalculate') {
            // 캐릭터 가져오기 (배치) - 장비 데이터 포함
            const { data: characters, error } = await supabase
                .from('characters')
                .select('character_id, server_id, name, noa_score, equipment, titles, daevanion, stats, profile')
                .not('equipment', 'is', null)
                .order('scraped_at', { ascending: true, nullsFirst: true })  // 오래된 것부터 업데이트
                .range(offset, offset + batchSize - 1)

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 })
            }

            if (!characters || characters.length === 0) {
                return NextResponse.json({
                    message: 'No more characters to process',
                    processed: 0,
                    hasMore: false
                })
            }

            // 배치 재계산 실행 (DB 저장 데이터 사용 - 빠름)
            const results = []
            let successCount = 0
            let failedCount = 0

            for (const char of characters) {
                const result = recalculateFromStoredData(char)
                const oldScore = char.noa_score || 0

                if (result.success && result.newScore > 0) {
                    // DB 업데이트
                    const { error: updateError } = await supabase
                        .from('characters')
                        .update({ noa_score: result.newScore })
                        .eq('character_id', char.character_id)

                    if (updateError) {
                        failedCount++
                        results.push({
                            name: char.name,
                            oldScore,
                            newScore: result.newScore,
                            grade: result.grade,
                            success: false,
                            error: updateError.message
                        })
                    } else {
                        successCount++
                        results.push({
                            name: char.name,
                            oldScore,
                            newScore: result.newScore,
                            grade: result.grade,
                            success: true
                        })
                    }
                } else {
                    failedCount++
                    results.push({
                        name: char.name,
                        oldScore,
                        newScore: 0,
                        grade: '',
                        success: false,
                        error: result.error || 'Unknown error'
                    })
                }
            }

            // 전체 캐릭터 수 확인
            const { count: totalCount } = await supabase
                .from('characters')
                .select('*', { count: 'exact', head: true })
                .not('equipment', 'is', null)

            const hasMore = offset + batchSize < (totalCount || 0)

            return NextResponse.json({
                processed: results.length,
                success: successCount,
                failed: failedCount,
                nextOffset: offset + batchSize,
                hasMore,
                total: totalCount || 0,
                results
            })
        }

        return NextResponse.json({ error: 'Invalid action. Use "status" or "recalculate"' }, { status: 400 })

    } catch (err: any) {
        console.error('[Recalc Combat Power Error]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: 'Supabase credentials missing' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 통계 반환
    const { count: totalCount } = await supabase
        .from('characters')
        .select('*', { count: 'exact', head: true })
        .not('equipment', 'is', null)

    const { count: noEquipCount } = await supabase
        .from('characters')
        .select('*', { count: 'exact', head: true })
        .is('equipment', null)

    const { data: topChars } = await supabase
        .from('characters')
        .select('name, noa_score, server_id')
        .order('noa_score', { ascending: false })
        .limit(5)

    return NextResponse.json({
        total: totalCount || 0,
        noEquipment: noEquipCount || 0,
        topCharacters: topChars || [],
        message: 'POST with action="recalculate" to start recalculation (uses stored data, no external API calls)'
    })
}
