import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, getUserFromRequestWithDevice } from '../../../../lib/auth'
import { getKoreanGameDate } from '../../../../lib/koreanDate'

// 주간 키 계산 (수요일 기준 YYYY-Www 형식)
function getWeekKey(dateStr: string): string {
  const date = new Date(dateStr)
  // 수요일(3)을 기준으로 주 계산
  const dayOfWeek = date.getDay()
  // 가장 가까운 수요일 찾기
  const daysToWed = dayOfWeek >= 3 ? dayOfWeek - 3 : dayOfWeek + 4
  const wednesday = new Date(date)
  wednesday.setDate(date.getDate() - daysToWed)

  // ISO 주차 계산
  const startOfYear = new Date(wednesday.getFullYear(), 0, 1)
  const days = Math.floor((wednesday.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
  const weekNum = Math.ceil((days + startOfYear.getDay() + 1) / 7)

  return `${wednesday.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

// 배치 API: 모든 캐릭터의 대시보드 데이터를 한 번에 조회
export async function GET(request: NextRequest) {
  const user = await getUserFromRequestWithDevice(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const characterIdsParam = searchParams.get('characterIds')

  if (!characterIdsParam) {
    return NextResponse.json({ error: 'Missing characterIds' }, { status: 400 })
  }

  const characterIds = characterIdsParam.split(',').filter(id => id.trim())
  if (characterIds.length === 0) {
    return NextResponse.json({ error: 'No valid characterIds' }, { status: 400 })
  }

  const today = getKoreanGameDate()
  const weekKey = getWeekKey(today)

  // 주간 시작일/종료일 계산
  const d = new Date(today)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const weekStartDate = new Date(d.setDate(diff)).toISOString().split('T')[0]
  d.setDate(d.getDate() + 6)
  const weekEndDate = d.toISOString().split('T')[0]

  try {
    const supabase = getSupabase()

    // 1. 캐릭터 소유권 검증 (user_id로 한 번에)
    const { data: ownedChars } = await supabase
      .from('ledger_characters')
      .select('id, name')
      .eq('user_id', user.id)
      .in('id', characterIds)

    const ownedCharIds = ownedChars?.map(c => c.id) || []
    const charNameMap = new Map(ownedChars?.map(c => [c.id, c.name]) || [])

    if (ownedCharIds.length === 0) {
      return NextResponse.json({ characters: {} })
    }

    // 2. 모든 데이터를 병렬로 조회 (단일 쿼리로 모든 캐릭터)
    const dungeonTypes = ['transcend', 'expedition', 'sanctuary']

    const [
      itemsResult,
      contentResult,
      dungeonResult,
      weeklyContentResult,
      weeklyDungeonResult,
      stateResult,
      weeklyDataResult,
      dailyMissionResult
    ] = await Promise.all([
      // 미판매 아이템 (모든 캐릭터)
      supabase
        .from('ledger_items')
        .select('ledger_character_id, item_grade, item_name, quantity, expected_price')
        .in('ledger_character_id', ownedCharIds)
        .is('sold_price', null),

      // 오늘 컨텐츠 기록 (모든 캐릭터)
      supabase
        .from('ledger_content_records')
        .select('character_id, content_type, completion_count, total_kina')
        .in('character_id', ownedCharIds)
        .eq('record_date', today),

      // 오늘 던전 기록 (모든 캐릭터)
      supabase
        .from('ledger_dungeon_records')
        .select('character_id, transcend_records, expedition_records, sanctuary_records')
        .in('character_id', ownedCharIds)
        .eq('record_date', today),

      // 주간 컨텐츠 수입 (모든 캐릭터) - 던전 제외
      supabase
        .from('ledger_content_records')
        .select('character_id, total_kina, content_type')
        .in('character_id', ownedCharIds)
        .gte('record_date', weekStartDate)
        .lte('record_date', weekEndDate),

      // 주간 던전 수입 (모든 캐릭터)
      supabase
        .from('ledger_dungeon_records')
        .select('character_id, transcend_records, expedition_records, sanctuary_records')
        .in('character_id', ownedCharIds)
        .gte('record_date', weekStartDate)
        .lte('record_date', weekEndDate),

      // 캐릭터 상태 (티켓 정보)
      supabase
        .from('ledger_character_state')
        .select('character_id, base_tickets, bonus_tickets, last_charge_time')
        .eq('user_id', user.id)
        .in('character_id', ownedCharIds),

      // 주간 컨텐츠 (슈고, 주간지령서 등)
      supabase
        .from('ledger_weekly_content')
        .select('character_id, weekly_order_count, abyss_order_count, shugo_base, shugo_bonus')
        .in('character_id', ownedCharIds)
        .eq('week_key', weekKey),

      // 일일 사명
      supabase
        .from('ledger_daily_mission')
        .select('character_id, count')
        .in('character_id', ownedCharIds)
        .eq('record_date', today)
    ])

    // 3. 데이터 매핑
    const itemsByChar = new Map<string, any[]>()
    const contentByChar = new Map<string, any[]>()
    const dungeonByChar = new Map<string, any>()
    const stateByChar = new Map<string, any>()
    const weeklyDataByChar = new Map<string, any>()
    const missionByChar = new Map<string, number>()
    const weeklyIncomeByChar = new Map<string, number>()

    // 아이템 매핑
    itemsResult.data?.forEach(item => {
      const arr = itemsByChar.get(item.ledger_character_id) || []
      arr.push(item)
      itemsByChar.set(item.ledger_character_id, arr)
    })

    // 컨텐츠 기록 매핑
    contentResult.data?.forEach(record => {
      const arr = contentByChar.get(record.character_id) || []
      arr.push(record)
      contentByChar.set(record.character_id, arr)
    })

    // 던전 기록 매핑
    dungeonResult.data?.forEach(record => {
      dungeonByChar.set(record.character_id, record)
    })

    // 캐릭터 상태 매핑
    stateResult.data?.forEach(state => {
      stateByChar.set(state.character_id, state)
    })

    // 주간 데이터 매핑
    weeklyDataResult.data?.forEach(data => {
      weeklyDataByChar.set(data.character_id, data)
    })

    // 일일 사명 매핑
    dailyMissionResult.data?.forEach(mission => {
      missionByChar.set(mission.character_id, mission.count || 0)
    })

    // 주간 수입 계산 (던전 제외 컨텐츠)
    weeklyContentResult.data?.forEach(r => {
      if (dungeonTypes.includes(r.content_type)) return
      const current = weeklyIncomeByChar.get(r.character_id) || 0
      weeklyIncomeByChar.set(r.character_id, current + (r.total_kina || 0))
    })

    // 주간 던전 수입 추가
    weeklyDungeonResult.data?.forEach(r => {
      let dungeonIncome = 0
      if (r.transcend_records && Array.isArray(r.transcend_records)) {
        dungeonIncome += r.transcend_records.reduce((sum: number, rec: any) => sum + (rec.kina || 0), 0)
      }
      if (r.expedition_records && Array.isArray(r.expedition_records)) {
        dungeonIncome += r.expedition_records.reduce((sum: number, rec: any) => sum + (rec.kina || 0), 0)
      }
      if (r.sanctuary_records && Array.isArray(r.sanctuary_records)) {
        dungeonIncome += r.sanctuary_records.reduce((sum: number, rec: any) => sum + (rec.kina || 0), 0)
      }
      const current = weeklyIncomeByChar.get(r.character_id) || 0
      weeklyIncomeByChar.set(r.character_id, current + dungeonIncome)
    })

    // 4. 캐릭터별 결과 생성
    const characters: Record<string, any> = {}

    for (const charId of ownedCharIds) {
      const items = itemsByChar.get(charId) || []
      const contents = contentByChar.get(charId) || []
      const dungeon = dungeonByChar.get(charId)
      const state = stateByChar.get(charId)
      const weeklyData = weeklyDataByChar.get(charId)
      const missionCount = missionByChar.get(charId) || 0

      // 오늘 수입 계산 (던전 제외 컨텐츠)
      let todayIncome = contents
        .filter(c => !dungeonTypes.includes(c.content_type))
        .reduce((sum, c) => sum + (c.total_kina || 0), 0)

      // 오늘 던전 수입 추가
      if (dungeon) {
        if (dungeon.transcend_records && Array.isArray(dungeon.transcend_records)) {
          todayIncome += dungeon.transcend_records.reduce((sum: number, r: any) => sum + (r.kina || 0), 0)
        }
        if (dungeon.expedition_records && Array.isArray(dungeon.expedition_records)) {
          todayIncome += dungeon.expedition_records.reduce((sum: number, r: any) => sum + (r.kina || 0), 0)
        }
        if (dungeon.sanctuary_records && Array.isArray(dungeon.sanctuary_records)) {
          todayIncome += dungeon.sanctuary_records.reduce((sum: number, r: any) => sum + (r.kina || 0), 0)
        }
      }

      // 미판매 아이템 등급별 집계
      const unsoldByGrade = { common: 0, rare: 0, heroic: 0, legendary: 0, ultimate: 0 }
      items.forEach(item => {
        const grade = item.item_grade as keyof typeof unsoldByGrade
        if (grade in unsoldByGrade) unsoldByGrade[grade]++
      })

      // 티켓 상태
      const baseTickets = state?.base_tickets || {
        transcend: 14, expedition: 21, sanctuary: 4,
        daily_dungeon: 7, awakening: 3, nightmare: 14, dimension: 14, subjugation: 3
      }
      const bonusTickets = state?.bonus_tickets || {}

      // 컨텐츠 진행 상황 맵
      const contentMap: Record<string, number> = {}
      contents.forEach(c => {
        contentMap[c.content_type] = c.completion_count || 0
      })

      characters[charId] = {
        name: charNameMap.get(charId) || '',
        todayIncome,
        weeklyIncome: weeklyIncomeByChar.get(charId) || 0,
        unsoldItemCount: items.length,
        unsoldItemsByGrade: unsoldByGrade,
        sellingItems: items,
        baseTickets,
        bonusTickets,
        lastChargeTime: state?.last_charge_time,
        contentRecords: contentMap,
        weeklyData: {
          weeklyOrderCount: weeklyData?.weekly_order_count || 0,
          abyssOrderCount: weeklyData?.abyss_order_count || 0,
          shugoBase: weeklyData?.shugo_base ?? 14,
          shugoBonus: weeklyData?.shugo_bonus || 0
        },
        missionCount
      }
    }

    // 5. 총합 계산
    let totalTodayIncome = 0
    let totalWeeklyIncome = 0
    let totalUnsoldCount = 0
    const totalUnsoldByGrade = { common: 0, rare: 0, heroic: 0, legendary: 0, ultimate: 0 }

    Object.values(characters).forEach((char: any) => {
      totalTodayIncome += char.todayIncome
      totalWeeklyIncome += char.weeklyIncome
      totalUnsoldCount += char.unsoldItemCount
      Object.keys(totalUnsoldByGrade).forEach(grade => {
        totalUnsoldByGrade[grade as keyof typeof totalUnsoldByGrade] += char.unsoldItemsByGrade[grade] || 0
      })
    })

    return NextResponse.json({
      characters,
      totals: {
        todayIncome: totalTodayIncome,
        weeklyIncome: totalWeeklyIncome,
        unsoldItemCount: totalUnsoldCount,
        unsoldItemsByGrade: totalUnsoldByGrade
      }
    })
  } catch (e: any) {
    console.error('[Dashboard API] Error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
