import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabaseClient'
import { getUserFromRequest } from '../../../../lib/auth'

// GET: 파티 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getUserFromRequest(request)

    // 파티 정보 조회
    const { data: party, error } = await supabase
      .from('party_posts')
      .select(`
        *,
        slots:party_slots(*),
        members:party_members(*)
      `)
      .eq('id', id)
      .single()

    if (error || !party) {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 })
    }

    // 조회수 증가
    await supabase
      .from('party_posts')
      .update({ view_count: (party.view_count || 0) + 1 })
      .eq('id', id)

    // 현재 유저가 파티원인지 확인
    const isMember = user && party.members?.some(
      (m: { user_id: string; status: string }) => m.user_id === user.id && m.status === 'approved'
    )
    const isLeader = user && party.user_id === user.id

    // 댓글 조회 (파티원만 볼 수 있음)
    let comments: unknown[] = []
    if (isMember || isLeader) {
      const { data: commentsData } = await supabase
        .from('party_comments')
        .select('*')
        .eq('party_id', id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })

      comments = commentsData || []
    }

    // 현재 멤버 수
    const currentMembers = party.members?.filter(
      (m: { status: string }) => m.status === 'approved'
    ).length || 0

    // 대기 중인 신청자 수
    const pendingCount = party.members?.filter(
      (m: { status: string }) => m.status === 'pending'
    ).length || 0

    return NextResponse.json({
      ...party,
      current_members: currentMembers,
      pending_count: pendingCount,
      comments,
      is_member: isMember,
      is_leader: isLeader,
      user_id: user?.id
    })
  } catch (err) {
    console.error('[Party Detail] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH: 파티 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 파티장 확인
    const { data: party } = await supabase
      .from('party_posts')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!party || party.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const body = await request.json()

    // 수정 가능한 필드만 업데이트
    const updateData: Record<string, unknown> = {}
    const allowedFields = [
      'title', 'description', 'scheduled_date', 'scheduled_time_start',
      'scheduled_time_end', 'run_count', 'min_item_level', 'min_breakthrough',
      'min_combat_power', 'notification_enabled', 'status'
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    const { data: updated, error } = await supabase
      .from('party_posts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[Party Update] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: 파티 삭제 (취소)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 파티장 확인
    const { data: party } = await supabase
      .from('party_posts')
      .select('user_id, title')
      .eq('id', id)
      .single()

    if (!party || party.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // 파티원들에게 알림 발송
    const { data: members } = await supabase
      .from('party_members')
      .select('user_id')
      .eq('party_id', id)
      .eq('status', 'approved')
      .neq('user_id', user.id)

    if (members && members.length > 0) {
      const notifications = members.map(m => ({
        user_id: m.user_id,
        party_id: id,
        type: 'party_cancelled',
        title: '파티 취소됨',
        message: `"${party.title}" 파티가 취소되었습니다.`
      }))

      await supabase.from('party_notifications').insert(notifications)
    }

    // 파티 상태를 cancelled로 변경
    const { error } = await supabase
      .from('party_posts')
      .update({ status: 'cancelled' })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Party Delete] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
