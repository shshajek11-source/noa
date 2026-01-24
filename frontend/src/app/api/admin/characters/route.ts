import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

/**
 * DB에서 캐릭터 목록 조회
 * - 크롤링으로 수집된 랭커만 조회 (rankings 필드가 있는 캐릭터)
 * - ranking_ap 기준 정렬
 * - 상세 조회가 안 된 캐릭터만 필터링 가능
 */
export async function GET(request: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: 'Supabase credentials missing' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const orderBy = searchParams.get('orderBy') || 'ranking_ap'
    const order = searchParams.get('order') || 'desc'
    const onlyWithoutDetail = searchParams.get('onlyWithoutDetail') === 'true'
    const onlyRankers = searchParams.get('onlyRankers') !== 'false' // 기본값: true (랭커만)

    try {
        let query = supabase
            .from('characters')
            .select('character_id, name, server_id, race_name, class_name, ranking_ap, rankings, profile_image, equipment, pve_score, pvp_score, updated_at')
            .not('character_id', 'is', null) // character_id가 있는 것만 (상세 조회 가능)
            .order(orderBy, { ascending: order === 'asc' })
            .limit(limit)

        // 크롤링된 랭커만 (rankings 필드가 있는 캐릭터)
        if (onlyRankers) {
            query = query.not('rankings', 'is', null)
        }

        // 상세 조회가 안 된 캐릭터만 (장비 정보 없는)
        if (onlyWithoutDetail) {
            query = query.or('equipment.is.null,pve_score.is.null')
        }

        const { data, error } = await query

        if (error) {
            console.error('[Admin Characters] Query error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            data,
            count: data?.length || 0,
            filters: { limit, orderBy, order, onlyWithoutDetail }
        })
    } catch (error: any) {
        console.error('[Admin Characters] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
