import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const serverId = searchParams.get('serverId') || '2002' // Default to Zikel
    const type = searchParams.get('type') || '1' // Default to Abyss (1)

    // Official API URL
    const apiUrl = `https://aion2.plaync.com/api/ranking/list?lang=ko&rankingContentsType=${type}&rankingType=0&serverId=${serverId}&characterId=`

    try {
        console.log(`[Sync] Fetching official ranking from: ${apiUrl}`)

        const res = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://aion2.plaync.com/'
            }
        })

        if (!res.ok) {
            throw new Error(`Official API returned ${res.status}`)
        }

        const json = await res.json()
        const list = json.rankingList || []

        console.log(`[Sync] Found ${list.length} characters in ranking list.`)
        if (list.length > 0) {
            console.log('[Sync] First item example:', JSON.stringify(list[0], null, 2))
        }

        if (list.length === 0) {
            return NextResponse.json({ message: 'No characters found', count: 0 })
        }

        // Prepare data for upsert
        const serverIdNum = parseInt(serverId)
        // Race inference: 1000-1999 = Elyos, 2000-2999 = Asmodian
        // Note: Check if range is correct. Based on server list, 1xxx and 2xxx.
        const raceName = (serverIdNum >= 1000 && serverIdNum < 2000) ? 'Elyos' : 'Asmodian'

        const upsertData = list.map((item: any) => ({
            character_id: item.characterId, // Use official ID as external ID
            name: item.characterName,
            server_id: serverId,
            race_name: raceName,
            class_name: item.className,
            // ranking_ap: item.point, // Map point to ranking_ap
            // If type is 1 (Abyss), map to ranking_ap. For others, maybe just save to rankings json?
            // For now, let's map type 1 to ranking_ap.
            ...(type === '1' ? { ranking_ap: item.point } : {}),
            profile_image: item.profileImage,
            level: 0, // API doesn't provide level in this list, default to 0
            updated_at: new Date().toISOString(),
            // Ensure other required fields have defaults or are nullable
            rankings: {
                // Store the raw rank and point for this specific type
                [`type_${type}`]: {
                    rank: item.rank,
                    point: item.point,
                    updated_at: new Date().toISOString()
                }
            }
        }))

        // Upsert options
        // We use upsert to update existing records or insert new ones.
        // We match on 'character_id' (unique external ID).
        const { error } = await supabase
            .from('characters')
            .upsert(upsertData, {
                onConflict: 'character_id',
                ignoreDuplicates: false
            })

        if (error) {
            console.error('[Sync] Supabase Upsert Error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            message: 'Synchronization successful',
            count: upsertData.length,
            server: serverId,
            type: type,
            data: upsertData,
            firstItemRaw: list.length > 0 ? list[0] : null
        })

    } catch (error: any) {
        console.error('[Sync] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
