import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://mnbngmdjiszyowfvnzhk.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uYm5nbWRqaXN6eW93ZnZuemhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5OTY0ODAsImV4cCI6MjA4MjU3MjQ4MH0.AIvvGxd_iQKpQDbmOBoe4yAmii1IpB92Pp7Scs8Lz7U'

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY
  return createClient(supabaseUrl, supabaseKey)
}

// 유저 조회 또는 자동 생성 (device_id용)
async function getOrCreateUserByDeviceId(device_id: string) {
  const supabase = getSupabase()
  const { data: existingUser } = await supabase
    .from('ledger_users')
    .select('id')
    .eq('device_id', device_id)
    .single()

  if (existingUser) return existingUser

  const { data: newUser, error } = await supabase
    .from('ledger_users')
    .insert({ device_id })
    .select('id')
    .single()

  if (error) {
    console.error('[API] Failed to create user:', error)
    return null
  }

  return newUser
}

// 인증된 유저 또는 device_id 유저 조회
async function getUserFromRequest(request: Request) {
  const supabase = getSupabase()

  // 1. Bearer 토큰으로 인증 확인
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (user && !error) {
      let { data: ledgerUser } = await supabase
        .from('ledger_users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (!ledgerUser) {
        const { data: newLedgerUser } = await supabase
          .from('ledger_users')
          .insert({
            auth_user_id: user.id,
            created_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString()
          })
          .select('id')
          .single()

        ledgerUser = newLedgerUser
      }

      if (ledgerUser) return ledgerUser
    }
  }

  // 2. device_id로 조회 (폴백)
  const device_id = request.headers.get('x-device-id')
  if (device_id) {
    return getOrCreateUserByDeviceId(device_id)
  }

  return null
}

// GET: 특정 캐릭터의 특정 날짜 컨텐츠 기록 조회
export async function GET(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const characterId = searchParams.get('characterId')
  const date = searchParams.get('date')

  if (!characterId || !date) {
    return NextResponse.json({ error: 'Missing characterId or date' }, { status: 400 })
  }

  try {
    const supabase = getSupabase()

    // 캐릭터가 현재 유저 소유인지 확인
    const { data: character } = await supabase
      .from('ledger_characters')
      .select('id')
      .eq('id', characterId)
      .eq('user_id', user.id)
      .single()

    if (!character) {
      return NextResponse.json({ error: 'Character not found or access denied' }, { status: 403 })
    }

    const { data: records, error } = await supabase
      .from('ledger_content_records')
      .select('*')
      .eq('character_id', characterId)
      .eq('record_date', date)

    if (error) {
      // 테이블이 없으면 빈 배열 반환
      if (error.code === '42P01') {
        return NextResponse.json([])
      }
      throw error
    }

    return NextResponse.json(records || [])
  } catch (e: any) {
    console.error('[Content Records] Get error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST: 컨텐츠 기록 생성 또는 업데이트
export async function POST(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const {
      characterId,
      date,
      content_type,
      dungeon_tier,
      max_count,
      completion_count,
      is_double,
      base_kina
    } = body

    if (!characterId || !date || !content_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = getSupabase()

    // 캐릭터가 현재 유저 소유인지 확인
    const { data: character } = await supabase
      .from('ledger_characters')
      .select('id')
      .eq('id', characterId)
      .eq('user_id', user.id)
      .single()

    if (!character) {
      return NextResponse.json({ error: 'Character not found or access denied' }, { status: 403 })
    }

    // 총 금액 계산
    const total_kina = completion_count * base_kina * (is_double ? 2 : 1)

    // Upsert: 기존 기록이 있으면 업데이트, 없으면 생성
    const { data: existing } = await supabase
      .from('ledger_content_records')
      .select('id')
      .eq('character_id', characterId)
      .eq('record_date', date)
      .eq('content_type', content_type)
      .single()

    let result
    if (existing) {
      // 업데이트
      const { data, error } = await supabase
        .from('ledger_content_records')
        .update({
          dungeon_tier,
          max_count,
          completion_count,
          is_double,
          base_kina,
          total_kina,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // 생성
      const { data, error } = await supabase
        .from('ledger_content_records')
        .insert({
          character_id: characterId,
          record_date: date,
          content_type,
          dungeon_tier,
          max_count,
          completion_count,
          is_double,
          base_kina,
          total_kina
        })
        .select()
        .single()

      if (error) throw error
      result = data
    }

    return NextResponse.json(result)
  } catch (e: any) {
    console.error('Save content record error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE: 컨텐츠 기록 삭제
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  try {
    const supabase = getSupabase()
    const { error } = await supabase
      .from('ledger_content_records')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
