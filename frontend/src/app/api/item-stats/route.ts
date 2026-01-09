import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SLOT_POS_MAP } from '@/types/item'

export const dynamic = 'force-dynamic'

interface ItemStatResult {
    itemId: string
    itemName: string
    slotPos: number
    slotName: string
    grade: string
    icon: string
    usageCount: number
    usagePercent: number
    avgEnhanceLevel: number
    avgBreakthrough: number
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams

    const slotPos = searchParams.get('slot')
    const className = searchParams.get('class')
    const limit = parseInt(searchParams.get('limit') || '20')

    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase credentials')
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        // 먼저 RPC 함수가 존재하는지 확인하고 사용
        // 없으면 직접 쿼리로 계산
        let stats: ItemStatResult[] = []

        try {
            // RPC 함수로 시도
            const { data: rpcData, error: rpcError } = await supabase.rpc('get_item_popularity_stats', {
                p_slot_pos: slotPos ? parseInt(slotPos) : null,
                p_class_name: className || null,
                p_limit: limit
            })

            if (!rpcError && rpcData && rpcData.length > 0) {
                stats = rpcData.map((item: any) => ({
                    itemId: item.item_id,
                    itemName: item.item_name || item.item_id,
                    slotPos: item.slot_pos,
                    slotName: item.slot_name || SLOT_POS_MAP[item.slot_pos] || '기타',
                    grade: item.grade || 'Common',
                    icon: item.icon || '',
                    usageCount: parseInt(item.usage_count) || 0,
                    usagePercent: parseFloat(item.usage_percent) || 0,
                    avgEnhanceLevel: parseFloat(item.avg_enhance_level) || 0,
                    avgBreakthrough: parseFloat(item.avg_breakthrough) || 0
                }))
            }
        } catch {
            // RPC 함수가 없으면 직접 계산
            console.log('[item-stats] RPC not available, calculating directly...')
        }

        // RPC 데이터가 없으면 직접 계산
        if (stats.length === 0) {
            stats = await calculateItemStatsDirectly(supabase, slotPos, className, limit)
        }

        return NextResponse.json({
            data: stats,
            filters: { slotPos, className, limit },
            timestamp: new Date().toISOString()
        })

    } catch (err: any) {
        console.error('[Item Stats API Error]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

// 직접 characters 테이블에서 통계 계산
async function calculateItemStatsDirectly(
    supabase: any,
    slotPos: string | null,
    className: string | null,
    limit: number
): Promise<ItemStatResult[]> {
    // 필터 조건에 맞는 캐릭터 조회 (최근 200명으로 제한하여 타임아웃 방지)
    let query = supabase
        .from('characters')
        .select('class_name, equipment')
        .not('equipment', 'is', null)

    if (className) {
        query = query.eq('class_name', className)
    }

    // limit과 order를 마지막에 적용
    query = query.limit(200)

    const { data: characters, error } = await query

    if (error) {
        console.error('[item-stats] Query error:', error)
        return []
    }

    if (!characters || characters.length === 0) {
        return []
    }

    const totalCharacters = characters.length

    // 아이템별 통계 집계
    const itemStats: Record<string, {
        itemId: string
        itemName: string
        slotPos: number
        grade: string
        icon: string
        count: number
        totalEnhance: number
        totalBreakthrough: number
    }> = {}

    for (const char of characters as any[]) {
        const equipmentList = char.equipment?.equipmentList || []

        for (const item of equipmentList) {
            if (!item.id) continue

            // 슬롯 필터
            if (slotPos && item.slotPos !== parseInt(slotPos)) continue

            const key = `${item.id}_${item.slotPos}`

            if (!itemStats[key]) {
                itemStats[key] = {
                    itemId: item.id,
                    itemName: item.name || item.id,
                    slotPos: item.slotPos,
                    grade: item.grade || 'Common',
                    icon: item.icon || '',
                    count: 0,
                    totalEnhance: 0,
                    totalBreakthrough: 0
                }
            }

            itemStats[key].count++
            itemStats[key].totalEnhance += item.enchantLevel || 0
            itemStats[key].totalBreakthrough += item.exceedLevel || 0
        }
    }

    // 결과 변환 및 정렬
    const results: ItemStatResult[] = Object.values(itemStats)
        .map(stat => ({
            itemId: stat.itemId,
            itemName: stat.itemName,
            slotPos: stat.slotPos,
            slotName: SLOT_POS_MAP[stat.slotPos] || '기타',
            grade: stat.grade,
            icon: stat.icon,
            usageCount: stat.count,
            usagePercent: Math.round((stat.count / totalCharacters) * 10000) / 100,
            avgEnhanceLevel: Math.round((stat.totalEnhance / stat.count) * 10) / 10,
            avgBreakthrough: Math.round((stat.totalBreakthrough / stat.count) * 10) / 10
        }))
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, limit)

    return results
}

// 통계 집계 트리거 (POST)
export async function POST(request: NextRequest) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase credentials')
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        // RPC 호출하여 통계 집계
        const { error } = await supabase.rpc('aggregate_item_stats')

        if (error) {
            console.error('[aggregate_item_stats] Error:', error)
            // RPC가 없어도 오류로 처리하지 않음
        }

        return NextResponse.json({
            success: true,
            message: 'Item stats aggregation triggered',
            timestamp: new Date().toISOString()
        })

    } catch (err: any) {
        console.error('[Item Stats POST Error]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
