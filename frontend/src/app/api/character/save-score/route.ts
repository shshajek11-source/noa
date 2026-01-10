import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
    try {
        const { characterId, noaScore } = await request.json()

        if (!characterId || typeof noaScore !== 'number') {
            return NextResponse.json(
                { error: 'Invalid request: characterId and noaScore are required' },
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

        const { error } = await supabase
            .from('characters')
            .update({ noa_score: noaScore })
            .eq('character_id', characterId)

        if (error) {
            console.error('[save-score] Update error:', error)
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json({ success: true, noaScore })

    } catch (err: any) {
        console.error('[save-score] Error:', err)
        return NextResponse.json(
            { error: err.message || 'Internal Server Error' },
            { status: 500 }
        )
    }
}
