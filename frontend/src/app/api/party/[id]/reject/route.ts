import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabaseClient'
import { getUserFromRequest } from '../../../../../lib/auth'

// POST: 신청 거절 / 추방
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
    const { member_id, reason, is_kick } = body

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
      return NextResponse.json({ error: '파티장만 거절/추방할 수 있습니다.' }, { status: 403 })
    }

    // 신청자/멤버 정보 조회
    const validStatuses = is_kick ? ['approved'] : ['pending']
    const { data: member, error: memberError } = await supabase
      .from('party_members')
      .select('*')
      .eq('id', member_id)
      .eq('party_id', partyId)
      .in('status', validStatuses)
      .single()

    if (memberError || !member) {
      return NextResponse.json({ error: '대상을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 파티장은 추방 불가
    if (member.role === 'leader') {
      return NextResponse.json({ error: '파티장은 추방할 수 없습니다.' }, { status: 400 })
    }

    // 거절/추방 처리
    const newStatus = is_kick ? 'kicked' : 'rejected'
    const { error: updateError } = await supabase
      .from('party_members')
      .update({
        status: newStatus,
        reject_reason: reason,
        processed_at: new Date().toISOString()
      })
      .eq('id', member_id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // 추방인 경우 슬롯 비우기
    if (is_kick && member.slot_id) {
      await supabase
        .from('party_slots')
        .update({ member_id: null, status: 'empty' })
        .eq('id', member.slot_id)

      // 파티 상태를 다시 recruiting으로
      await supabase
        .from('party_posts')
        .update({ status: 'recruiting' })
        .eq('id', partyId)
        .eq('status', 'full')

      // 시스템 메시지
      await supabase.from('party_comments').insert({
        party_id: partyId,
        user_id: member.user_id,
        character_name: member.character_name,
        content: `${member.character_name}님이 파티에서 추방되었습니다.`,
        is_system_message: true
      })
    }

    // 대상자에게 알림
    const notificationType = is_kick ? 'member_kicked' : 'apply_rejected'
    const notificationTitle = is_kick ? '파티에서 추방됨' : '파티 신청 거절'
    const notificationMessage = is_kick
      ? `"${party.title}" 파티에서 추방되었습니다.${reason ? ` 사유: ${reason}` : ''}`
      : `"${party.title}" 파티 신청이 거절되었습니다.${reason ? ` 사유: ${reason}` : ''}`

    await supabase.from('party_notifications').insert({
      user_id: member.user_id,
      party_id: partyId,
      type: notificationType,
      title: notificationTitle,
      message: notificationMessage
    })

    return NextResponse.json({
      success: true,
      message: is_kick ? '추방되었습니다.' : '거절되었습니다.'
    })
  } catch (err) {
    console.error('[Party Reject/Kick] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
