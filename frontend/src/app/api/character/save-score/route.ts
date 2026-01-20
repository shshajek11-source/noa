import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { characterId, noaScore, pveScore, pvpScore } = body

        console.log('[save-score] Request body:', JSON.stringify(body))

        if (!characterId) {
            console.log('[save-score] Missing characterId')
            return NextResponse.json(
                { error: 'Invalid request: characterId is required' },
                { status: 400 }
            )
        }

        console.log('[save-score] characterId:', characterId, 'pveScore:', pveScore, 'pvpScore:', pvpScore)

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json(
                { error: 'Supabase credentials missing' },
                { status: 500 }
            )
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        // PVE/PVP 점수 저장
        const updateData: Record<string, number> = {}
        if (typeof pveScore === 'number') {
            updateData.pve_score = pveScore
        } else if (typeof noaScore === 'number') {
            // noaScore가 전달된 경우 pve_score로 저장 (하위 호환)
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

        console.log('[save-score] Updating character_id:', characterId, 'with data:', updateData)

        const { data, error } = await supabase
            .from('characters')
            .update(updateData)
            .eq('character_id', characterId)
            .select()

        console.log('[save-score] Update result - data:', data, 'error:', error)

        if (error) {
            console.error('[save-score] Update error:', error)
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            )
        }

        if (!data || data.length === 0) {
            console.log('[save-score] No rows updated - character_id may not exist:', characterId)
            return NextResponse.json({ success: true, warning: 'No rows updated', ...updateData })
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
