import { NextResponse } from 'next/server'
import { getSupabase, getUserFromRequest } from '../../../../lib/auth'

// GET: 특정 캐릭터의 특정 날짜 컨텐츠 기록 조회
export async function GET(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const characterId = searchParams.get('characterId')
  const date = searchParams.get('date')

  if (!characterId || !date) {
    return NextResponse.json({ error: 'Missing characterId or date' }, { status: 400 })
  }

  try {
    const supabase = getSupabase()

    // 캐릭터가 현재 유저 소유인지 확인
    const { data: character } = await supabase
      .from('ledger_characters')
      .select('id')
      .eq('id', characterId)
      .eq('user_id', user.id)
      .single()

    if (!character) {
      return NextResponse.json({ error: 'Character not found or access denied' }, { status: 403 })
    }

    const { data: records, error } = await supabase
      .from('ledger_content_records')
      .select('*')
      .eq('character_id', characterId)
      .eq('record_date', date)

    if (error) {
      // 테이블이 없으면 빈 배열 반환
      if (error.code === '42P01') {
        return NextResponse.json([])
      }
      throw error
    }

    return NextResponse.json(records || [])
  } catch (e: any) {
    console.error('[Content Records] Get error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST: 컨텐츠 기록 생성 또는 업데이트
export async function POST(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const {
      characterId,
      date,
      content_type,
      dungeon_tier,
      max_count,
      completion_count,
      is_double,
      base_kina
    } = body

    if (!characterId || !date || !content_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = getSupabase()

    // 캐릭터가 현재 유저 소유인지 확인
    const { data: character } = await supabase
      .from('ledger_characters')
      .select('id')
      .eq('id', characterId)
      .eq('user_id', user.id)
      .single()

    if (!character) {
      return NextResponse.json({ error: 'Character not found or access denied' }, { status: 403 })
    }

    // 총 금액 계산
    const total_kina = completion_count * base_kina * (is_double ? 2 : 1)

    console.log(`[Content Records] Saving: characterId=${characterId}, date=${date}, type=${content_type}, count=${completion_count}, total_kina=${total_kina}`)

    // Upsert: character_id + record_date + content_type 기준으로 업데이트/생성
    const { data, error } = await supabase
      .from('ledger_content_records')
      .upsert({
        character_id: characterId,
        record_date: date,
        content_type,
        dungeon_tier,
        max_count,
        completion_count,
        is_double,
        base_kina,
        total_kina,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'character_id,record_date,content_type'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (e: any) {
    console.error('Save content record error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE: 컨텐츠 기록 삭제
export async function DELETE(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const characterId = searchParams.get('characterId')
  const cleanupZeroKina = searchParams.get('cleanupZeroKina') // 0키나 컨텐츠 정리

  const supabase = getSupabase()

  try {
    // 특정 캐릭터의 특정 content_type 기록 삭제
    const contentType = searchParams.get('contentType')
    if (contentType && characterId) {
      // 캐릭터 소유권 확인
      const { data: character } = await supabase
        .from('ledger_characters')
        .select('id')
        .eq('id', characterId)
        .eq('user_id', user.id)
        .single()

      if (!character) {
        return NextResponse.json({ error: 'Character not found or access denied' }, { status: 403 })
      }

      const { error, count } = await supabase
        .from('ledger_content_records')
        .delete()
        .eq('character_id', characterId)
        .eq('content_type', contentType)

      if (error) throw error
      console.log(`[Content Records] Deleted ${count} ${contentType} records for character ${characterId}`)
      return NextResponse.json({ success: true, deletedCount: count })
    }

    // 0키나 컨텐츠 (일일던전, 각성전, 토벌전, 악몽, 차원침공) 기록 삭제
    if (cleanupZeroKina === 'true' && characterId) {
      // 캐릭터 소유권 확인
      const { data: character } = await supabase
        .from('ledger_characters')
        .select('id')
        .eq('id', characterId)
        .eq('user_id', user.id)
        .single()

      if (!character) {
        return NextResponse.json({ error: 'Character not found or access denied' }, { status: 403 })
      }

      // 키나를 주지 않는 모든 컨텐츠 타입
      const zeroKinaContentTypes = [
        'daily_dungeon', 'awakening_battle', 'subjugation', 'nightmare', 'dimension_invasion',
        'shugo_festa', 'abyss_hallway', 'mission', 'weekly_order', 'abyss_order'
      ]

      const { error, count } = await supabase
        .from('ledger_content_records')
        .delete()
        .eq('character_id', characterId)
        .in('content_type', zeroKinaContentTypes)

      if (error) throw error
      console.log(`[Content Records] Cleaned up ${count} zero-kina records for character ${characterId}`)
      return NextResponse.json({ success: true, deletedCount: count })
    }

    // 특정 ID로 삭제
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const { error } = await supabase
      .from('ledger_content_records')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
