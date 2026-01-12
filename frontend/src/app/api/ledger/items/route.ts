import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

// GET: 아이템 목록 조회
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const characterId = searchParams.get('characterId')
  const category = searchParams.get('category')
  const sold = searchParams.get('sold') // 'true', 'false', or null for all

  if (!characterId) {
    return NextResponse.json({ error: 'Missing characterId' }, { status: 400 })
  }

  try {
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
export async function POST(request: Request) {
  const device_id = request.headers.get('x-device-id')
  if (!device_id) return NextResponse.json({ error: 'Missing Device ID' }, { status: 401 })

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

    const finalQuantity = quantity || 1
    const finalUnitPrice = unit_price || 0
    const finalTotalPrice = total_price !== undefined ? total_price : finalQuantity * finalUnitPrice

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
export async function PATCH(request: Request) {
  const device_id = request.headers.get('x-device-id')
  if (!device_id) return NextResponse.json({ error: 'Missing Device ID' }, { status: 401 })

  try {
    const body = await request.json()
    const { id, ...updateFields } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing item id' }, { status: 400 })
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
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  try {
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
