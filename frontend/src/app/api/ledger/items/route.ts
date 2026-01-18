import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, getUserFromRequest } from '../../../../lib/auth'
import { verifyCharacterOwnership } from '../../../../lib/ledgerAuth'
import { getKoreanGameDate } from '../../../../lib/koreanDate'

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
      item_id,
      icon_url
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

    // icon_url 컬럼이 없을 수 있으므로 fallback 처리
    const insertDataWithIcon = {
      ledger_character_id: characterId,
      item_id,
      item_name,
      item_category,
      item_grade,
      quantity: finalQuantity,
      unit_price: finalUnitPrice,
      total_price: finalTotalPrice,
      obtained_date: getKoreanGameDate(),
      source_content,
      icon_url
    }

    let result = await supabase
      .from('ledger_items')
      .insert(insertDataWithIcon)
      .select()
      .single()

    // icon_url 컬럼이 없으면 제외하고 다시 시도
    if (result.error && result.error.message.includes('icon_url')) {
      console.log('[API ledger/items] icon_url column not found, retrying without it')
      const { icon_url: _, ...insertDataWithoutIcon } = insertDataWithIcon
      result = await supabase
        .from('ledger_items')
        .insert(insertDataWithoutIcon)
        .select()
        .single()
    }

    const { data, error } = result
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
