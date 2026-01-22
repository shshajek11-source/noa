import { NextRequest, NextResponse } from 'next/server'
import type { ApplyPartyRequest } from '@/types/party'
import { supabase } from '../../../../../lib/supabaseClient'
import { getUserFromRequest } from '../../../../../lib/auth'

// GET: 같은 캐릭터로 다른 파티에 신청 중인지 확인
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: partyId } = await params
    const { searchParams } = new URL(request.url)
    const characterName = searchParams.get('character_name')
    const characterServerId = searchParams.get('character_server_id')

    if (!characterName || !characterServerId) {
      return NextResponse.json({ error: 'Missing character info' }, { status: 400 })
    }

    // 같은 캐릭터(이름+서버)로 다른 파티에 pending 상태로 신청 중인지 확인
    const { data: existingApplications, error } = await supabase
      .from('party_members')
      .select(`
        id,
        party_id,
        character_name,
        status,
        party:party_posts(id, title, dungeon_name, status)
      `)
      .eq('character_name', characterName)
      .eq('character_server_id', characterServerId)
      .eq('status', 'pending')
      .neq('party_id', partyId)

    if (error) {
      console.error('[Party Apply Check] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 모집 중인 파티의 신청만 필터링
    const activeApplications = existingApplications?.filter(
      (app: any) => app.party?.status === 'recruiting'
    ) || []

    if (activeApplications.length > 0) {
      const app = activeApplications[0] as any
      const existingParty = app.party
      return NextResponse.json({
        hasExistingApplication: true,
        existingApplication: {
          memberId: app.id,
          partyId: app.party_id,
          partyTitle: existingParty?.title || existingParty?.dungeon_name || '파티'
        }
      })
    }

    return NextResponse.json({ hasExistingApplication: false })
  } catch (err) {
    console.error('[Party Apply Check] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    // 이미 신청했는지 확인 (pending, approved 상태)
    const existingMember = party.members?.find(
      (m: { user_id: string; status: string }) =>
        m.user_id === user.id && ['pending', 'approved'].includes(m.status)
    )
    if (existingMember) {
      return NextResponse.json({ error: '이미 신청한 파티입니다.' }, { status: 400 })
    }

    // 이전에 취소/거절/추방된 기록이 있으면 재신청 허용 (기존 기록 업데이트)
    const previousMember = party.members?.find(
      (m: { id: string; user_id: string; status: string }) =>
        m.user_id === user.id && ['cancelled', 'rejected', 'kicked'].includes(m.status)
    ) as { id: string; user_id: string; status: string } | undefined

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

    // 직업/스펙 조건은 프론트엔드에서 표시만 하고, 실제 검증은 하지 않음 (유저 판단에 맡김)

    // 항상 승인제로 동작 (pending 상태로 시작)
    const memberStatus = 'pending'

    let member

    // 이전 기록이 있으면 UPDATE, 없으면 INSERT
    if (previousMember) {
      // 기존 기록 업데이트 (재신청)
      const { data: updatedMember, error: updateError } = await supabase
        .from('party_members')
        .update({
          slot_id: body.slot_id,
          character_name: body.character_name,
          character_class: body.character_class,
          character_server_id: body.character_server_id,
          character_level: body.character_level,
          character_item_level: body.character_item_level,
          character_breakthrough: body.character_breakthrough,
          profile_image: body.profile_image,
          character_combat_power: body.character_combat_power,
          character_equipment: body.character_equipment,
          character_stats: body.character_stats,
          apply_message: body.apply_message,
          status: memberStatus,
          processed_at: null,
          reject_reason: null
        })
        .eq('id', previousMember.id)
        .select()
        .single()

      if (updateError) {
        console.error('[Party Apply] Update Error:', updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
      member = updatedMember
    } else {
      // 새로 등록
      const { data: newMember, error: memberError } = await supabase
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
          profile_image: body.profile_image,
          character_combat_power: body.character_combat_power,
          character_equipment: body.character_equipment,
          character_stats: body.character_stats,
          apply_message: body.apply_message,
          role: 'member',
          status: memberStatus,
          processed_at: null
        })
        .select()
        .single()

      if (memberError) {
        console.error('[Party Apply] Error:', memberError)
        return NextResponse.json({ error: memberError.message }, { status: 500 })
      }
      member = newMember
    }

    // 파티장에게 알림 (항상 전송)
    await supabase.from('party_notifications').insert({
      user_id: party.user_id,
      party_id: partyId,
      type: 'apply_received',
      title: '새 파티 신청',
      message: `${body.character_name}님이 "${party.title || party.dungeon_name}" 파티에 신청했습니다.`,
      data: { applicant_name: body.character_name, applicant_class: body.character_class }
    })

    return NextResponse.json({
      member,
      status: memberStatus,
      message: '신청이 완료되었습니다. 파티장의 승인을 기다려주세요.'
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
