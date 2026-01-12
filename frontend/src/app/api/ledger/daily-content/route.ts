import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://mnbngmdjiszyowfvnzhk.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uYm5nbWRqaXN6eW93ZnZuemhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY1NzQ0NDYsImV4cCI6MjA1MjE1MDQ0Nn0.Ie3y7hN_lmYP_1z5wfUUH0z-K9_kVqNqxD-yJIJp-Qo'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function getUserFromRequest(request: Request) {
  const authHeader = request.headers.get('authorization')
  const deviceIdHeader = request.headers.get('x-device-id')

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (user && !error) {
      const { data } = await supabase
        .from('ledger_users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()
      return data
    }
  }

  if (deviceIdHeader) {
    const { data } = await supabase
      .from('ledger_users')
      .select('id')
      .eq('device_id', deviceIdHeader)
      .single()
    return data
  }

  return null
}

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
