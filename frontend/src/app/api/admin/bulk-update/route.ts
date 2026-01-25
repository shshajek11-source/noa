import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyAdminAuth } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5분 타임아웃

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// 캐릭터 업데이트 함수
async function updateCharacter(characterId: string, serverId: number, baseUrl: string) {
    try {
        const url = `${baseUrl}/api/character?id=${encodeURIComponent(characterId)}&server=${serverId}`
        const res = await fetch(url, { cache: 'no-store' })

        if (!res.ok) {
            return { success: false, error: `HTTP ${res.status}` }
        }

        const data = await res.json()
        if (data.profile) {
            const itemLevel = data.stats?.statList?.find((s: any) => s.name === '아이템레벨')?.value || 0
            return { success: true, itemLevel, noaScore: data.profile.pve_score }
        }
        return { success: false, error: 'No profile data' }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

export async function POST(request: NextRequest) {
    // 인증 검증
    const auth = verifyAdminAuth(request)
    if (!auth.authorized) {
        return auth.error!
    }

    try {
        const body = await request.json()
        const { action, batchSize = 10 } = body

        // 요청의 origin에서 baseUrl 추출
        const baseUrl = request.nextUrl.origin

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json({ error: 'Supabase credentials missing' }, { status: 500 })
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        if (action === 'status') {
            // 현재 상태 반환
            const { count: totalCount } = await supabase
                .from('characters')
                .select('*', { count: 'exact', head: true })

            const { count: updatedCount } = await supabase
                .from('characters')
                .select('*', { count: 'exact', head: true })
                .gt('item_level', 0)

            return NextResponse.json({
                total: totalCount || 0,
                updated: updatedCount || 0,
                pending: (totalCount || 0) - (updatedCount || 0)
            })
        }

        if (action === 'update') {
            // 업데이트가 필요한 캐릭터 가져오기
            const { data: characters, error } = await supabase
                .from('characters')
                .select('character_id, server_id, name')
                .or('item_level.is.null,item_level.eq.0')
                .order('created_at', { ascending: false })
                .limit(batchSize)

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 })
            }

            if (!characters || characters.length === 0) {
                return NextResponse.json({
                    message: 'All characters are up to date',
                    updated: 0,
                    remaining: 0
                })
            }

            // 배치 업데이트 실행
            const results = []
            for (const char of characters) {
                const result = await updateCharacter(char.character_id, char.server_id, baseUrl)
                results.push({
                    name: char.name,
                    ...result
                })

                // API 부하 방지
                await new Promise(resolve => setTimeout(resolve, 500))
            }

            const successCount = results.filter(r => r.success).length

            // 남은 캐릭터 수 확인
            const { count: remainingCount } = await supabase
                .from('characters')
                .select('*', { count: 'exact', head: true })
                .or('item_level.is.null,item_level.eq.0')

            return NextResponse.json({
                updated: successCount,
                failed: results.length - successCount,
                remaining: remainingCount || 0,
                results
            })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    } catch (err: any) {
        console.error('[Bulk Update Error]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    // 인증 검증
    const auth = verifyAdminAuth(request)
    if (!auth.authorized) {
        return auth.error!
    }

    // GET으로 상태 확인
    if (!supabaseUrl || !supabaseKey) {
        return NextResponse.json({ error: 'Supabase credentials missing' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { count: totalCount } = await supabase
        .from('characters')
        .select('*', { count: 'exact', head: true })

    const { count: updatedCount } = await supabase
        .from('characters')
        .select('*', { count: 'exact', head: true })
        .gt('item_level', 0)

    return NextResponse.json({
        total: totalCount || 0,
        updated: updatedCount || 0,
        pending: (totalCount || 0) - (updatedCount || 0)
    })
}
