import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { aggregateStats } from '@/lib/statsAggregator'
import { calculateCombatPowerFromStats } from '@/lib/combatPower'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5분 타임아웃

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// DB에 저장된 데이터로 전투력 재계산
function recalculateFromStoredData(character: any): {
    success: boolean
    newScore: number
    error?: string
} {
    try {
        const equipment = character.equipment?.equipmentList || []
        const titles = character.titles || { titleList: [] }
        const daevanion = character.daevanion || { boardList: [] }
        const stats = character.stats
        const equippedTitleId = character.profile?.titleId

        if (!equipment || equipment.length === 0) {
            return { success: false, error: 'No equipment data', newScore: 0 }
        }

        // 전투력 계산에서 제외할 아이템 필터링
        const equipmentForCalc = equipment.filter((item: any) => {
            const pos = item.slotPos
            const slotName = item.slotPosName || ''
            const isArcana = (pos >= 41 && pos <= 45) || slotName.startsWith('Arcana')
            const isPet = pos === 51
            const isWings = pos === 52
            return !isArcana && !isPet && !isWings
        })

        const aggregatedStats = aggregateStats(equipmentForCalc, titles, daevanion, stats, equippedTitleId)
        const combatPowerResult = calculateCombatPowerFromStats(aggregatedStats, stats)

        return { success: true, newScore: combatPowerResult.totalScore }
    } catch (err: any) {
        return { success: false, error: err.message, newScore: 0 }
    }
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const secret = searchParams.get('secret')

    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: 'Supabase credentials missing' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    try {
        // 1. 설정 확인
        const { data: settingsData } = await supabase
            .from('settings')
            .select('key, value')
            .in('key', ['auto_recalc_enabled', 'cron_secret', 'auto_recalc_batch_size'])

        const settings: Record<string, any> = {}
        settingsData?.forEach((row: { key: string, value: any }) => {
            settings[row.key] = row.value
        })

        // 2. 비밀키 확인
        const cronSecret = settings.cron_secret || process.env.CRON_SECRET
        if (!cronSecret) {
            return NextResponse.json({
                error: 'Cron secret not configured. Set it in admin settings.',
                hint: 'Go to /admin and set a cron secret key'
            }, { status: 403 })
        }

        if (secret !== cronSecret) {
            return NextResponse.json({ error: 'Invalid secret' }, { status: 403 })
        }

        // 3. 자동 재계산 활성화 확인
        if (!settings.auto_recalc_enabled) {
            return NextResponse.json({
                message: 'Auto recalculation is disabled',
                enabled: false
            })
        }

        // 4. 배치 사이즈
        const batchSize = settings.auto_recalc_batch_size || 100

        // 5. 전체 캐릭터 재계산 (장비 데이터 있는 것만)
        let offset = 0
        let totalProcessed = 0
        let totalSuccess = 0
        let totalFailed = 0
        let hasMore = true

        while (hasMore) {
            const { data: characters, error } = await supabase
                .from('characters')
                .select('character_id, name, pve_score, equipment, titles, daevanion, stats, profile')
                .not('equipment', 'is', null)
                .range(offset, offset + batchSize - 1)

            if (error) {
                console.error('[Cron Recalc] DB error:', error)
                break
            }

            if (!characters || characters.length === 0) {
                hasMore = false
                break
            }

            // 배치 처리
            for (const char of characters) {
                const result = recalculateFromStoredData(char)

                if (result.success && result.newScore > 0) {
                    const { error: updateError } = await supabase
                        .from('characters')
                        .update({ pve_score: result.newScore })
                        .eq('character_id', char.character_id)

                    if (!updateError) {
                        totalSuccess++
                    } else {
                        totalFailed++
                    }
                } else {
                    totalFailed++
                }
                totalProcessed++
            }

            offset += batchSize

            // 다음 배치가 있는지 확인
            if (characters.length < batchSize) {
                hasMore = false
            }
        }

        // 6. 마지막 실행 시간 업데이트
        await supabase
            .from('settings')
            .upsert([
                { key: 'last_auto_recalc', value: new Date().toISOString(), updated_at: new Date().toISOString() },
                { key: 'last_auto_recalc_count', value: totalSuccess, updated_at: new Date().toISOString() }
            ], { onConflict: 'key' })

        return NextResponse.json({
            success: true,
            message: 'Auto recalculation completed',
            processed: totalProcessed,
            successCount: totalSuccess,
            failed: totalFailed,
            timestamp: new Date().toISOString()
        })

    } catch (err: any) {
        console.error('[Cron Recalc] Error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

// POST도 지원 (일부 Cron 서비스용)
export async function POST(request: NextRequest) {
    const url = new URL(request.url)
    return GET(new NextRequest(url, { method: 'GET' }))
}
