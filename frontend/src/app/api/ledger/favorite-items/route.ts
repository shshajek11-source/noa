import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, getUserFromRequest } from '../../../../lib/auth'
import { verifyCharacterOwnership } from '../../../../lib/ledgerAuth'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const characterId = searchParams.get('characterId')

    if (!characterId) {
      return NextResponse.json({ error: 'Character ID is required' }, { status: 400 })
    }

    // 캐릭터 소유권 검증
    const isOwner = await verifyCharacterOwnership(characterId, user.id)
    if (!isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // 즐겨찾기 목록 조회
    const supabase = getSupabase()
    const { data: favorites, error } = await supabase
      .from('ledger_favorite_items')
      .select('*')
      .eq('character_id', characterId)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Fetch favorites error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(favorites || [])
  } catch (error: any) {
    console.error('GET /api/ledger/favorite-items error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { characterId, item_id, item_name, item_grade, item_category, icon_url } = body

    if (!characterId || !item_id || !item_name || !item_grade || !item_category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 캐릭터 소유권 검증
    const isOwner = await verifyCharacterOwnership(characterId, user.id)
    if (!isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const supabase = getSupabase()

    // 이미 즐겨찾기에 있는지 확인
    const { data: existing } = await supabase
      .from('ledger_favorite_items')
      .select('id')
      .eq('character_id', characterId)
      .eq('item_id', item_id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Already in favorites' }, { status: 409 })
    }

    // 다음 display_order 계산
    const { data: lastFavorite } = await supabase
      .from('ledger_favorite_items')
      .select('display_order')
      .eq('character_id', characterId)
      .order('display_order', { ascending: false })
      .limit(1)
      .single()

    const nextOrder = (lastFavorite?.display_order || 0) + 1

    // 즐겨찾기 추가 (icon_url 컬럼이 없을 수 있으므로 fallback 처리)
    let newFavorite = null
    let error = null

    // 먼저 icon_url 포함해서 시도
    const insertDataWithIcon = {
      character_id: characterId,
      item_id,
      item_name,
      item_grade,
      item_category,
      icon_url: icon_url || null,
      display_order: nextOrder
    }

    const result1 = await supabase
      .from('ledger_favorite_items')
      .insert(insertDataWithIcon)
      .select()
      .single()

    if (result1.error && result1.error.message.includes('icon_url')) {
      // icon_url 컬럼이 없으면 제외하고 다시 시도
      console.log('[API favorite-items] icon_url column not found, retrying without it')
      const insertDataWithoutIcon = {
        character_id: characterId,
        item_id,
        item_name,
        item_grade,
        item_category,
        display_order: nextOrder
      }

      const result2 = await supabase
        .from('ledger_favorite_items')
        .insert(insertDataWithoutIcon)
        .select()
        .single()

      newFavorite = result2.data
      error = result2.error
    } else {
      newFavorite = result1.data
      error = result1.error
    }

    if (error) {
      console.error('Add favorite error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(newFavorite)
  } catch (error: any) {
    console.error('POST /api/ledger/favorite-items error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Favorite ID is required' }, { status: 400 })
    }

    const supabase = getSupabase()

    // 즐겨찾기 조회 및 소유권 검증
    const { data: favorite, error: fetchError } = await supabase
      .from('ledger_favorite_items')
      .select('character_id')
      .eq('id', id)
      .single()

    if (fetchError || !favorite) {
      return NextResponse.json({ error: 'Favorite not found' }, { status: 404 })
    }

    const isOwner = await verifyCharacterOwnership(favorite.character_id, user.id)
    if (!isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // 즐겨찾기 삭제
    const { error: deleteError } = await supabase
      .from('ledger_favorite_items')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Delete favorite error:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE /api/ledger/favorite-items error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
