import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase 클라이언트 생성
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
    console.error('[Items API] Failed to create user:', error)
    return null
  }

  return newUser
}

// 인증된 유저 또는 device_id 유저 조회
async function getUserFromRequest(request: NextRequest) {
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
        console.log('[Items API] Creating ledger_users for auth_user_id:', user.id)
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
          console.error('[Items API] Failed to create ledger_users:', createError)
          return null
        }

        ledgerUser = newLedgerUser
      }

      if (ledgerUser) return ledgerUser
    }
  }

  // 2. device_id로 조회 (폴백)
  const device_id = request.headers.get('X-Device-ID') || request.headers.get('x-device-id')
  if (device_id) {
    return getOrCreateUserByDeviceId(device_id)
  }

  return null
}

// 캐릭터 소유권 검증
async function verifyCharacterOwnership(characterId: string, userId: string): Promise<boolean> {
  const supabase = getSupabase()
  const { data: character } = await supabase
    .from('ledger_characters')
    .select('user_id')
    .eq('id', characterId)
    .single()

  if (!character) return false

  // character.user_id가 ledger_users.id와 일치하면 소유권 확인
  return character.user_id === userId
}

// GET: 아이템 목록 조회
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const characterId = searchParams.get('characterId')
  const category = searchParams.get('category')
  const sold = searchParams.get('sold') // 'true', 'false', or null for all

  if (!characterId) {
    return NextResponse.json({ error: 'Missing characterId' }, { status: 400 })
  }

  // 캐릭터 소유권 검증
  const isOwner = await verifyCharacterOwnership(characterId, user.id)
  if (!isOwner) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const supabase = getSupabase()
    let query = supabase
      .from('ledger_items')
      .select('*')
      .eq('ledger_character_id', characterId)
      .order('created_at', { ascending: false })

    if (category && category !== 'all') {
      query = query.eq('item_category', category)
    }

    if (sold === 'true') {
      query = query.not('sold_price', 'is', null)
    } else if (sold === 'false') {
      query = query.is('sold_price', null)
    }

    const { data: items, error } = await query

    if (error) {
      // 테이블이 없으면 빈 배열 반환
      if (error.code === '42P01') {
        return NextResponse.json([])
      }
      throw error
    }

    return NextResponse.json(items || [])
  } catch (e: any) {
    console.error('Get items error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST: 아이템 등록
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      characterId,
      item_name,
      item_category,
      item_grade,
      quantity,
      unit_price,
      total_price,
      source_content,
      item_id
    } = body

    if (!characterId || !item_name || !item_category || !item_grade) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 캐릭터 소유권 검증
    const isOwner = await verifyCharacterOwnership(characterId, user.id)
    if (!isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const finalQuantity = quantity || 1
    const finalUnitPrice = unit_price || 0
    const finalTotalPrice = total_price !== undefined ? total_price : finalQuantity * finalUnitPrice

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('ledger_items')
      .insert({
        ledger_character_id: characterId,
        item_id,
        item_name,
        item_category,
        item_grade,
        quantity: finalQuantity,
        unit_price: finalUnitPrice,
        total_price: finalTotalPrice,
        obtained_date: new Date().toISOString().split('T')[0],
        source_content
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (e: any) {
    console.error('Create item error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PATCH: 아이템 업데이트 (quantity, unit_price, total_price, sold_price, sold_date 등)
export async function PATCH(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, ...updateFields } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing item id' }, { status: 400 })
    }

    const supabase = getSupabase()

    // 아이템 조회 및 소유권 검증
    const { data: item } = await supabase
      .from('ledger_items')
      .select('ledger_character_id')
      .eq('id', id)
      .single()

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const isOwner = await verifyCharacterOwnership(item.ledger_character_id, user.id)
    if (!isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // 허용된 필드만 업데이트
    const allowedFields = [
      'quantity',
      'unit_price',
      'total_price',
      'sold_price',
      'sold_date',
      'item_name',
      'item_category',
      'item_grade',
      'source_content'
    ]

    const updates: any = {
      updated_at: new Date().toISOString()
    }

    for (const field of allowedFields) {
      if (field in updateFields) {
        updates[field] = updateFields[field]
      }
    }

    const { data, error } = await supabase
      .from('ledger_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (e: any) {
    console.error('Update item error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE: 아이템 삭제
export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  try {
    const supabase = getSupabase()

    // 아이템 조회 및 소유권 검증
    const { data: item } = await supabase
      .from('ledger_items')
      .select('ledger_character_id')
      .eq('id', id)
      .single()

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const isOwner = await verifyCharacterOwnership(item.ledger_character_id, user.id)
    if (!isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { error } = await supabase
      .from('ledger_items')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
