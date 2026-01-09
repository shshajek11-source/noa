import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SLOT_POS_MAP } from '@/types/item'

export const dynamic = 'force-dynamic'

// 공식 AION2 API 아이템 검색 시도 (추정 엔드포인트)
async function searchOfficialAPI(keyword: string, category?: string, grade?: string, page: number = 1) {
    const possibleEndpoints = [
        'https://aion2.plaync.com/api/info/item/search',
        'https://aion2.plaync.com/ko-kr/api/info/item/search',
        'https://aion2.plaync.com/api/item/search',
    ]

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://aion2.plaync.com/',
        'Accept': 'application/json'
    }

    for (const baseUrl of possibleEndpoints) {
        try {
            const url = new URL(baseUrl)
            if (keyword) url.searchParams.append('keyword', keyword)
            if (category) url.searchParams.append('category', category)
            if (grade) url.searchParams.append('grade', grade)
            url.searchParams.append('page', page.toString())
            url.searchParams.append('size', '20')
            url.searchParams.append('lang', 'ko')

            const response = await fetch(url.toString(), {
                headers,
                signal: AbortSignal.timeout(5000)
            })

            if (response.ok) {
                const data = await response.json()
                if (data && (data.list || data.items || data.data)) {
                    console.log('[Item Search] Official API success:', baseUrl)
                    return { success: true, data, endpoint: baseUrl }
                }
            }
        } catch (err) {
            // 다음 엔드포인트 시도
            continue
        }
    }

    return { success: false, data: null }
}

// 로컬 DB에서 아이템 검색
async function searchLocalDB(
    supabase: any,
    keyword: string,
    slotPos?: number,
    grade?: string,
    limit: number = 30
) {
    // items 테이블에서 검색
    let query = supabase
        .from('items')
        .select('*')

    if (keyword) {
        query = query.ilike('name', `%${keyword}%`)
    }

    if (slotPos) {
        query = query.eq('slot_pos', slotPos)
    }

    if (grade) {
        query = query.eq('grade', grade)
    }

    query = query.order('item_level', { ascending: false }).limit(limit)

    const { data, error } = await query

    if (error) {
        console.error('[Item Search] Local DB error:', error)
        return []
    }

    return (data || []).map((item: any) => ({
        itemId: item.item_id,
        name: item.name,
        categoryName: item.category_name,
        grade: item.grade,
        itemLevel: item.item_level,
        icon: item.icon,
        slotPos: item.slot_pos,
        slotName: SLOT_POS_MAP[item.slot_pos] || '기타'
    }))
}

// 캐릭터 장비에서 아이템 검색 (items 테이블이 비어있을 경우)
async function searchFromEquipment(
    supabase: any,
    keyword: string,
    slotPos?: number,
    limit: number = 30
) {
    // characters 테이블에서 장비 JSON 추출
    const { data: characters, error } = await supabase
        .from('characters')
        .select('equipment')
        .not('equipment', 'is', null)
        .limit(500)

    if (error || !characters) {
        return []
    }

    // 중복 제거를 위한 Map
    const itemMap = new Map<string, any>()

    for (const char of characters as any[]) {
        const equipmentList = char.equipment?.equipmentList || []

        for (const item of equipmentList) {
            if (!item.id || !item.name) continue

            // 키워드 필터
            if (keyword && !item.name.toLowerCase().includes(keyword.toLowerCase())) continue

            // 슬롯 필터
            if (slotPos && item.slotPos !== slotPos) continue

            // 중복 체크
            if (!itemMap.has(item.id)) {
                itemMap.set(item.id, {
                    itemId: item.id,
                    name: item.name,
                    categoryName: item.categoryName,
                    grade: item.grade || 'Common',
                    itemLevel: item.itemLevel || 0,
                    icon: item.icon || '',
                    slotPos: item.slotPos,
                    slotName: SLOT_POS_MAP[item.slotPos] || '기타'
                })
            }
        }
    }

    // 아이템 레벨 내림차순 정렬 후 제한
    return Array.from(itemMap.values())
        .sort((a, b) => b.itemLevel - a.itemLevel)
        .slice(0, limit)
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams

    const keyword = searchParams.get('keyword') || searchParams.get('q') || ''
    const category = searchParams.get('category')
    const slotPos = searchParams.get('slot')
    const grade = searchParams.get('grade')
    const page = parseInt(searchParams.get('page') || '1')
    const source = searchParams.get('source') || 'all' // 'official', 'local', 'all'

    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase credentials')
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        let results: any[] = []
        let officialApiAvailable = false

        // 공식 API 검색 시도 (source가 'official' 또는 'all'인 경우)
        if (source === 'official' || source === 'all') {
            const officialResult = await searchOfficialAPI(keyword, category ?? undefined, grade ?? undefined, page)
            if (officialResult.success && officialResult.data) {
                officialApiAvailable = true
                // 공식 API 응답 형식에 맞게 변환 (실제 응답 구조에 따라 조정 필요)
                const rawItems = officialResult.data.list || officialResult.data.items || officialResult.data.data || []
                results = rawItems.map((item: any) => ({
                    itemId: item.id || item.itemId,
                    name: item.name,
                    categoryName: item.categoryName || item.category,
                    grade: item.grade,
                    itemLevel: item.itemLevel || item.level,
                    icon: item.icon || item.image,
                    slotPos: item.slotPos,
                    slotName: item.slotPos ? (SLOT_POS_MAP[item.slotPos] || '기타') : ''
                }))
            }
        }

        // 로컬 DB 검색 (source가 'local' 또는 공식 API 실패 시)
        if (source === 'local' || (source === 'all' && results.length === 0)) {
            // 먼저 items 테이블 검색
            let localResults = await searchLocalDB(
                supabase,
                keyword,
                slotPos ? parseInt(slotPos) : undefined,
                grade || undefined
            )

            // items 테이블이 비어있으면 캐릭터 장비에서 검색
            if (localResults.length === 0) {
                localResults = await searchFromEquipment(
                    supabase,
                    keyword,
                    slotPos ? parseInt(slotPos) : undefined
                )
            }

            // 결과 병합 (중복 제거)
            if (results.length === 0) {
                results = localResults
            } else {
                const existingIds = new Set(results.map(r => r.itemId))
                for (const item of localResults) {
                    if (!existingIds.has(item.itemId)) {
                        results.push(item)
                    }
                }
            }
        }

        return NextResponse.json({
            data: results,
            meta: {
                keyword,
                category,
                slotPos,
                grade,
                page,
                total: results.length,
                officialApiAvailable
            }
        })

    } catch (err: any) {
        console.error('[Item Search API Error]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
