import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, getUserFromRequest } from '../../../../lib/auth'

// GET: 던전 기록 조회
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const characterId = searchParams.get('characterId')
  const date = searchParams.get('date')

  if (!characterId) {
    return NextResponse.json({ error: 'Missing characterId' }, { status: 400 })
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

    // 던전 기록 조회
    let query = supabase
      .from('ledger_dungeon_records')
      .select('*')
      .eq('character_id', characterId)

    if (date) {
      query = query.eq('record_date', date)
    }

    const { data, error } = await query.single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    // 캐릭터 선택 정보 조회
    const { data: selections } = await supabase
      .from('ledger_dungeon_selections')
      .select('*')
      .eq('character_id', characterId)
      .single()

    return NextResponse.json({
      records: data ? {
        transcend: data.transcend_records || [],
        expedition: data.expedition_records || [],
        sanctuary: data.sanctuary_records || [],
        transcendDouble: data.transcend_double || false,
        expeditionDouble: data.expedition_double || false,
        sanctuaryDouble: data.sanctuary_double || false
      } : null,
      selections: selections ? {
        transcendBoss: selections.transcend_boss || '',
        transcendTier: selections.transcend_tier || 1,
        expeditionCategory: selections.expedition_category || '',
        expeditionBoss: selections.expedition_boss || '',
        sanctuaryBoss: selections.sanctuary_boss || ''
      } : null
    })
  } catch (e: any) {
    console.error('[Dungeon Records] Get error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST: 던전 기록 저장
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const {
      characterId,
      date,
      transcendRecords,
      expeditionRecords,
      sanctuaryRecords,
      transcendDouble,
      expeditionDouble,
      sanctuaryDouble,
      // 선택 정보
      selections
    } = body

    if (!characterId) {
      return NextResponse.json({ error: 'Missing characterId' }, { status: 400 })
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

    // 던전 기록 저장 (date가 있는 경우)
    if (date) {
      const { error } = await supabase
        .from('ledger_dungeon_records')
        .upsert({
          character_id: characterId,
          record_date: date,
          transcend_records: transcendRecords || [],
          expedition_records: expeditionRecords || [],
          sanctuary_records: sanctuaryRecords || [],
          transcend_double: transcendDouble || false,
          expedition_double: expeditionDouble || false,
          sanctuary_double: sanctuaryDouble || false,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'character_id,record_date'
        })

      if (error) throw error
    }

    // 선택 정보 저장 (selections가 있는 경우)
    if (selections) {
      const { error } = await supabase
        .from('ledger_dungeon_selections')
        .upsert({
          character_id: characterId,
          transcend_boss: selections.transcendBoss || '',
          transcend_tier: selections.transcendTier || 1,
          expedition_category: selections.expeditionCategory || '',
          expedition_boss: selections.expeditionBoss || '',
          sanctuary_boss: selections.sanctuaryBoss || '',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'character_id'
        })

      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[Dungeon Records] Save error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE: 던전 기록 삭제 (content_records도 함께 정리)
export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const characterId = searchParams.get('characterId')
  const date = searchParams.get('date')
  const dungeonType = searchParams.get('dungeonType') // 'transcend', 'expedition', 'sanctuary', 'all'

  if (!characterId) {
    return NextResponse.json({ error: 'Missing characterId' }, { status: 400 })
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

    // 던전 기록 삭제
    if (date) {
      if (dungeonType === 'all') {
        // 해당 날짜의 모든 던전 기록 삭제
        const { error } = await supabase
          .from('ledger_dungeon_records')
          .delete()
          .eq('character_id', characterId)
          .eq('record_date', date)

        if (error) throw error

        // content_records도 함께 삭제
        await supabase
          .from('ledger_content_records')
          .delete()
          .eq('character_id', characterId)
          .eq('record_date', date)
          .in('content_type', ['transcend', 'expedition', 'sanctuary'])

      } else if (dungeonType) {
        // 특정 던전 타입만 기록 초기화
        const { data: existing } = await supabase
          .from('ledger_dungeon_records')
          .select('*')
          .eq('character_id', characterId)
          .eq('record_date', date)
          .single()

        if (existing) {
          const updateData: any = { updated_at: new Date().toISOString() }
          if (dungeonType === 'transcend') {
            updateData.transcend_records = []
            updateData.transcend_double = false
          } else if (dungeonType === 'expedition') {
            updateData.expedition_records = []
            updateData.expedition_double = false
          } else if (dungeonType === 'sanctuary') {
            updateData.sanctuary_records = []
            updateData.sanctuary_double = false
          }

          await supabase
            .from('ledger_dungeon_records')
            .update(updateData)
            .eq('character_id', characterId)
            .eq('record_date', date)
        }

        // 해당 content_records도 삭제
        await supabase
          .from('ledger_content_records')
          .delete()
          .eq('character_id', characterId)
          .eq('content_type', dungeonType)
      }
    } else {
      // 날짜 없이 전체 삭제 (캐릭터의 모든 던전 기록)
      const { error } = await supabase
        .from('ledger_dungeon_records')
        .delete()
        .eq('character_id', characterId)

      if (error) throw error

      // content_records도 함께 삭제
      await supabase
        .from('ledger_content_records')
        .delete()
        .eq('character_id', characterId)
        .in('content_type', ['transcend', 'expedition', 'sanctuary'])
    }

    console.log(`[Dungeon Records] Deleted ${dungeonType || 'all'} records for character ${characterId}`)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[Dungeon Records] Delete error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
