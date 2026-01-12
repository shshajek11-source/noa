import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service Role 키를 사용하여 RLS 우회 (런타임에 생성)
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
  // 기존 유저 조회
  const { data: existingUser } = await supabase
    .from('ledger_users')
    .select('id')
    .eq('device_id', device_id)
    .single()

  if (existingUser) return existingUser

  // 유저가 없으면 자동 생성
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
      // auth_user_id로 ledger_users 조회
      let { data: ledgerUser } = await supabase
        .from('ledger_users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      // ledger_users 레코드가 없으면 자동 생성
      if (!ledgerUser) {
        console.log('[API] Creating ledger_users for auth_user_id:', user.id)
        const { data: newLedgerUser, error: createError } = await supabase
          .from('ledger_users')
          .insert({
            auth_user_id: user.id,
            created_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString()
          })
          .select('id')
          .single()

        if (createError) {
          console.error('[API] Failed to create ledger_users:', createError)
          return null
        }

        ledgerUser = newLedgerUser
        console.log('[API] Created ledger_users:', ledgerUser)
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

export async function GET(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabase()

  // 대표 캐릭터 자동 추가 로직 (Google 로그인 사용자만)
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const { data: { user: authUser } } = await supabase.auth.getUser(token)

    if (authUser) {
      // ledger_users에서 main_character_id 조회
      const { data: ledgerUser } = await supabase
        .from('ledger_users')
        .select('main_character_id, main_character_name, main_character_server, main_character_class, main_character_level, main_character_race, main_character_item_level, main_character_image_url')
        .eq('auth_user_id', authUser.id)
        .single()

      // 대표 캐릭터가 설정되어 있으면
      if (ledgerUser?.main_character_id) {
        // 가계부에 이미 있는지 확인
        const { data: existing } = await supabase
          .from('ledger_characters')
          .select('id')
          .eq('user_id', user.id)
          .eq('character_id', ledgerUser.main_character_id)
          .single()

        // 없으면 자동 추가
        if (!existing) {
          console.log('[Ledger Characters] Auto-adding main character to ledger:', ledgerUser.main_character_name)
          await supabase
            .from('ledger_characters')
            .insert({
              user_id: user.id,
              character_id: ledgerUser.main_character_id,
              name: ledgerUser.main_character_name || 'Unknown',
              class_name: ledgerUser.main_character_class || 'Unknown',
              server_name: ledgerUser.main_character_server || 'Unknown',
              race: ledgerUser.main_character_race,
              item_level: ledgerUser.main_character_item_level,
              profile_image: ledgerUser.main_character_image_url,
              is_main: true,
              display_order: 0
            })
        }
      }
    }
  }

  const { data: characters, error } = await supabase
    .from('ledger_characters')
    .select('*')
    .eq('user_id', user.id)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Calculate today's income
  const today = new Date().toISOString().split('T')[0]

  const characterIds = characters.map(c => c.id)
  if (characterIds.length > 0) {
      const { data: records } = await supabase
        .from('ledger_daily_records')
        .select(`
            character_id,
            ledger_record_items ( price, count )
        `)
        .in('character_id', characterIds)
        .eq('date', today)

      const incomeMap = new Map<string, number>()
      if (records) {
        records.forEach((rec: any) => {
            const total = rec.ledger_record_items?.reduce((sum: number, item: any) => sum + ((item.price || 0) * (item.count || 1)), 0) || 0
            incomeMap.set(rec.character_id, total)
        })
      }

      const result = characters.map(c => ({
          ...c,
          income: incomeMap.get(c.id) || 0
      }))
      return NextResponse.json(result)
  }

  return NextResponse.json(characters)
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { name, class_name, server_name, is_main, profile_image, character_id, race, item_level } = body

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const supabase = getSupabase()
    const { data, error } = await supabase
        .from('ledger_characters')
        .insert({
            user_id: user.id,
            name,
            class_name: class_name || 'Unknown',
            server_name: server_name || 'Unknown',
            is_main: is_main || false,
            profile_image: profile_image || null,
            character_id: character_id || null,
            race: race || null,
            item_level: item_level || null
        })
        .select()
        .single()

    if (error) {
        console.error('[API] Insert failed:', error)
        throw error
    }
    return NextResponse.json(data)
  } catch (e: any) {
      console.error('[API] Create character error:', e)
      return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
