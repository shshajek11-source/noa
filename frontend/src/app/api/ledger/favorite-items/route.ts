import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const characterId = searchParams.get('characterId')

    if (!characterId) {
      return NextResponse.json({ error: 'Character ID is required' }, { status: 400 })
    }

    // 캐릭터 소유권 검증 (device_id 또는 Google 로그인)
    const deviceId = request.headers.get('X-Device-ID')
    const userId = request.headers.get('X-User-ID')

    const { data: character, error: charError } = await supabase
      .from('ledger_characters')
      .select('id, user_id')
      .eq('id', characterId)
      .single()

    if (charError || !character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }

    // 소유권 검증
    const isOwner = character.user_id === deviceId || character.user_id === userId
    if (!isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // 즐겨찾기 목록 조회
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
  try {
    const body = await request.json()
    const { characterId, item_id, item_name, item_grade, item_category } = body

    if (!characterId || !item_id || !item_name || !item_grade || !item_category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 캐릭터 소유권 검증
    const deviceId = request.headers.get('X-Device-ID')
    const userId = request.headers.get('X-User-ID')

    const { data: character, error: charError } = await supabase
      .from('ledger_characters')
      .select('id, user_id')
      .eq('id', characterId)
      .single()

    if (charError || !character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }

    const isOwner = character.user_id === deviceId || character.user_id === userId
    if (!isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

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

    // 즐겨찾기 추가
    const { data: newFavorite, error } = await supabase
      .from('ledger_favorite_items')
      .insert({
        character_id: characterId,
        item_id,
        item_name,
        item_grade,
        item_category,
        display_order: nextOrder
      })
      .select()
      .single()

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
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Favorite ID is required' }, { status: 400 })
    }

    // 즐겨찾기 조회 및 소유권 검증
    const deviceId = request.headers.get('X-Device-ID')
    const userId = request.headers.get('X-User-ID')

    const { data: favorite, error: fetchError } = await supabase
      .from('ledger_favorite_items')
      .select('character_id, ledger_characters!inner(user_id)')
      .eq('id', id)
      .single()

    if (fetchError || !favorite) {
      return NextResponse.json({ error: 'Favorite not found' }, { status: 404 })
    }

    const characterUserId = (favorite as any).ledger_characters.user_id
    const isOwner = characterUserId === deviceId || characterUserId === userId
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
