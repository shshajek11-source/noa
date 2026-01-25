import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit'

// 30초 캐싱 (ISR) - 랭킹은 실시간일 필요 없음
export const revalidate = 30

export async function GET(request: NextRequest) {
    // Rate Limiting
    const rateLimit = checkRateLimit(request, RATE_LIMITS.standard)
    if (!rateLimit.success) {
        return rateLimit.error!
    }
    const searchParams = request.nextUrl.searchParams

    // Filters
    const type = searchParams.get('type') || 'combat' // combat(전투력), content(컨텐츠)
    const sort = searchParams.get('sort') || 'pve' // 정렬 기준: pve 또는 pvp
    const server = searchParams.get('server')
    const raceParam = searchParams.get('race')
    const className = searchParams.get('class')
    const search = searchParams.get('q')

    // Race 파라미터를 한글로 변환 (ELYOS → 천족, ASMODIANS → 마족)
    let race = raceParam
    if (raceParam === 'ELYOS') {
        race = '천족'
    } else if (raceParam === 'ASMODIANS') {
        race = '마족'
    }

    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const start = (page - 1) * limit
    const end = start + limit - 1

    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase Credentials')
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        // 필요한 컬럼만 선택 (성능 최적화)
        const selectColumns = `
            character_id,
            name,
            server_id,
            class_name,
            race_name,
            level,
            item_level,
            pve_score,
            pvp_score,
            ranking_ap,
            profile_image
        `.replace(/\s+/g, '')

        // count: 'estimated' 사용 (정확한 카운트 대신 추정치로 속도 개선)
        let query = supabase
            .from('characters')
            .select(selectColumns, { count: 'estimated' })

        // Apply Filters
        if (server) query = query.eq('server_id', parseInt(server))
        // Race 필터 - DB에 한글과 영어가 섞여 있어서 OR 조건 사용
        if (race) {
            const raceEn = raceParam // 'ELYOS' or 'ASMODIANS'
            query = query.or(`race_name.eq.${race},race_name.eq.${raceEn}`)
        }
        if (className) query = query.eq('class_name', className)
        if (search) query = query.ilike('name', `%${search}%`)

        // Apply Sorting based on Type
        switch (type) {
            case 'combat':
            case 'cp':
            case 'hiton':
            case 'noa':
            case 'pve':
                // 전투력 탭: sort 파라미터에 따라 PVE 또는 PVP 정렬
                // 레벨 45 이상만 표시 (저레벨 비정상 데이터 제외)
                query = query.gte('level', 45)
                if (sort === 'pvp') {
                    query = query
                        .gte('pvp_score', 1)
                        .order('pvp_score', { ascending: false })
                } else {
                    query = query
                        .gte('pve_score', 1)
                        .order('pve_score', { ascending: false })
                }
                break
            case 'pvp':
                // PVP 전투력 기준 정렬 (하위 호환)
                query = query
                    .gte('level', 45)
                    .gte('pvp_score', 1)
                    .order('pvp_score', { ascending: false })
                break
            case 'content':
            case 'ap':
                // 어비스 포인트 기준 정렬
                query = query.order('ranking_ap', { ascending: false })
                break
            case 'il':
                // 아이템 레벨 기준 정렬
                query = query.order('item_level', { ascending: false, nullsFirst: false })
                break
            default:
                query = query
                    .gte('level', 45)
                    .gte('pve_score', 1)
                    .order('pve_score', { ascending: false })
                break
        }

        // Apply Pagination
        query = query.range(start, end)

        const { data, count, error } = await query

        if (error) {
            console.error('[Ranking API] sorting error:', error)
            throw error
        }

        return NextResponse.json({
            data,
            meta: {
                total: count,
                page,
                limit,
                totalPages: count ? Math.ceil(count / limit) : 0
            }
        })

    } catch (err: any) {
        console.error('[Ranking API Error]', err)
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
    }
}
