import { NextRequest, NextResponse } from 'next/server'
import type { CreatePartyRequest, ListPartyParams } from '@/types/party'
import { supabase } from '../../../lib/supabaseClient'
import { getUserFromRequest } from '../../../lib/auth'

// GET: 파티 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'recruiting'
    const dungeonType = searchParams.get('dungeon_type')
    const isImmediate = searchParams.get('is_immediate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let query = supabase
      .from('party_posts')
      .select(`
        *,
        slots:party_slots(*),
        members:party_members(*)
      `, { count: 'exact' })

    // 필터
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (dungeonType) {
      query = query.eq('dungeon_type', dungeonType)
    }
    if (isImmediate !== null && isImmediate !== undefined) {
      query = query.eq('is_immediate', isImmediate === 'true')
    }

    // 전체 조회시 completed 제외
    if (status === 'all') {
      query = query.neq('status', 'completed')
    }
    // recruiting, full 등 특정 상태는 위에서 이미 필터 적용됨

    // 정렬: 즉시 진행 먼저, 그 다음 예약 시간순
    query = query
      .order('is_immediate', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: parties, error, count } = await query

    if (error) {
      console.error('[Party List] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 현재 멤버 수 계산
    const partiesWithCount = parties?.map(party => ({
      ...party,
      current_members: party.members?.filter((m: { status: string }) => m.status === 'approved').length || 0
    }))

    return NextResponse.json({
      parties: partiesWithCount,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (err) {
    console.error('[Party List] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: 파티 생성
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CreatePartyRequest = await request.json()

    // 필수 필드 검증
    if (!body.title || !body.dungeon_type || !body.dungeon_id || !body.dungeon_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!body.character_name || !body.character_class || !body.character_server_id) {
      return NextResponse.json({ error: 'Missing character info' }, { status: 400 })
    }

    // 파티 생성
    const { data: party, error: partyError } = await supabase
      .from('party_posts')
      .insert({
        user_id: user.id,
        title: body.title,
        description: body.description,
        dungeon_type: body.dungeon_type,
        dungeon_id: body.dungeon_id,
        dungeon_name: body.dungeon_name,
        dungeon_tier: body.dungeon_tier,
        is_immediate: body.is_immediate,
        scheduled_date: body.scheduled_date,
        scheduled_time_start: body.scheduled_time_start,
        scheduled_time_end: body.scheduled_time_end,
        run_count: body.run_count || 1,
        max_members: body.max_members || 4,
        join_type: body.join_type || 'approval',
        min_item_level: body.min_item_level,
        min_breakthrough: body.min_breakthrough,
        min_combat_power: body.min_combat_power,
        notification_enabled: body.notification_enabled !== false, // 기본값 true
        character_name: body.character_name,
        character_class: body.character_class,
        character_server_id: body.character_server_id,
        character_level: body.character_level,
        character_item_level: body.character_item_level,
        character_breakthrough: body.character_breakthrough,
        character_combat_power: body.character_combat_power,
        profile_image: body.profile_image
      })
      .select()
      .single()

    if (partyError) {
      console.error('[Party Create] Error:', partyError)
      return NextResponse.json({ error: partyError.message }, { status: 500 })
    }

    // 슬롯 생성
    const slotsToCreate = body.slots?.map(slot => ({
      party_id: party.id,
      slot_number: slot.slot_number,
      party_number: slot.party_number || 1,
      required_class: slot.required_class || null,
      status: slot.slot_number === 1 ? 'filled' : 'empty' // 첫 번째 슬롯은 파티장
    })) || []

    // 기본 슬롯 생성 (slots가 없는 경우)
    if (slotsToCreate.length === 0) {
      for (let i = 1; i <= body.max_members; i++) {
        slotsToCreate.push({
          party_id: party.id,
          slot_number: i,
          party_number: i <= 4 ? 1 : 2,
          required_class: null,
          status: i === 1 ? 'filled' : 'empty'
        })
      }
    }

    const { data: slots, error: slotsError } = await supabase
      .from('party_slots')
      .insert(slotsToCreate)
      .select()

    if (slotsError) {
      console.error('[Party Slots] Error:', slotsError)
      // 파티 삭제
      await supabase.from('party_posts').delete().eq('id', party.id)
      return NextResponse.json({ error: slotsError.message }, { status: 500 })
    }

    // 파티장을 멤버로 등록
    const leaderSlot = slots?.find(s => s.slot_number === 1)
    const { error: memberError } = await supabase
      .from('party_members')
      .insert({
        party_id: party.id,
        user_id: user.id,
        slot_id: leaderSlot?.id,
        character_name: body.character_name,
        character_class: body.character_class,
        character_server_id: body.character_server_id,
        character_level: body.character_level,
        character_item_level: body.character_item_level,
        character_breakthrough: body.character_breakthrough,
        character_combat_power: body.character_combat_power,
        profile_image: body.profile_image,
        role: 'leader',
        status: 'approved'
      })

    if (memberError) {
      console.error('[Party Member] Error:', memberError)
    }

    // 슬롯 member_id 업데이트
    if (leaderSlot) {
      const { data: leaderMember } = await supabase
        .from('party_members')
        .select('id')
        .eq('party_id', party.id)
        .eq('role', 'leader')
        .single()

      if (leaderMember) {
        await supabase
          .from('party_slots')
          .update({ member_id: leaderMember.id })
          .eq('id', leaderSlot.id)
      }
    }

    return NextResponse.json({ party, slots }, { status: 201 })
  } catch (err) {
    console.error('[Party Create] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
