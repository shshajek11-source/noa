import { NextResponse } from 'next/server'
import { getSupabase, getUserFromRequest } from '../../../../lib/auth'

export async function GET(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabase()

  // 대표 캐릭터 자동 추가 로직 (Google 로그인 사용자만)
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const { data: { user: authUser } } = await supabase.auth.getUser(token)

    if (authUser) {
      // ledger_users에서 main_character_id 조회
      const { data: ledgerUser } = await supabase
        .from('ledger_users')
        .select('main_character_id, main_character_name, main_character_server, main_character_class, main_character_level, main_character_race, main_character_item_level, main_character_image_url')
        .eq('auth_user_id', authUser.id)
        .single()

      // 대표 캐릭터가 설정되어 있으면
      if (ledgerUser?.main_character_id) {
        // 가계부에 이미 있는지 확인
        const { data: existing } = await supabase
          .from('ledger_characters')
          .select('id')
          .eq('user_id', user.id)
          .eq('character_id', ledgerUser.main_character_id)
          .single()

        // 없으면 자동 추가
        if (!existing) {
          console.log('[Ledger Characters] Auto-adding main character to ledger:', ledgerUser.main_character_name)
          await supabase
            .from('ledger_characters')
            .insert({
              user_id: user.id,
              character_id: ledgerUser.main_character_id,
              name: ledgerUser.main_character_name || 'Unknown',
              class_name: ledgerUser.main_character_class || 'Unknown',
              server_name: ledgerUser.main_character_server || 'Unknown',
              race: ledgerUser.main_character_race,
              item_level: ledgerUser.main_character_item_level,
              profile_image: ledgerUser.main_character_image_url,
              is_main: true,
              display_order: 0
            })
        }
      }
    }
  }

  const { data: characters, error } = await supabase
    .from('ledger_characters')
    .select('*')
    .eq('user_id', user.id)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Calculate today's income
  const today = new Date().toISOString().split('T')[0]

  const characterIds = characters.map(c => c.id)
  if (characterIds.length > 0) {
      const { data: records } = await supabase
        .from('ledger_daily_records')
        .select(`
            character_id,
            ledger_record_items ( price, count )
        `)
        .in('character_id', characterIds)
        .eq('date', today)

      const incomeMap = new Map<string, number>()
      if (records) {
        records.forEach((rec: any) => {
            const total = rec.ledger_record_items?.reduce((sum: number, item: any) => sum + ((item.price || 0) * (item.count || 1)), 0) || 0
            incomeMap.set(rec.character_id, total)
        })
      }

      const result = characters.map(c => ({
          ...c,
          income: incomeMap.get(c.id) || 0
      }))
      return NextResponse.json(result)
  }

  return NextResponse.json(characters)
}

export async function POST(request: Request) {
  try {
    console.log('[API] POST /api/ledger/characters 시작')

    const user = await getUserFromRequest(request)
    if (!user) {
      console.log('[API] 인증 실패 - user 없음')
      return NextResponse.json({ error: '인증이 필요합니다. 페이지를 새로고침 후 다시 시도해주세요.' }, { status: 401 })
    }

    console.log('[API] 인증 성공 - user_id:', user.id)

    const body = await request.json()
    const { name, class_name, server_name, is_main, profile_image, character_id, race, item_level } = body

    if (!name) {
      return NextResponse.json({ error: '캐릭터 이름이 필요합니다' }, { status: 400 })
    }

    const supabase = getSupabase()
    const { data, error } = await supabase
        .from('ledger_characters')
        .insert({
            user_id: user.id,
            name,
            class_name: class_name || 'Unknown',
            server_name: server_name || 'Unknown',
            is_main: is_main || false,
            profile_image: profile_image || null,
            character_id: character_id || null,
            race: race || null,
            item_level: item_level || null
        })
        .select()
        .single()

    if (error) {
        console.error('[API] Insert failed:', error)
        return NextResponse.json({ error: error.message || '캐릭터 저장에 실패했습니다' }, { status: 500 })
    }

    console.log('[API] 캐릭터 추가 성공:', data.id)
    return NextResponse.json(data)
  } catch (e: any) {
      console.error('[API] Create character error:', e)
      return NextResponse.json({ error: e?.message || '캐릭터 추가 중 오류가 발생했습니다' }, { status: 500 })
  }
}
