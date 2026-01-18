import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabaseClient'
import { getUserFromRequest } from '../../../../../lib/auth'

// POST: 신청 승인
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

    const body = await request.json()
    const { member_id } = body

    if (!member_id) {
      return NextResponse.json({ error: 'member_id is required' }, { status: 400 })
    }

    // 파티장 확인
    const { data: party, error: partyError } = await supabase
      .from('party_posts')
      .select('*')
      .eq('id', partyId)
      .single()

    if (partyError || !party) {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 })
    }

    if (party.user_id !== user.id) {
      return NextResponse.json({ error: '파티장만 승인할 수 있습니다.' }, { status: 403 })
    }

    // 신청자 정보 조회
    const { data: member, error: memberError } = await supabase
      .from('party_members')
      .select('*')
      .eq('id', member_id)
      .eq('party_id', partyId)
      .eq('status', 'pending')
      .single()

    if (memberError || !member) {
      return NextResponse.json({ error: '신청 내역을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 현재 승인된 인원 수 확인
    const { data: approvedMembers } = await supabase
      .from('party_members')
      .select('id')
      .eq('party_id', partyId)
      .eq('status', 'approved')

    if (approvedMembers && approvedMembers.length >= party.max_members) {
      return NextResponse.json({ error: '이미 파티 인원이 가득 찼습니다.' }, { status: 400 })
    }

    // 슬롯 확인
    if (member.slot_id) {
      const { data: slot } = await supabase
        .from('party_slots')
        .select('*')
        .eq('id', member.slot_id)
        .single()

      if (slot && slot.status === 'filled') {
        return NextResponse.json({ error: '해당 슬롯은 이미 채워졌습니다.' }, { status: 400 })
      }
    }

    // 승인 처리
    const { error: updateError } = await supabase
      .from('party_members')
      .update({
        status: 'approved',
        processed_at: new Date().toISOString()
      })
      .eq('id', member_id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // 슬롯 업데이트
    if (member.slot_id) {
      await supabase
        .from('party_slots')
        .update({ member_id: member.id, status: 'filled' })
        .eq('id', member.slot_id)
    }

    // 인원 확인 후 마감 처리
    const newApprovedCount = (approvedMembers?.length || 0) + 1
    if (newApprovedCount >= party.max_members) {
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

    // 신청자에게 승인 알림
    await supabase.from('party_notifications').insert({
      user_id: member.user_id,
      party_id: partyId,
      type: 'apply_approved',
      title: '파티 신청 승인',
      message: `"${party.title}" 파티 신청이 승인되었습니다!`
    })

    // 시스템 메시지
    await supabase.from('party_comments').insert({
      party_id: partyId,
      user_id: member.user_id,
      character_name: member.character_name,
      content: `${member.character_name}님이 파티에 참여했습니다.`,
      is_system_message: true
    })

    return NextResponse.json({
      success: true,
      message: '승인되었습니다.',
      member: { ...member, status: 'approved' }
    })
  } catch (err) {
    console.error('[Party Approve] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
