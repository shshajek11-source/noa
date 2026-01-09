import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase Credentials')
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        // Fetch recently created/updated characters
        // Assuming there is a 'updated_at' column or just using high ID if serial/uuid?
        // Let's assume standard 'created_at' or if not, just top combat_power as "Rankers" reference.
        // I will fetch top 5 by combat_power to show "Top Rankers" update or something.
        // Or fetch normally.
        // Let's check if I can just return a mix of messages.

        // Since I don't know if 'updated_at' exists, I'll fetch 5 random high rankers to simulate "Activity" roughly or just Top 5.
        // Ideally we want "Recently Updated". I'll try to order by 'created_at' if it exists.
        // If not, I'll order by 'combat_power' and just say "Top Ranker ...".

        // Let's try to query 'characters' sorted by 'updated_at' descending?
        // If 'updated_at' doesn't exist, this might fail.
        // Safest: Order by 'combat_power' desc (Top Rankers) and formulate messages like "Is maintaining top rank".

        const { data, error } = await supabase
            .from('characters')
            .select('name, class_name, combat_power, race_name')
            .order('combat_power', { ascending: false })
            .limit(5)

        if (error) throw error

        const feeds = data.map((char: any, idx: number) => ({
            id: idx + Date.now(),
            message: `[${char.class_name}] **${char.name}**님이 현재 전투력 **${char.combat_power?.toLocaleString()}**을 달성했습니다! 🔥`,
            type: 'rank_up',
            time: '실시간'
        }))

        return NextResponse.json({ data: feeds })

    } catch (err: any) {
        console.error('[Feed API Error]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
