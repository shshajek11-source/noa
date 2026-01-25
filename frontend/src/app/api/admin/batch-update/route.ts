import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateDualCombatPowerFromStats } from '../../../../lib/combatPower'
import { aggregateStats } from '../../../../lib/statsAggregator'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Vercel serverless timeout (최대 60초)

const BATCH_SIZE = 10 // 한 번에 조회할 캐릭터 수 (외부 API 호출이므로 작게 유지)

// 차단/에러 타입 정의
type ErrorType = 'blocked' | 'rate_limit' | 'maintenance' | 'network' | 'unknown'

function detectErrorType(status: number, contentType: string, errorMsg?: string): ErrorType {
    if (status === 403) return 'blocked'
    if (status === 429) return 'rate_limit'
    if (status === 503 || status === 502) return 'maintenance'
    if (!contentType.includes('application/json')) return 'blocked' // HTML 응답 = 차단
    if (errorMsg?.includes('fetch failed') || errorMsg?.includes('ECONNREFUSED')) return 'network'
    return 'unknown'
}

// 공식 API에서 캐릭터 상세 정보 가져오기
async function fetchCharacterDetail(characterId: string, serverId: number): Promise<{ data?: any; errorType?: ErrorType }> {
    const infoUrl = `https://aion2.plaync.com/api/character/info?lang=ko&characterId=${encodeURIComponent(characterId)}&serverId=${serverId}`

    try {
        const res = await fetch(infoUrl, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        })

        const contentType = res.headers.get('content-type') || ''

        if (!res.ok) {
            return { errorType: detectErrorType(res.status, contentType) }
        }

        if (!contentType.includes('application/json')) {
            return { errorType: 'blocked' }
        }

        const data = await res.json()
        return { data }
    } catch (e: any) {
        return { errorType: detectErrorType(0, '', e.message) }
    }
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
            .order('character_id', { ascending: true })  // PK 인덱스 활용
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

        const results: { name: string; success: boolean; pve_score?: number; pvp_score?: number; error?: string; errorType?: ErrorType }[] = []
        let blockedCount = 0
        let rateLimitCount = 0
        let consecutiveErrors = 0

        // 순차 처리 (Rate Limit 방지)
        for (const char of characters) {
            try {
                // 공식 API에서 상세 정보 가져오기
                const { data, errorType } = await fetchCharacterDetail(char.character_id, char.server_id)

                if (errorType) {
                    consecutiveErrors++
                    if (errorType === 'blocked') blockedCount++
                    if (errorType === 'rate_limit') rateLimitCount++
                    results.push({ name: char.name, success: false, error: errorType, errorType })

                    // 연속 5회 차단/에러 시 조기 종료
                    if (consecutiveErrors >= 5) {
                        console.warn(`[Batch] 연속 ${consecutiveErrors}회 에러, 조기 종료`)
                        break
                    }
                    continue
                }

                if (!data || !data.stat) {
                    results.push({ name: char.name, success: false, error: 'No stat data' })
                    consecutiveErrors++
                    continue
                }

                // 성공 시 연속 에러 카운트 리셋
                consecutiveErrors = 0

                // 스탯 집계
                const statList = data.stat?.statList || []
                const equipment = data.equipment?.equipmentList || []
                const titles = data.title || { titleList: [] }
                const daevanion = data.daevanion || { boardList: [] }
                const stats = data.stat
                const equippedTitleId = data.profile?.titleId

                // 아이템레벨 추출
                const itemLevelStat = statList.find((s: any) =>
                    s.name === '아이템레벨' || s.type === 'ItemLevel'
                )
                const itemLevel = itemLevelStat?.value || 0

                // 전투력 계산에서 제외할 아이템 필터링
                const equipmentForCalc = equipment.filter((item: any) => {
                    const pos = item.slotPos
                    const slotName = item.slotPosName || ''
                    const isArcana = (pos >= 41 && pos <= 45) || slotName.startsWith('Arcana')
                    const isPet = pos === 51
                    const isWings = pos === 52
                    return !isArcana && !isPet && !isWings
                })

                // 스탯 집계 및 전투력 계산
                let pveScore = 0
                let pvpScore = 0

                try {
                    const aggregatedStats = aggregateStats(equipmentForCalc, titles, daevanion, stats, equippedTitleId)

                    // 디버그: 첫 번째 캐릭터의 스탯 정보 로깅
                    if (results.length === 0) {
                        console.log(`[Batch Debug] ${char.name} - Equipment count:`, equipmentForCalc.length)
                        console.log(`[Batch Debug] ${char.name} - StatList count:`, statList.length)
                        console.log(`[Batch Debug] ${char.name} - AggregatedStats count:`, aggregatedStats.length)

                        // 주요 스탯 확인
                        const attackStat = aggregatedStats.find(s => s.name === '공격력')
                        const critStat = aggregatedStats.find(s => s.name === '치명타')
                        const accStat = aggregatedStats.find(s => s.name === '명중')
                        console.log(`[Batch Debug] ${char.name} - 공격력:`, attackStat?.totalValue || 0)
                        console.log(`[Batch Debug] ${char.name} - 치명타:`, critStat?.totalValue || 0)
                        console.log(`[Batch Debug] ${char.name} - 명중:`, accStat?.totalValue || 0)
                    }

                    const combatResult = calculateDualCombatPowerFromStats(aggregatedStats, stats)
                    pveScore = combatResult.pve
                    pvpScore = combatResult.pvp
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

            // Rate Limit 방지 딜레이 (50ms)
            await new Promise(resolve => setTimeout(resolve, 50))
        }

        // 남은 캐릭터 수 확인 (estimated 사용으로 속도 개선)
        const { count } = await supabase
            .from('characters')
            .select('character_id', { count: 'estimated', head: true })
            .or('stats.is.null,pve_score.is.null')

        const successCount = results.filter(r => r.success).length
        const isBlocked = blockedCount >= 3 || rateLimitCount >= 3 || consecutiveErrors >= 5

        return NextResponse.json({
            message: `Updated ${successCount}/${results.length} characters`,
            results,
            remaining: count || 0,
            // 차단 감지 정보
            status: {
                blocked: blockedCount,
                rateLimited: rateLimitCount,
                consecutiveErrors,
                isBlocked,
                shouldPause: isBlocked
            }
        })

    } catch (err: any) {
        console.error('[Batch Error]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
