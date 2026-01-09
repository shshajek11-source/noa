import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic' // No caching for rankings to ensure freshness

export async function GET(request: NextRequest) {
    // Rate Limiting
    const rateLimit = checkRateLimit(request, RATE_LIMITS.standard)
    if (!rateLimit.success) {
        return rateLimit.error!
    }
    const searchParams = request.nextUrl.searchParams

    // Filters
    const type = searchParams.get('type') || 'noa' // noa, cp, content
    const server = searchParams.get('server')
    const race = searchParams.get('race')
    const className = searchParams.get('class')
    const search = searchParams.get('q')

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

        let query = supabase
            .from('characters')
            .select('*', { count: 'exact' })

        // Apply Filters
        if (server) query = query.eq('server_id', parseInt(server))
        if (race) query = query.eq('race_name', race)
        if (className) query = query.eq('class_name', className)
        if (search) query = query.ilike('name', `%${search}%`)

        // Apply Sorting based on Type
        switch (type) {
            case 'cp':
            case 'hiton':
                // HITON 전투력 (noa_score) 기준 정렬
                query = query.order('noa_score', { ascending: false, nullsFirst: false })
                break
            case 'ap':
                // 어비스 포인트 기준 정렬
                query = query.order('ranking_ap', { ascending: false })
                break
            case 'il':
                // 아이템 레벨 기준 정렬
                query = query.order('item_level', { ascending: false, nullsFirst: false })
                break
            case 'noa':
            default:
                query = query.order('noa_score', { ascending: false, nullsFirst: false })
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
