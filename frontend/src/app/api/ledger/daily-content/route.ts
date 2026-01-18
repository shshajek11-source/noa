import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabaseClient'
import { getUserFromRequest } from '../../../../lib/auth'

// GET: Fetch daily content records for a character and date
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const characterId = searchParams.get('characterId')
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    if (!characterId) {
      return NextResponse.json({ error: 'Character ID is required' }, { status: 400 })
    }

    // Verify character ownership
    const { data: character } = await supabase
      .from('ledger_characters')
      .select('id')
      .eq('id', characterId)
      .eq('user_id', user.id)
      .single()

    if (!character) {
      return NextResponse.json({ error: 'Character not found or access denied' }, { status: 403 })
    }

    // Fetch daily content records
    const { data, error } = await supabase
      .from('ledger_daily_content')
      .select('*')
      .eq('character_id', characterId)
      .eq('record_date', date)

    if (error) {
      console.error('Error fetching daily content:', error)
      return NextResponse.json({ error: 'Failed to fetch daily content' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error in GET /api/ledger/daily-content:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Create or update daily content record
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { characterId, date, contentId, maxCount, completionCount, baseReward } = body

    if (!characterId || !date || !contentId || maxCount === undefined || completionCount === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify character ownership
    const { data: character } = await supabase
      .from('ledger_characters')
      .select('id')
      .eq('id', characterId)
      .eq('user_id', user.id)
      .single()

    if (!character) {
      return NextResponse.json({ error: 'Character not found or access denied' }, { status: 403 })
    }

    // Upsert daily content record
    const { data, error } = await supabase
      .from('ledger_daily_content')
      .upsert({
        character_id: characterId,
        record_date: date,
        content_id: contentId,
        max_count: maxCount,
        completion_count: completionCount,
        base_reward: baseReward,
        total_reward: completionCount * baseReward
      }, {
        onConflict: 'character_id,record_date,content_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving daily content:', error)
      return NextResponse.json({ error: 'Failed to save daily content' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in POST /api/ledger/daily-content:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
