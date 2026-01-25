import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, getUserFromRequest } from '../../../../lib/auth'

// GET: 월간 통계 조회 (전체 캐릭터 합산)
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const yearParam = searchParams.get('year')
  const monthParam = searchParams.get('month')

  // 기본값: 현재 월
  const now = new Date()
  const year = yearParam ? parseInt(yearParam) : now.getFullYear()
  const month = monthParam ? parseInt(monthParam) : now.getMonth() + 1

  // 월 시작일/종료일
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

  const supabase = getSupabase()

  try {
    // 1. 유저의 모든 캐릭터 조회
    const { data: characters, error: charError } = await supabase
      .from('ledger_characters')
      .select('id, name, race')
      .eq('user_id', user.id)

    if (charError) throw charError
    if (!characters || characters.length === 0) {
      return NextResponse.json({
        year,
        month,
        totalIncome: 0,
        dailyIncome: Array(lastDay).fill(0),
        contentStats: { transcend: 0, expedition: 0, sanctuary: 0 },
        itemSales: 0,
        characterStats: []
      })
    }

    const characterIds = characters.map(c => c.id)

    // 2. 던전 기록 조회 (초월, 원정, 성역)
    const { data: dungeonRecords } = await supabase
      .from('ledger_dungeon_records')
      .select('character_id, record_date, transcend_records, expedition_records, sanctuary_records')
      .in('character_id', characterIds)
      .gte('record_date', startDate)
      .lte('record_date', endDate)

    // 3. 아이템 판매 기록 조회
    const { data: soldItems } = await supabase
      .from('ledger_items')
      .select('ledger_character_id, sold_price, updated_at')
      .in('ledger_character_id', characterIds)
      .not('sold_price', 'is', null)
      .gte('updated_at', `${startDate}T00:00:00`)
      .lte('updated_at', `${endDate}T23:59:59`)

    // 4. 일별 수입 집계
    const dailyIncome: number[] = Array(lastDay).fill(0)
    const contentStats = { transcend: 0, expedition: 0, sanctuary: 0 }
    const characterIncomeMap = new Map<string, number>()

    // 캐릭터별 수입 초기화
    characters.forEach(c => characterIncomeMap.set(c.id, 0))

    // 던전 수입 집계
    dungeonRecords?.forEach(record => {
      const day = parseInt(record.record_date.split('-')[2]) - 1
      let recordTotal = 0

      // 초월
      if (record.transcend_records && Array.isArray(record.transcend_records)) {
        const transcendKina = record.transcend_records.reduce((sum: number, r: any) => sum + (r.kina || 0), 0)
        contentStats.transcend += transcendKina
        recordTotal += transcendKina
      }

      // 원정
      if (record.expedition_records && Array.isArray(record.expedition_records)) {
        const expeditionKina = record.expedition_records.reduce((sum: number, r: any) => sum + (r.kina || 0), 0)
        contentStats.expedition += expeditionKina
        recordTotal += expeditionKina
      }

      // 성역
      if (record.sanctuary_records && Array.isArray(record.sanctuary_records)) {
        const sanctuaryKina = record.sanctuary_records.reduce((sum: number, r: any) => sum + (r.kina || 0), 0)
        contentStats.sanctuary += sanctuaryKina
        recordTotal += sanctuaryKina
      }

      dailyIncome[day] += recordTotal

      // 캐릭터별 수입 누적
      const current = characterIncomeMap.get(record.character_id) || 0
      characterIncomeMap.set(record.character_id, current + recordTotal)
    })

    // 아이템 판매 수입 집계
    let itemSales = 0
    soldItems?.forEach(item => {
      const soldPrice = item.sold_price || 0
      itemSales += soldPrice

      // 일별 집계
      const itemDate = new Date(item.updated_at)
      const day = itemDate.getDate() - 1
      if (day >= 0 && day < lastDay) {
        dailyIncome[day] += soldPrice
      }

      // 캐릭터별 수입 누적
      const current = characterIncomeMap.get(item.ledger_character_id) || 0
      characterIncomeMap.set(item.ledger_character_id, current + soldPrice)
    })

    // 5. 캐릭터별 통계 정리
    const characterStats = characters.map(c => ({
      id: c.id,
      name: c.name,
      race: c.race || '천족',
      income: characterIncomeMap.get(c.id) || 0
    })).sort((a, b) => b.income - a.income)

    // 6. 총 수입 계산
    const totalIncome = contentStats.transcend + contentStats.expedition + contentStats.sanctuary + itemSales

    return NextResponse.json({
      year,
      month,
      startDate,
      endDate,
      totalIncome,
      dailyIncome: dailyIncome.map(v => Math.round(v / 10000)), // 만 키나 단위로 변환
      contentStats,
      itemSales,
      characterStats,
      daysInMonth: lastDay
    })

  } catch (e: any) {
    console.error('[Monthly Stats] Error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
