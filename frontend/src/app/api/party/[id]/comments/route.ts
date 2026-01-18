import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabaseClient'
import { getUserFromRequest } from '../../../../../lib/auth'

// GET: 댓글 조회 (파티원만)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: partyId } = await params
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 파티원 또는 파티장인지 확인
    const { data: party } = await supabase
      .from('party_posts')
      .select('user_id')
      .eq('id', partyId)
      .single()

    const isLeader = party?.user_id === user.id

    const { data: member } = await supabase
      .from('party_members')
      .select('id')
      .eq('party_id', partyId)
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .single()

    if (!isLeader && !member) {
      return NextResponse.json({ error: '파티원만 댓글을 볼 수 있습니다.' }, { status: 403 })
    }

    // 댓글 조회
    const { data: comments, error } = await supabase
      .from('party_comments')
      .select('*')
      .eq('party_id', partyId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ comments })
  } catch (err) {
    console.error('[Party Comments GET] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: 댓글 작성 (파티원만)
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
    const { content } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: '댓글 내용을 입력해주세요.' }, { status: 400 })
    }

    // 파티 정보 및 파티원 확인
    const { data: party } = await supabase
      .from('party_posts')
      .select('user_id, title, notification_enabled')
      .eq('id', partyId)
      .single()

    if (!party) {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 })
    }

    const isLeader = party.user_id === user.id

    const { data: member } = await supabase
      .from('party_members')
      .select('id, character_name')
      .eq('party_id', partyId)
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .single()

    if (!isLeader && !member) {
      return NextResponse.json({ error: '파티원만 댓글을 작성할 수 있습니다.' }, { status: 403 })
    }

    // 캐릭터 이름 가져오기 (파티장인 경우 파티 정보에서)
    let characterName = member?.character_name
    if (isLeader && !characterName) {
      const { data: leaderMember } = await supabase
        .from('party_members')
        .select('character_name')
        .eq('party_id', partyId)
        .eq('user_id', user.id)
        .eq('role', 'leader')
        .single()
      characterName = leaderMember?.character_name
    }

    // 댓글 작성
    const { data: comment, error } = await supabase
      .from('party_comments')
      .insert({
        party_id: partyId,
        user_id: user.id,
        character_name: characterName,
        content: content.trim(),
        is_system_message: false
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 파티장에게 알림 (작성자가 파티장이 아닌 경우)
    if (!isLeader && party.notification_enabled) {
      await supabase.from('party_notifications').insert({
        user_id: party.user_id,
        party_id: partyId,
        type: 'new_comment',
        title: '새 댓글',
        message: `${characterName}님이 "${party.title}" 파티에 댓글을 남겼습니다.`
      })
    }

    return NextResponse.json({ comment }, { status: 201 })
  } catch (err) {
    console.error('[Party Comments POST] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: 댓글 삭제
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

    const { searchParams } = new URL(request.url)
    const commentId = searchParams.get('comment_id')

    if (!commentId) {
      return NextResponse.json({ error: 'comment_id is required' }, { status: 400 })
    }

    // 댓글 조회
    const { data: comment } = await supabase
      .from('party_comments')
      .select('user_id')
      .eq('id', commentId)
      .eq('party_id', partyId)
      .single()

    if (!comment) {
      return NextResponse.json({ error: '댓글을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 파티장 또는 댓글 작성자만 삭제 가능
    const { data: party } = await supabase
      .from('party_posts')
      .select('user_id')
      .eq('id', partyId)
      .single()

    const isLeader = party?.user_id === user.id
    const isAuthor = comment.user_id === user.id

    if (!isLeader && !isAuthor) {
      return NextResponse.json({ error: '삭제 권한이 없습니다.' }, { status: 403 })
    }

    // 소프트 삭제
    const { error } = await supabase
      .from('party_comments')
      .update({ is_deleted: true })
      .eq('id', commentId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Party Comments DELETE] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
