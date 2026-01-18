import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
    try {
        const { characterId, noaScore, pveScore, pvpScore } = await request.json()

        if (!characterId) {
            return NextResponse.json(
                { error: 'Invalid request: characterId is required' },
                { status: 400 }
            )
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json(
                { error: 'Supabase credentials missing' },
                { status: 500 }
            )
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        // PVE/PVP 점수 저장 (noa_score는 pve_score와 동일하게 유지)
        const updateData: Record<string, number> = {}
        if (typeof pveScore === 'number') {
            updateData.pve_score = pveScore
            updateData.noa_score = pveScore // 호환성 유지
        } else if (typeof noaScore === 'number') {
            updateData.noa_score = noaScore
            updateData.pve_score = noaScore
        }
        if (typeof pvpScore === 'number') {
            updateData.pvp_score = pvpScore
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: 'No valid scores provided' },
                { status: 400 }
            )
        }

        const { error } = await supabase
            .from('characters')
            .update(updateData)
            .eq('character_id', characterId)

        if (error) {
            console.error('[save-score] Update error:', error)
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json({ success: true, ...updateData })

    } catch (err: any) {
        console.error('[save-score] Error:', err)
        return NextResponse.json(
            { error: err.message || 'Internal Server Error' },
            { status: 500 }
        )
    }
}
