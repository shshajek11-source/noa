import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    // 인증 검증
    const auth = verifyAdminAuth(request)
    if (!auth.authorized) {
        return auth.error!
    }
    const { searchParams } = new URL(request.url)
    const dryRun = searchParams.get('dryRun') === 'true'

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

    if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json({ error: 'Missing Supabase Credentials' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    try {
        if (dryRun) {
            const { count: elyosCount, error: elyosError } = await supabase
                .from('characters')
                .select('character_id', { count: 'exact', head: true })
                .gte('server_id', 1000)
                .lt('server_id', 2000)
                .neq('race_name', 'Elyos')

            if (elyosError) {
                return NextResponse.json({ error: elyosError.message }, { status: 500 })
            }

            const { count: asmodianCount, error: asmodianError } = await supabase
                .from('characters')
                .select('character_id', { count: 'exact', head: true })
                .gte('server_id', 2000)
                .lt('server_id', 3000)
                .neq('race_name', 'Asmodian')

            if (asmodianError) {
                return NextResponse.json({ error: asmodianError.message }, { status: 500 })
            }

            return NextResponse.json({
                dryRun: true,
                elyosToFix: elyosCount || 0,
                asmodianToFix: asmodianCount || 0
            })
        }

        const { count: elyosUpdated, error: elyosError } = await supabase
            .from('characters')
            .update({ race_name: 'Elyos' }, { count: 'exact' })
            .gte('server_id', 1000)
            .lt('server_id', 2000)
            .neq('race_name', 'Elyos')

        if (elyosError) {
            return NextResponse.json({ error: elyosError.message }, { status: 500 })
        }

        const { count: asmodianUpdated, error: asmodianError } = await supabase
            .from('characters')
            .update({ race_name: 'Asmodian' }, { count: 'exact' })
            .gte('server_id', 2000)
            .lt('server_id', 3000)
            .neq('race_name', 'Asmodian')

        if (asmodianError) {
            return NextResponse.json({ error: asmodianError.message }, { status: 500 })
        }

        return NextResponse.json({
            dryRun: false,
            elyosUpdated: elyosUpdated || 0,
            asmodianUpdated: asmodianUpdated || 0
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
