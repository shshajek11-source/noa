import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabaseClient'
import { getUserFromRequest } from '../../../../../lib/auth'

// POST: 파티 완료 처리
export async function POST(
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
    const { data: party, error: fetchError } = await supabase
      .from('party_posts')
      .select('user_id, title, status')
      .eq('id', id)
      .single()

    if (fetchError || !party) {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 })
    }

    if (party.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    if (party.status === 'completed') {
      return NextResponse.json({ error: '이미 완료된 파티입니다.' }, { status: 400 })
    }

    if (party.status === 'cancelled') {
      return NextResponse.json({ error: '취소된 파티는 완료할 수 없습니다.' }, { status: 400 })
    }

    // 파티 상태를 completed로 변경, completed_at 기록
    const { error } = await supabase
      .from('party_posts')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('[Party Complete] Update failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 파티원들에게 완료 알림 발송
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
        type: 'party_completed',
        title: '파티 완료',
        message: `"${party.title}" 파티가 완료되었습니다.`
      }))

      await supabase.from('party_notifications').insert(notifications)
    }

    console.log('[Party Complete] Party completed successfully:', id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Party Complete] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
