import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabaseClient'
import { getUserFromRequest } from '../../../lib/auth'

// GET: 알림 목록 조회
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const unreadOnly = searchParams.get('unread_only') === 'true'

    let query = supabase
      .from('party_notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data: notifications, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 읽지 않은 알림 수
    const { data: unreadData } = await supabase
      .from('party_notifications')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_read', false)

    return NextResponse.json({
      notifications: notifications || [],
      unread_count: unreadData?.length || 0,
      total: count || 0
    })
  } catch (err) {
    console.error('[Notifications GET] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH: 알림 읽음 처리
export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { notification_id, mark_all_read } = body

    if (mark_all_read) {
      // 모든 알림 읽음 처리
      const { error } = await supabase
        .from('party_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: '모든 알림을 읽음 처리했습니다.' })
    }

    if (!notification_id) {
      return NextResponse.json({ error: 'notification_id or mark_all_read is required' }, { status: 400 })
    }

    // 단일 알림 읽음 처리
    const { error } = await supabase
      .from('party_notifications')
      .update({ is_read: true })
      .eq('id', notification_id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Notifications PATCH] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: 알림 삭제
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const notificationId = searchParams.get('id')
    const deleteAll = searchParams.get('all') === 'true'

    if (deleteAll) {
      // 모든 알림 삭제
      const { error } = await supabase
        .from('party_notifications')
        .delete()
        .eq('user_id', user.id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: '모든 알림을 삭제했습니다.' })
    }

    if (!notificationId) {
      return NextResponse.json({ error: 'notification id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('party_notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Notifications DELETE] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
