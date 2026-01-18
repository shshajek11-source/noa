import { NextRequest, NextResponse } from 'next/server'
import type { ApplyPartyRequest } from '@/types/party'
import { supabase } from '../../../../../lib/supabaseClient'
import { getUserFromRequest } from '../../../../../lib/auth'

// POST: 파티 신청
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: partyId } = await params
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ApplyPartyRequest = await request.json()

    // 파티 정보 조회
    const { data: party, error: partyError } = await supabase
      .from('party_posts')
      .select('*, members:party_members(*)')
      .eq('id', partyId)
      .single()

    if (partyError || !party) {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 })
    }

    // 파티 상태 확인
    if (party.status !== 'recruiting') {
      return NextResponse.json({ error: '모집이 마감되었습니다.' }, { status: 400 })
    }

    // 이미 신청했는지 확인
    const existingMember = party.members?.find(
      (m: { user_id: string; status: string }) =>
        m.user_id === user.id && ['pending', 'approved'].includes(m.status)
    )
    if (existingMember) {
      return NextResponse.json({ error: '이미 신청한 파티입니다.' }, { status: 400 })
    }

    // 슬롯 확인
    const { data: slot, error: slotError } = await supabase
      .from('party_slots')
      .select('*')
      .eq('id', body.slot_id)
      .eq('party_id', partyId)
      .single()

    if (slotError || !slot) {
      return NextResponse.json({ error: 'Invalid slot' }, { status: 400 })
    }

    // 슬롯이 이미 채워졌는지 확인
    if (slot.status === 'filled') {
      return NextResponse.json({ error: '해당 슬롯은 이미 채워졌습니다.' }, { status: 400 })
    }

    // 직업 제한 확인
    if (slot.required_class && slot.required_class !== body.character_class) {
      return NextResponse.json({
        error: `이 슬롯은 ${slot.required_class} 직업만 신청할 수 있습니다.`
      }, { status: 400 })
    }

    // 스펙 조건 확인
    if (party.min_item_level && body.character_item_level && body.character_item_level < party.min_item_level) {
      return NextResponse.json({
        error: `최소 아이템레벨 ${party.min_item_level} 이상이어야 합니다.`
      }, { status: 400 })
    }
    if (party.min_breakthrough && body.character_breakthrough && body.character_breakthrough < party.min_breakthrough) {
      return NextResponse.json({
        error: `최소 돌파횟수 ${party.min_breakthrough}회 이상이어야 합니다.`
      }, { status: 400 })
    }
    if (party.min_combat_power && body.character_combat_power && body.character_combat_power < party.min_combat_power) {
      return NextResponse.json({
        error: `최소 전투력 ${party.min_combat_power.toLocaleString()} 이상이어야 합니다.`
      }, { status: 400 })
    }

    // 선착순인 경우 바로 승인
    const isFirstCome = party.join_type === 'first_come'
    const memberStatus = isFirstCome ? 'approved' : 'pending'

    // 파티원 등록
    const { data: member, error: memberError } = await supabase
      .from('party_members')
      .insert({
        party_id: partyId,
        user_id: user.id,
        slot_id: body.slot_id,
        character_name: body.character_name,
        character_class: body.character_class,
        character_server_id: body.character_server_id,
        character_level: body.character_level,
        character_item_level: body.character_item_level,
        character_breakthrough: body.character_breakthrough,
        character_combat_power: body.character_combat_power,
        character_equipment: body.character_equipment,
        character_stats: body.character_stats,
        apply_message: body.apply_message,
        role: 'member',
        status: memberStatus,
        processed_at: isFirstCome ? new Date().toISOString() : null
      })
      .select()
      .single()

    if (memberError) {
      console.error('[Party Apply] Error:', memberError)
      return NextResponse.json({ error: memberError.message }, { status: 500 })
    }

    // 선착순인 경우 슬롯 업데이트
    if (isFirstCome) {
      await supabase
        .from('party_slots')
        .update({ member_id: member.id, status: 'filled' })
        .eq('id', body.slot_id)

      // 인원 확인 후 마감 처리
      const { data: approvedMembers } = await supabase
        .from('party_members')
        .select('id')
        .eq('party_id', partyId)
        .eq('status', 'approved')

      if (approvedMembers && approvedMembers.length >= party.max_members) {
        await supabase
          .from('party_posts')
          .update({ status: 'full' })
          .eq('id', partyId)

        // 파티장에게 마감 알림
        await supabase.from('party_notifications').insert({
          user_id: party.user_id,
          party_id: partyId,
          type: 'party_full',
          title: '파티 인원 마감',
          message: `"${party.title}" 파티 인원이 마감되었습니다.`
        })
      }

      // 시스템 메시지 추가
      await supabase.from('party_comments').insert({
        party_id: partyId,
        user_id: user.id,
        character_name: body.character_name,
        content: `${body.character_name}님이 파티에 참여했습니다.`,
        is_system_message: true
      })
    }

    // 파티장에게 알림 (승인제인 경우)
    if (!isFirstCome && party.notification_enabled) {
      await supabase.from('party_notifications').insert({
        user_id: party.user_id,
        party_id: partyId,
        type: 'apply_received',
        title: '새 파티 신청',
        message: `${body.character_name}님이 "${party.title}" 파티에 신청했습니다.`,
        data: { applicant_name: body.character_name, applicant_class: body.character_class }
      })
    }

    return NextResponse.json({
      member,
      status: memberStatus,
      message: isFirstCome ? '파티에 참여했습니다.' : '신청이 완료되었습니다. 파티장의 승인을 기다려주세요.'
    }, { status: 201 })
  } catch (err) {
    console.error('[Party Apply] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: 신청 취소
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: partyId } = await params
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 내 신청 정보 조회
    const { data: member, error: memberError } = await supabase
      .from('party_members')
      .select('*, party:party_posts(title, user_id)')
      .eq('party_id', partyId)
      .eq('user_id', user.id)
      .in('status', ['pending', 'approved'])
      .single()

    if (memberError || !member) {
      return NextResponse.json({ error: '신청 내역을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 파티장은 취소 불가
    if (member.role === 'leader') {
      return NextResponse.json({ error: '파티장은 신청을 취소할 수 없습니다.' }, { status: 400 })
    }

    // 신청 취소
    const { error: updateError } = await supabase
      .from('party_members')
      .update({ status: 'cancelled' })
      .eq('id', member.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // 슬롯 비우기 (승인된 상태였던 경우)
    if (member.status === 'approved' && member.slot_id) {
      await supabase
        .from('party_slots')
        .update({ member_id: null, status: 'empty' })
        .eq('id', member.slot_id)

      // 파티 상태를 다시 recruiting으로 변경
      await supabase
        .from('party_posts')
        .update({ status: 'recruiting' })
        .eq('id', partyId)
        .eq('status', 'full')

      // 시스템 메시지
      await supabase.from('party_comments').insert({
        party_id: partyId,
        user_id: user.id,
        character_name: member.character_name,
        content: `${member.character_name}님이 파티를 나갔습니다.`,
        is_system_message: true
      })

      // 파티장에게 알림
      if (member.party?.user_id) {
        await supabase.from('party_notifications').insert({
          user_id: member.party.user_id,
          party_id: partyId,
          type: 'member_left',
          title: '파티원 탈퇴',
          message: `${member.character_name}님이 "${member.party.title}" 파티를 나갔습니다.`
        })
      }
    }

    return NextResponse.json({ success: true, message: '신청이 취소되었습니다.' })
  } catch (err) {
    console.error('[Party Apply Cancel] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
