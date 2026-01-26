import { NextRequest, NextResponse } from 'next/server'
import { getSupabase, getUserFromRequestWithDevice } from '../../../../lib/auth'
import { verifyCharacterOwnership } from '../../../../lib/ledgerAuth'
import { getKoreanGameDate } from '../../../../lib/koreanDate'

// getGameDate를 getKoreanGameDate의 별칭으로 사용
const getGameDate = getKoreanGameDate

// GET: 통계 조회
export async function GET(request: NextRequest) {
  const user = await getUserFromRequestWithDevice(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const characterId = searchParams.get('characterId')
  const type = searchParams.get('type') // 'daily', 'weekly', 'monthly', 'summary'
  const date = searchParams.get('date') // 기준 날짜

  if (!characterId) {
    return NextResponse.json({ error: 'Missing characterId' }, { status: 400 })
  }

  // 캐릭터 소유권 검증
  const isOwner = await verifyCharacterOwnership(characterId, user.id)
  if (!isOwner) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const today = date || getGameDate()

  try {
    if (type === 'daily') {
      return await getDailyStats(characterId, today)
    } else if (type === 'weekly') {
      return await getWeeklyStats(characterId, today)
    } else if (type === 'monthly') {
      return await getMonthlyStats(characterId, today)
    } else {
      return await getSummaryStats(characterId, today)
    }
  } catch (e: any) {
    console.error('Get stats error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

async function getDailyStats(characterId: string, date: string) {
  const supabase = getSupabase()

  // 던전 타입 (중복 계산 방지용 - dungeonIncome에서 별도 계산)
  const dungeonTypes = ['transcend', 'expedition', 'sanctuary']

  // 컨텐츠 수입 (던전 타입 제외 - 중복 방지)
  const { data: contentRecords, error: contentError } = await supabase
    .from('ledger_content_records')
    .select('total_kina, content_type')
    .eq('character_id', characterId)
    .eq('record_date', date)

  console.log(`[Stats] getDailyStats - characterId: ${characterId}, date: ${date}`)
  console.log(`[Stats] contentRecords:`, contentRecords, contentError)

  // 던전 타입 제외한 컨텐츠만 합산
  const contentIncome = contentRecords
    ?.filter(r => !dungeonTypes.includes(r.content_type))
    .reduce((sum, r) => sum + (r.total_kina || 0), 0) || 0

  // 던전 수입 (초월, 원정대, 성역)
  const { data: dungeonRecord } = await supabase
    .from('ledger_dungeon_records')
    .select('transcend_records, expedition_records, sanctuary_records')
    .eq('character_id', characterId)
    .eq('record_date', date)
    .single()

  let dungeonIncome = 0
  if (dungeonRecord) {
    // 초월 키나 합산
    if (dungeonRecord.transcend_records && Array.isArray(dungeonRecord.transcend_records)) {
      dungeonIncome += dungeonRecord.transcend_records.reduce((sum: number, r: any) => sum + (r.kina || 0), 0)
    }
    // 원정대 키나 합산
    if (dungeonRecord.expedition_records && Array.isArray(dungeonRecord.expedition_records)) {
      dungeonIncome += dungeonRecord.expedition_records.reduce((sum: number, r: any) => sum + (r.kina || 0), 0)
    }
    // 성역 키나 합산
    if (dungeonRecord.sanctuary_records && Array.isArray(dungeonRecord.sanctuary_records)) {
      dungeonIncome += dungeonRecord.sanctuary_records.reduce((sum: number, r: any) => sum + (r.kina || 0), 0)
    }
  }

  // 아이템 판매 수입 (해당 날짜에 판매된 것)
  const { data: soldItems } = await supabase
    .from('ledger_items')
    .select('sold_price')
    .eq('ledger_character_id', characterId)
    .not('sold_price', 'is', null)
    .eq('sold_date', date)

  const itemIncome = soldItems?.reduce((sum, i) => sum + (i.sold_price || 0), 0) || 0

  return NextResponse.json({
    date,
    contentIncome,
    dungeonIncome,
    itemIncome,
    totalIncome: contentIncome + dungeonIncome + itemIncome
  })
}

async function getWeeklyStats(characterId: string, date: string) {
  const supabase = getSupabase()

  // 던전 타입 (중복 계산 방지용)
  const dungeonTypes = ['transcend', 'expedition', 'sanctuary']

  // 주의 시작일 계산 (월요일 기준)
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // 월요일로 조정
  const startDate = new Date(d.setDate(diff)).toISOString().split('T')[0]
  const endDate = new Date(d.setDate(d.getDate() + 6)).toISOString().split('T')[0]

  console.log(`[Stats] getWeeklyStats - characterId: ${characterId}, date: ${date}, startDate: ${startDate}, endDate: ${endDate}`)

  // 주간 컨텐츠 수입 (던전 타입 제외)
  const { data: contentRecords } = await supabase
    .from('ledger_content_records')
    .select('record_date, total_kina, content_type')
    .eq('character_id', characterId)
    .gte('record_date', startDate)
    .lte('record_date', endDate)

  // 주간 던전 수입 (초월, 원정대, 성역)
  const { data: dungeonRecords } = await supabase
    .from('ledger_dungeon_records')
    .select('record_date, transcend_records, expedition_records, sanctuary_records')
    .eq('character_id', characterId)
    .gte('record_date', startDate)
    .lte('record_date', endDate)

  // 주간 아이템 판매 수입
  const { data: soldItems } = await supabase
    .from('ledger_items')
    .select('sold_price, sold_date, item_name')
    .eq('ledger_character_id', characterId)
    .not('sold_price', 'is', null)
    .gte('sold_date', startDate)
    .lte('sold_date', endDate)

  console.log(`[Stats] getWeeklyStats - contentRecords:`, contentRecords?.length, 'dungeonRecords:', dungeonRecords?.length, 'soldItems:', soldItems?.length)

  // 일별 데이터 집계
  const dailyMap = new Map<string, { contentIncome: number; dungeonIncome: number; itemIncome: number }>()

  // 7일간의 빈 데이터 초기화
  for (let i = 0; i < 7; i++) {
    const dateKey = new Date(new Date(startDate).getTime() + i * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0]
    dailyMap.set(dateKey, { contentIncome: 0, dungeonIncome: 0, itemIncome: 0 })
  }

  // 컨텐츠 수입 집계 (던전 타입 제외)
  contentRecords?.forEach(r => {
    if (dungeonTypes.includes(r.content_type)) return // 던전 타입 제외
    const existing = dailyMap.get(r.record_date)
    if (existing) {
      existing.contentIncome += r.total_kina || 0
    }
  })

  // 던전 수입 집계
  dungeonRecords?.forEach(r => {
    const existing = dailyMap.get(r.record_date)
    if (existing) {
      // 초월 키나 합산
      if (r.transcend_records && Array.isArray(r.transcend_records)) {
        existing.dungeonIncome += r.transcend_records.reduce((sum: number, rec: any) => sum + (rec.kina || 0), 0)
      }
      // 원정대 키나 합산
      if (r.expedition_records && Array.isArray(r.expedition_records)) {
        existing.dungeonIncome += r.expedition_records.reduce((sum: number, rec: any) => sum + (rec.kina || 0), 0)
      }
      // 성역 키나 합산
      if (r.sanctuary_records && Array.isArray(r.sanctuary_records)) {
        existing.dungeonIncome += r.sanctuary_records.reduce((sum: number, rec: any) => sum + (rec.kina || 0), 0)
      }
    }
  })

  // 아이템 판매 수입 집계
  soldItems?.forEach(r => {
    if (!r.sold_date) return
    const existing = dailyMap.get(r.sold_date)
    if (existing) {
      existing.itemIncome += r.sold_price || 0
    }
  })

  // 결과 정리
  const dailyData = Array.from(dailyMap.entries()).map(([dateKey, data]) => ({
    date: dateKey,
    contentIncome: data.contentIncome,
    dungeonIncome: data.dungeonIncome,
    itemIncome: data.itemIncome,
    totalIncome: data.contentIncome + data.dungeonIncome + data.itemIncome
  }))

  const totalIncome = dailyData.reduce((sum, d) => sum + d.totalIncome, 0)
  const averageIncome = Math.round(totalIncome / 7)
  const bestDay = dailyData.reduce((best, d) =>
    d.totalIncome > best.income ? { date: d.date, income: d.totalIncome } : best
  , { date: '', income: 0 })

  return NextResponse.json({
    startDate,
    endDate,
    dailyData,
    totalIncome,
    averageIncome,
    bestDay
  })
}

async function getMonthlyStats(characterId: string, date: string) {
  const supabase = getSupabase()

  // 던전 타입 (중복 계산 방지용)
  const dungeonTypes = ['transcend', 'expedition', 'sanctuary']

  // 이번 달 시작일과 끝일 계산
  const d = new Date(date)
  const startDate = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
  const endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]

  // 월간 컨텐츠 수입 (던전 타입 제외)
  const { data: contentRecords } = await supabase
    .from('ledger_content_records')
    .select('record_date, total_kina, content_type')
    .eq('character_id', characterId)
    .gte('record_date', startDate)
    .lte('record_date', endDate)

  // 월간 던전 수입 (초월, 원정대, 성역)
  const { data: dungeonRecords } = await supabase
    .from('ledger_dungeon_records')
    .select('record_date, transcend_records, expedition_records, sanctuary_records')
    .eq('character_id', characterId)
    .gte('record_date', startDate)
    .lte('record_date', endDate)

  // 월간 아이템 판매 수입
  const { data: soldItems } = await supabase
    .from('ledger_items')
    .select('sold_price, sold_date')
    .eq('ledger_character_id', characterId)
    .not('sold_price', 'is', null)
    .gte('sold_date', startDate)
    .lte('sold_date', endDate)

  // 일별 데이터 집계
  const dailyMap = new Map<string, { contentIncome: number; dungeonIncome: number; itemIncome: number }>()

  // 해당 월의 모든 날짜 초기화
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  for (let i = 1; i <= daysInMonth; i++) {
    const dateKey = new Date(d.getFullYear(), d.getMonth(), i).toISOString().split('T')[0]
    dailyMap.set(dateKey, { contentIncome: 0, dungeonIncome: 0, itemIncome: 0 })
  }

  // 컨텐츠 수입 집계 (던전 타입 제외)
  contentRecords?.forEach(r => {
    if (dungeonTypes.includes(r.content_type)) return // 던전 타입 제외
    const existing = dailyMap.get(r.record_date)
    if (existing) {
      existing.contentIncome += r.total_kina || 0
    }
  })

  // 던전 수입 집계
  dungeonRecords?.forEach(r => {
    const existing = dailyMap.get(r.record_date)
    if (existing) {
      // 초월 키나 합산
      if (r.transcend_records && Array.isArray(r.transcend_records)) {
        existing.dungeonIncome += r.transcend_records.reduce((sum: number, rec: any) => sum + (rec.kina || 0), 0)
      }
      // 원정대 키나 합산
      if (r.expedition_records && Array.isArray(r.expedition_records)) {
        existing.dungeonIncome += r.expedition_records.reduce((sum: number, rec: any) => sum + (rec.kina || 0), 0)
      }
      // 성역 키나 합산
      if (r.sanctuary_records && Array.isArray(r.sanctuary_records)) {
        existing.dungeonIncome += r.sanctuary_records.reduce((sum: number, rec: any) => sum + (rec.kina || 0), 0)
      }
    }
  })

  // 아이템 판매 수입 집계
  soldItems?.forEach(r => {
    if (!r.sold_date) return
    const existing = dailyMap.get(r.sold_date)
    if (existing) {
      existing.itemIncome += r.sold_price || 0
    }
  })

  // 결과 정리
  const dailyData = Array.from(dailyMap.entries()).map(([dateKey, data]) => ({
    date: dateKey,
    contentIncome: data.contentIncome,
    dungeonIncome: data.dungeonIncome,
    itemIncome: data.itemIncome,
    totalIncome: data.contentIncome + data.dungeonIncome + data.itemIncome
  }))

  const totalIncome = dailyData.reduce((sum, d) => sum + d.totalIncome, 0)
  const activeDays = dailyData.filter(d => d.totalIncome > 0).length
  const averageIncome = activeDays > 0 ? Math.round(totalIncome / activeDays) : 0
  const bestDay = dailyData.reduce((best, d) =>
    d.totalIncome > best.income ? { date: d.date, income: d.totalIncome } : best
  , { date: '', income: 0 })

  return NextResponse.json({
    startDate,
    endDate,
    dailyData,
    totalIncome,
    averageIncome,
    activeDays,
    bestDay
  })
}

async function getSummaryStats(characterId: string, today: string) {
  const supabase = getSupabase()

  console.log(`[Stats] getSummaryStats - characterId: ${characterId}, today: ${today}`)

  // 오늘 수입
  const dailyResult = await getDailyStats(characterId, today)
  const dailyData = await dailyResult.json()

  // 주간 수입
  const weeklyResult = await getWeeklyStats(characterId, today)
  const weeklyData = await weeklyResult.json()

  // 월간 수입
  const monthlyResult = await getMonthlyStats(characterId, today)
  const monthlyData = await monthlyResult.json()

  console.log(`[Stats] getSummaryStats result - daily: ${dailyData.totalIncome}, weekly: ${weeklyData.totalIncome}, monthly: ${monthlyData.totalIncome}`)

  // 미판매 아이템 수
  const { data: unsoldItems } = await supabase
    .from('ledger_items')
    .select('item_grade')
    .eq('ledger_character_id', characterId)
    .is('sold_price', null)

  const unsoldItemsByGrade = {
    common: 0,
    rare: 0,
    heroic: 0,
    legendary: 0,
    ultimate: 0
  }

  unsoldItems?.forEach(item => {
    const grade = item.item_grade as keyof typeof unsoldItemsByGrade
    if (grade in unsoldItemsByGrade) {
      unsoldItemsByGrade[grade]++
    }
  })

  return NextResponse.json({
    todayIncome: dailyData.totalIncome,
    weeklyIncome: weeklyData.totalIncome,
    monthlyIncome: monthlyData.totalIncome,
    unsoldItemCount: unsoldItems?.length || 0,
    unsoldItemsByGrade
  })
}
