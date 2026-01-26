'use client'

import { useState, useEffect, useCallback, memo, useRef } from 'react'
import { TrendingUp, Calendar, CalendarDays } from 'lucide-react'
import { LedgerCharacter, ItemGrade } from '@/types/ledger'
import { getKSTDate } from '../utils/dateUtils'
import CharacterStatusTable from './CharacterStatusTable'
import TotalItemsSummary from './TotalItemsSummary'
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
  sellingItemCount: number
  soldItemCount: number
  weeklyContents: ContentProgress[]
  dailyContents: ContentProgress[]
}

interface DashboardSummaryProps {
  characters: LedgerCharacter[]
  totalTodayIncome: number
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

// 충전 시간 계산 함수들 (한국 시간 KST 기준)
function getNextChargeSeconds(chargeType: ChargeType, lastChargeTime?: string): number {
  // 한국 시간(KST) 기준으로 계산
  const now = getKSTDate()

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
      const realNow = new Date() // 24h는 실제 경과 시간 기준
      const diff = Math.max(0, Math.floor((nextCharge.getTime() - realNow.getTime()) / 1000))
      return diff
    }

    case 'weekly': {
      // 수요일 05시 리셋 - Date 객체 기반 정확한 계산
      const reset = new Date(now)
      reset.setHours(5, 0, 0, 0)
      const dayOfWeek = reset.getDay()
      let daysUntilWed = (3 - dayOfWeek + 7) % 7

      if (daysUntilWed === 0 && now >= reset) {
        daysUntilWed = 7
      }

      reset.setDate(reset.getDate() + daysUntilWed)
      return Math.max(0, Math.floor((reset.getTime() - now.getTime()) / 1000))
    }

    case 'shugo': {
      // 슈고페스타: 이용권 충전시간마다 (8시간 기준과 동일)
      return getNextChargeSeconds('8h', lastChargeTime)
    }

    default:
      return 0
  }
}

// 캐시 타입 정의
interface DashboardCache {
  data: any
  timestamp: number
  characterIds: string
}

// 캐시 유효 시간 (5분)
const CACHE_TTL = 5 * 60 * 1000

function DashboardSummary({
  characters,
  totalTodayIncome,
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

  // 캐시 ref (리렌더링 방지)
  const cacheRef = useRef<DashboardCache | null>(null)

  const formatKina = (value: number) => {
    return value.toLocaleString('ko-KR')
  }

  // 대시보드 데이터 로드 (배치 API 사용 + 캐싱)
  const loadDashboardData = useCallback(async () => {
    if (characters.length === 0) {
      setIsLoading(false)
      return
    }

    const characterIds = characters.map(c => c.id).join(',')

    // 캐시 확인
    if (cacheRef.current) {
      const { data, timestamp, characterIds: cachedIds } = cacheRef.current
      const isValid = Date.now() - timestamp < CACHE_TTL
      const isSameChars = cachedIds === characterIds

      if (isValid && isSameChars) {
        // 캐시 데이터 사용 - 로딩 없이 바로 처리
        processData(data, characters)
        setIsLoading(false)
        return
      }
    }

    setIsLoading(true)

    try {
      const authHeaders = getAuthHeader?.() || {}

      // 배치 API로 모든 캐릭터 데이터 한 번에 조회
      const res = await fetch(`/api/ledger/dashboard?characterIds=${characterIds}`, {
        headers: authHeaders
      })

      if (!res.ok) {
        throw new Error('Failed to load dashboard data')
      }

      const data = await res.json()

      // 캐시 저장
      cacheRef.current = {
        data,
        timestamp: Date.now(),
        characterIds
      }

      processData(data, characters)

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [characters, getAuthHeader])

  // 데이터 처리 함수 분리
  const processData = (data: any, chars: LedgerCharacter[]) => {
    const charStatuses: CharacterStatus[] = []
    const allItems: any[] = []

    // 캐릭터별 데이터 처리
    for (const char of chars) {
      const charData = data.characters[char.id]
      if (!charData) continue

      const baseTickets = charData.baseTickets || {}
      const bonusTickets = charData.bonusTickets || {}
      const lastChargeTime = charData.lastChargeTime
      const contentRecordsMap = charData.contentRecords || {}
      const weeklyData = charData.weeklyData || {}
      const missionCount = charData.missionCount || 0

      // 아이템 데이터 수집
      const itemsData = charData.sellingItems || []
      allItems.push(...itemsData.map((item: any) => ({
        ...item,
        characterId: char.id,
        characterName: char.name
      })))

      // 주간 컨텐츠 진행률 계산
      const weeklyProgressForChar: ContentProgress[] = WEEKLY_CONTENT_DEFS.map(def => {
        let current = 0
        let bonus = 0
        const max = def.maxPerChar

        if (def.id === 'transcend') {
          const remaining = baseTickets.transcend ?? def.maxPerChar
          current = def.maxPerChar - remaining
          bonus = bonusTickets.transcend || 0
        } else if (def.id === 'expedition') {
          const remaining = baseTickets.expedition ?? def.maxPerChar
          current = def.maxPerChar - remaining
          bonus = bonusTickets.expedition || 0
        } else if (def.id === 'sanctuary') {
          const remaining = baseTickets.sanctuary ?? def.maxPerChar
          current = def.maxPerChar - remaining
          bonus = bonusTickets.sanctuary || 0
        } else if (def.id === 'shugo') {
          const shugoBase = weeklyData.shugoBase ?? 14
          current = 14 - shugoBase
          bonus = weeklyData.shugoBonus || 0
        } else if (def.id === 'mission') {
          current = missionCount
        } else if (def.id === 'weekly_order') {
          current = weeklyData.weeklyOrderCount || 0
        } else if (def.id === 'abyss_order') {
          current = weeklyData.abyssOrderCount || 0
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

      // 일일 컨텐츠 진행률 계산
      const dailyProgressForChar: ContentProgress[] = DAILY_CONTENT_DEFS.map(def => {
        let current = 0
        let bonus = 0
        const max = def.maxPerChar

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

      const sellingCount = itemsData.length
      const soldCount = 0 // 배치 API는 미판매 아이템만 반환

      charStatuses.push({
        character: char,
        todayIncome: charData.todayIncome ?? 0,
        sellingItemCount: sellingCount,
        soldItemCount: soldCount,
        weeklyContents: weeklyProgressForChar,
        dailyContents: dailyProgressForChar
      })
    }

    setCharacterStatuses(charStatuses)

    // 아이템 합산 처리
    const sellingItemsMap = new Map<string, AggregatedItem>()
    let soldIncomeTotal = 0

    allItems.forEach((item: any) => {
      const key = item.item_name
      const price = item.expected_price || 0

      if (sellingItemsMap.has(key)) {
        const existing = sellingItemsMap.get(key)!
        existing.totalQuantity += item.quantity || 1
        existing.totalPrice += price * (item.quantity || 1)
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
        sellingItemsMap.set(key, {
          itemName: item.item_name,
          itemGrade: item.item_grade || 'common',
          iconUrl: item.icon_url,
          totalQuantity: item.quantity || 1,
          totalPrice: price * (item.quantity || 1),
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
    setSoldItems([])
    setTotalSoldIncome(soldIncomeTotal)

    // 전체 컨텐츠 진행률 합산
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
    setMonthlyIncome(data.totals?.monthlyIncome || 0)
  }

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

        <div className={styles.kinaGrid} style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
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

// React.memo를 적용하여 props가 변경되지 않으면 리렌더링 방지
export default memo(DashboardSummary)
