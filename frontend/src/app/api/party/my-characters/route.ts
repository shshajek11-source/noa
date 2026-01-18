import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabaseClient'
import { getUserFromRequest } from '../../../../lib/auth'

// GET: 내 모집 캐릭터 목록
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: characters, error } = await supabase
      .from('party_user_characters')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ characters: characters || [] })
  } catch (err) {
    console.error('[My Characters GET] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: 모집 캐릭터 추가
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // 필수 필드 검증
    if (!body.character_name || !body.character_class || !body.character_server_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 최대 10개까지만 등록 가능
    const { data: existing } = await supabase
      .from('party_user_characters')
      .select('id')
      .eq('user_id', user.id)

    if (existing && existing.length >= 10) {
      return NextResponse.json({ error: '최대 10개의 캐릭터만 등록할 수 있습니다.' }, { status: 400 })
    }

    // 중복 확인 (같은 서버, 같은 이름)
    const { data: duplicate } = await supabase
      .from('party_user_characters')
      .select('id')
      .eq('user_id', user.id)
      .eq('character_name', body.character_name)
      .eq('character_server_id', body.character_server_id)
      .single()

    if (duplicate) {
      return NextResponse.json({ error: '이미 등록된 캐릭터입니다.' }, { status: 400 })
    }

    // display_order 계산
    const nextOrder = (existing?.length || 0) + 1

    const { data: character, error } = await supabase
      .from('party_user_characters')
      .insert({
        user_id: user.id,
        character_id: body.character_id,
        character_name: body.character_name,
        character_class: body.character_class,
        character_server_id: body.character_server_id,
        character_level: body.character_level,
        character_item_level: body.character_item_level,
        character_breakthrough: body.character_breakthrough,
        character_combat_power: body.character_combat_power,
        profile_image: body.profile_image,
        display_order: nextOrder
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ character }, { status: 201 })
  } catch (err) {
    console.error('[My Characters POST] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH: 모집 캐릭터 수정
export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'Character id is required' }, { status: 400 })
    }

    // 본인 캐릭터인지 확인
    const { data: existing } = await supabase
      .from('party_user_characters')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // 수정 가능한 필드만 업데이트
    const allowedFields = [
      'character_name', 'character_class', 'character_server_id',
      'character_level', 'character_item_level', 'character_breakthrough',
      'character_combat_power', 'profile_image', 'display_order'
    ]

    const filteredData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field]
      }
    }

    const { data: character, error } = await supabase
      .from('party_user_characters')
      .update(filteredData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ character })
  } catch (err) {
    console.error('[My Characters PATCH] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: 모집 캐릭터 삭제
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const characterId = searchParams.get('id')

    if (!characterId) {
      return NextResponse.json({ error: 'Character id is required' }, { status: 400 })
    }

    // 본인 캐릭터인지 확인
    const { data: existing } = await supabase
      .from('party_user_characters')
      .select('user_id')
      .eq('id', characterId)
      .single()

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { error } = await supabase
      .from('party_user_characters')
      .delete()
      .eq('id', characterId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[My Characters DELETE] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
