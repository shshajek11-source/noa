'use client'

import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, Calendar, CalendarDays } from 'lucide-react'
import { LedgerCharacter, ItemGrade } from '@/types/ledger'
import CharacterStatusTable from './CharacterStatusTable'
import TotalItemsSummary from './TotalItemsSummary'
import { getGameDate, getWeekKey } from '../utils/dateUtils'
import styles from '../ledger.module.css'

interface ItemByCharacter {
  characterId: string
  characterName: string
  quantity: number
  price: number
}

interface AggregatedItem {
  itemName: string
  itemGrade: ItemGrade
  iconUrl?: string
  totalQuantity: number
  totalPrice: number
  byCharacter: ItemByCharacter[]
}

// 충전 타입 정의
type ChargeType = '8h' | 'daily' | '24h' | 'weekly' | 'shugo'

interface ContentProgress {
  id: string
  name: string
  current: number      // 완료 횟수
  max: number          // 기본 최대 횟수
  bonus?: number       // 충전권 보너스 횟수
  chargeType?: ChargeType  // 충전 타입
  nextChargeSeconds?: number  // 다음 충전까지 남은 초
}

interface CharacterStatus {
  character: LedgerCharacter
  todayIncome: number
  weeklyIncome: number
  sellingItemCount: number
  soldItemCount: number
  weeklyContents: ContentProgress[]
  dailyContents: ContentProgress[]
}

interface DashboardSummaryProps {
  characters: LedgerCharacter[]
  totalTodayIncome: number
  totalWeeklyIncome: number
  unsoldItemCount: number
  unsoldItemsByGrade: {
    legendary: number
    heroic: number
    rare: number
    common: number
    ultimate: number
  }
  onCharacterClick: (characterId: string) => void
  getAuthHeader?: () => Record<string, string>
}

// 주간 컨텐츠 기본 정의 (chargeType 포함)
const WEEKLY_CONTENT_DEFS: { id: string; name: string; maxPerChar: number; chargeType: ChargeType }[] = [
  { id: 'transcend', name: '초월', maxPerChar: 14, chargeType: '8h' },
  { id: 'expedition', name: '원정', maxPerChar: 21, chargeType: '8h' },
  { id: 'sanctuary', name: '성역', maxPerChar: 4, chargeType: 'weekly' },
  { id: 'shugo', name: '슈고페스타', maxPerChar: 14, chargeType: 'shugo' },
  { id: 'mission', name: '사명', maxPerChar: 5, chargeType: 'daily' },
  { id: 'weekly_order', name: '주간지령서', maxPerChar: 12, chargeType: 'weekly' },
  { id: 'abyss_order', name: '어비스지령서', maxPerChar: 20, chargeType: 'weekly' },
]

// 일일 컨텐츠 기본 정의 (chargeType 포함)
const DAILY_CONTENT_DEFS: { id: string; name: string; maxPerChar: number; chargeType: ChargeType }[] = [
  { id: 'daily_dungeon', name: '일일던전', maxPerChar: 7, chargeType: 'weekly' },
  { id: 'awakening', name: '각성전', maxPerChar: 3, chargeType: 'weekly' },
  { id: 'subjugation', name: '토벌전', maxPerChar: 3, chargeType: 'weekly' },
  { id: 'nightmare', name: '악몽', maxPerChar: 14, chargeType: 'daily' },
  { id: 'dimension', name: '차원침공', maxPerChar: 14, chargeType: '24h' },
  { id: 'abyss_hallway', name: '어비스회랑', maxPerChar: 3, chargeType: 'weekly' },
]

// 충전 시간 계산 함수들
function getNextChargeSeconds(chargeType: ChargeType, lastChargeTime?: string): number {
  const now = new Date()

  switch (chargeType) {
    case '8h': {
      // 8시간마다 충전 (21시, 05시, 13시)
      const chargeHours = [5, 13, 21]
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      const currentSecond = now.getSeconds()

      let nextChargeHour = chargeHours.find(h => h > currentHour)
      let daysToAdd = 0

      if (nextChargeHour === undefined) {
        nextChargeHour = chargeHours[0] // 다음날 05시
        daysToAdd = 1
      }

      const hoursUntil = nextChargeHour - currentHour + (daysToAdd * 24)
      return (hoursUntil - 1) * 3600 + (60 - currentMinute - 1) * 60 + (60 - currentSecond)
    }

    case 'daily': {
      // 매일 05시 충전
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      const currentSecond = now.getSeconds()

      let hoursUntil = 5 - currentHour
      if (hoursUntil <= 0) hoursUntil += 24

      return (hoursUntil - 1) * 3600 + (60 - currentMinute - 1) * 60 + (60 - currentSecond)
    }

    case '24h': {
      // 24시간마다 충전 (마지막 충전 시간 기준)
      if (!lastChargeTime) return 24 * 3600

      const lastCharge = new Date(lastChargeTime)
      const nextCharge = new Date(lastCharge.getTime() + 24 * 60 * 60 * 1000)
      const diff = Math.max(0, Math.floor((nextCharge.getTime() - now.getTime()) / 1000))
      return diff
    }

    case 'weekly': {
      // 수요일 05시 리셋
      const currentDay = now.getDay() // 0=일, 3=수
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      const currentSecond = now.getSeconds()

      let daysUntilWed = (3 - currentDay + 7) % 7
      if (daysUntilWed === 0 && (currentHour > 5 || (currentHour === 5 && currentMinute > 0))) {
        daysUntilWed = 7
      }

      let hoursUntil = 5 - currentHour
      if (daysUntilWed === 0) {
        // 오늘이 수요일이고 아직 05시 전
        return (hoursUntil - 1) * 3600 + (60 - currentMinute - 1) * 60 + (60 - currentSecond)
      }

      return daysUntilWed * 24 * 3600 + (24 + hoursUntil - 1) * 3600 + (60 - currentMinute - 1) * 60 + (60 - currentSecond)
    }

    case 'shugo': {
      // 슈고페스타: 이용권 충전시간마다 (8시간 기준과 동일)
      return getNextChargeSeconds('8h', lastChargeTime)
    }

    default:
      return 0
  }
}

export default function DashboardSummary({
  characters,
  totalTodayIncome,
  totalWeeklyIncome,
  unsoldItemCount,
  unsoldItemsByGrade,
  onCharacterClick,
  getAuthHeader
}: DashboardSummaryProps) {
  // 대시보드 데이터 상태
  const [characterStatuses, setCharacterStatuses] = useState<CharacterStatus[]>([])
  const [sellingItems, setSellingItems] = useState<AggregatedItem[]>([])
  const [soldItems, setSoldItems] = useState<AggregatedItem[]>([])
  const [totalSoldIncome, setTotalSoldIncome] = useState(0)
  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // 주간/일일 컨텐츠 전체 진행률
  const [weeklyContents, setWeeklyContents] = useState<ContentProgress[]>([])
  const [dailyContents, setDailyContents] = useState<ContentProgress[]>([])

  const formatKina = (value: number) => {
    return value.toLocaleString('ko-KR')
  }

  // 대시보드 데이터 로드
  const loadDashboardData = useCallback(async () => {
    if (characters.length === 0) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      const authHeaders = getAuthHeader?.() || {}
      const charStatuses: CharacterStatus[] = []
      const allItems: any[] = []
      let totalMonthlyIncome = 0

      const today = getGameDate(new Date())
      const weekKey = getWeekKey(new Date())

      // 캐릭터별 데이터 로드 (병렬 처리)
      const charDataPromises = characters.map(async (char) => {
        try {
          // 병렬로 데이터 요청 (DB API 사용)
          const [itemsRes, statsRes, contentRes, weeklyRes, stateRes] = await Promise.all([
            fetch(`/api/ledger/items?characterId=${char.id}`, { headers: authHeaders }),
            fetch(`/api/ledger/stats?characterId=${char.id}&type=summary`, { headers: authHeaders }),
            fetch(`/api/ledger/content-records?characterId=${char.id}&date=${today}`, { headers: authHeaders }),
            fetch(`/api/ledger/weekly-content?characterId=${char.id}&weekKey=${weekKey}&gameDate=${today}`, { headers: authHeaders }),
            fetch(`/api/ledger/character-state?characterId=${char.id}`, { headers: authHeaders })
          ])

          const itemsData = itemsRes.ok ? await itemsRes.json() : []
          const statsData = statsRes.ok ? await statsRes.json() : {}
          const contentData = contentRes.ok ? await contentRes.json() : []
          const weeklyData = weeklyRes.ok ? await weeklyRes.json() : { weekly: null, mission: null }
          const stateData = stateRes.ok ? await stateRes.json() : { baseTickets: {}, bonusTickets: {}, lastChargeTime: null }

          return { char, itemsData, statsData, contentData, weeklyData, stateData }
        } catch (e) {
          console.error('Error loading character data:', char.id, e)
          return { char, itemsData: [], statsData: {}, contentData: [], weeklyData: { weekly: null, mission: null }, stateData: {} }
        }
      })

      const charDataResults = await Promise.all(charDataPromises)

      // 결과 처리
      for (const { char, itemsData, statsData, contentData, weeklyData, stateData } of charDataResults) {
        // 아이템 데이터 수집
        allItems.push(...itemsData.map((item: any) => ({
          ...item,
          characterId: char.id,
          characterName: char.name
        })))

        // 월간 수입 합산
        totalMonthlyIncome += statsData.monthlyIncome || 0

        // 티켓 상태에서 보너스 정보 추출
        const baseTickets = stateData.baseTickets || {}
        const bonusTickets = stateData.bonusTickets || {}
        const lastChargeTime = stateData.lastChargeTime

        // 주간 컨텐츠 데이터
        const weekly = weeklyData.weekly || {}
        const mission = weeklyData.mission || {}

        // 일일 컨텐츠 기록 (content_records 배열에서 추출)
        const contentRecordsMap: Record<string, number> = {}
        if (Array.isArray(contentData)) {
          contentData.forEach((record: any) => {
            contentRecordsMap[record.content_type] = record.completion_count || 0
          })
        }

        // 주간 컨텐츠 진행률 계산 (DB 데이터 사용)
        const weeklyProgressForChar: ContentProgress[] = WEEKLY_CONTENT_DEFS.map(def => {
          let current = 0
          let bonus = 0
          const max = def.maxPerChar  // max는 항상 고정 최대값 사용

          if (def.id === 'transcend') {
            // baseTickets.transcend는 잔여횟수, 완료횟수 = 최대 - 잔여
            const remaining = baseTickets.transcend ?? def.maxPerChar
            current = def.maxPerChar - remaining
            bonus = bonusTickets.transcend || 0
          } else if (def.id === 'expedition') {
            // baseTickets.expedition는 잔여횟수, 완료횟수 = 최대 - 잔여
            const remaining = baseTickets.expedition ?? def.maxPerChar
            current = def.maxPerChar - remaining
            bonus = bonusTickets.expedition || 0
          } else if (def.id === 'sanctuary') {
            // baseTickets.sanctuary는 잔여횟수, 완료횟수 = 최대 - 잔여
            const remaining = baseTickets.sanctuary ?? def.maxPerChar
            current = def.maxPerChar - remaining
            bonus = bonusTickets.sanctuary || 0
          } else if (def.id === 'shugo') {
            // 슈고페스타: base는 잔여횟수, 완료횟수 = 14 - base
            const shugoBase = weekly.shugoTickets?.base ?? 14
            current = 14 - shugoBase
            bonus = weekly.shugoTickets?.bonus || 0
          } else if (def.id === 'mission') {
            current = mission.count || 0
          } else if (def.id === 'weekly_order') {
            current = weekly.weeklyOrderCount || 0
          } else if (def.id === 'abyss_order') {
            current = weekly.abyssOrderCount || 0
          }

          return {
            id: def.id,
            name: def.name,
            current,
            max,
            bonus: bonus > 0 ? bonus : undefined,
            chargeType: def.chargeType,
            nextChargeSeconds: getNextChargeSeconds(def.chargeType, lastChargeTime)
          }
        })

        // 일일 컨텐츠 진행률 계산 (DB 데이터 사용)
        const dailyProgressForChar: ContentProgress[] = DAILY_CONTENT_DEFS.map(def => {
          let current = 0
          let bonus = 0
          const max = def.maxPerChar  // max는 항상 고정 최대값 사용

          // content_records에서 완료 횟수 가져오기
          const contentTypeMap: Record<string, string> = {
            'daily_dungeon': 'daily_dungeon',
            'awakening': 'awakening_battle',
            'subjugation': 'subjugation',
            'nightmare': 'nightmare',
            'dimension': 'dimension_invasion',
            'abyss_hallway': 'abyss_hallway'
          }

          const dbContentType = contentTypeMap[def.id] || def.id
          current = contentRecordsMap[dbContentType] || 0

          // 티켓 상태에서 bonus 가져오기
          const ticketMap: Record<string, string> = {
            'daily_dungeon': 'daily_dungeon',
            'awakening': 'awakening',
            'subjugation': 'subjugation',
            'nightmare': 'nightmare',
            'dimension': 'dimension'
          }

          const ticketKey = ticketMap[def.id]
          if (ticketKey) {
            bonus = bonusTickets[ticketKey] || 0
          }

          return {
            id: def.id,
            name: def.name,
            current,
            max,
            bonus: bonus > 0 ? bonus : undefined,
            chargeType: def.chargeType,
            nextChargeSeconds: getNextChargeSeconds(def.chargeType, lastChargeTime)
          }
        })

        const sellingCount = itemsData.filter((i: any) => i.sold_price === null).length
        const soldCount = itemsData.filter((i: any) => i.sold_price !== null).length

        charStatuses.push({
          character: char,
          todayIncome: statsData.todayIncome ?? 0,
          weeklyIncome: statsData.weeklyIncome ?? 0,
          sellingItemCount: sellingCount,
          soldItemCount: soldCount,
          weeklyContents: weeklyProgressForChar,
          dailyContents: dailyProgressForChar
        })
      }

      setCharacterStatuses(charStatuses)

      // 아이템 합산 처리
      const sellingItemsMap = new Map<string, AggregatedItem>()
      const soldItemsMap = new Map<string, AggregatedItem>()
      let soldIncomeTotal = 0

      allItems.forEach((item: any) => {
        const isSold = item.sold_price !== null
        const map = isSold ? soldItemsMap : sellingItemsMap
        const key = item.item_name
        const price = isSold ? (item.sold_price || 0) : (item.total_price || item.unit_price || 0)

        if (isSold) {
          soldIncomeTotal += item.sold_price || 0
        }

        if (map.has(key)) {
          const existing = map.get(key)!
          existing.totalQuantity += item.quantity || 1
          existing.totalPrice += price
          // iconUrl이 없으면 기존 아이템의 것 유지, 있으면 업데이트
          if (!existing.iconUrl && item.icon_url) {
            existing.iconUrl = item.icon_url
          }
          existing.byCharacter.push({
            characterId: item.characterId,
            characterName: item.characterName,
            quantity: item.quantity || 1,
            price: price
          })
        } else {
          map.set(key, {
            itemName: item.item_name,
            itemGrade: item.item_grade || 'common',
            iconUrl: item.icon_url,
            totalQuantity: item.quantity || 1,
            totalPrice: price,
            byCharacter: [{
              characterId: item.characterId,
              characterName: item.characterName,
              quantity: item.quantity || 1,
              price: price
            }]
          })
        }
      })

      setSellingItems(Array.from(sellingItemsMap.values()))
      setSoldItems(Array.from(soldItemsMap.values()))
      setTotalSoldIncome(soldIncomeTotal)

      // 전체 컨텐츠 진행률 합산 (bonus와 chargeType 포함)
      const weeklyTotal: ContentProgress[] = WEEKLY_CONTENT_DEFS.map(def => {
        const total = charStatuses.reduce((acc, cs) => {
          const content = cs.weeklyContents.find(c => c.id === def.id)
          return {
            current: acc.current + (content?.current || 0),
            max: acc.max + (content?.max || def.maxPerChar),
            bonus: acc.bonus + (content?.bonus || 0)
          }
        }, { current: 0, max: 0, bonus: 0 })
        return {
          id: def.id,
          name: def.name,
          current: total.current,
          max: total.max,
          bonus: total.bonus > 0 ? total.bonus : undefined,
          chargeType: def.chargeType,
          nextChargeSeconds: getNextChargeSeconds(def.chargeType)
        }
      })

      const dailyTotal: ContentProgress[] = DAILY_CONTENT_DEFS.map(def => {
        const total = charStatuses.reduce((acc, cs) => {
          const content = cs.dailyContents.find(c => c.id === def.id)
          return {
            current: acc.current + (content?.current || 0),
            max: acc.max + (content?.max || def.maxPerChar),
            bonus: acc.bonus + (content?.bonus || 0)
          }
        }, { current: 0, max: 0, bonus: 0 })
        return {
          id: def.id,
          name: def.name,
          current: total.current,
          max: total.max,
          bonus: total.bonus > 0 ? total.bonus : undefined,
          chargeType: def.chargeType,
          nextChargeSeconds: getNextChargeSeconds(def.chargeType)
        }
      })

      setWeeklyContents(weeklyTotal)
      setDailyContents(dailyTotal)
      setMonthlyIncome(totalMonthlyIncome)

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [characters, getAuthHeader])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // 판매중/완료 아이템 총 개수
  const totalSellingCount = sellingItems.reduce((sum, item) => sum + item.totalQuantity, 0)
  const totalSoldCount = soldItems.reduce((sum, item) => sum + item.totalQuantity, 0)

  return (
    <>
      {/* 전체 수입 현황 */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <TrendingUp size={18} />
            전체 수입 현황
          </h2>
        </div>

        <div className={styles.kinaGrid} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className={styles.kinaCard}>
            <div className={styles.kinaLabel}>
              <Calendar size={14} />
              오늘 총 수입
            </div>
            <div className={styles.kinaValue}>
              {formatKina(totalTodayIncome)} 키나
            </div>
          </div>

          <div className={styles.kinaCard}>
            <div className={styles.kinaLabel}>
              <TrendingUp size={14} />
              이번주 총 수입
            </div>
            <div className={styles.kinaValue}>
              {formatKina(totalWeeklyIncome)} 키나
            </div>
          </div>

          <div className={styles.kinaCard}>
            <div className={styles.kinaLabel}>
              <CalendarDays size={14} />
              이번달 총 수입
            </div>
            <div className={styles.kinaValue}>
              {formatKina(monthlyIncome)} 키나
            </div>
          </div>
        </div>
      </section>

      {/* 캐릭터별 현황 */}
      <CharacterStatusTable
        characterStatuses={characterStatuses}
        onCharacterClick={onCharacterClick}
      />

      {/* 전체 아이템 현황 */}
      <TotalItemsSummary
        sellingItems={sellingItems}
        soldItems={soldItems}
        totalSellingCount={totalSellingCount}
        totalSoldCount={totalSoldCount}
        totalSoldIncome={totalSoldIncome}
      />
    </>
  )
}
