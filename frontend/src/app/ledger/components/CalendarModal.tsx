'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { getWeekKey, getGameDate } from '../utils/dateUtils'
import styles from './CalendarModal.module.css'

// 아이템 타입 (판매 정보 포함)
interface LedgerItem {
  id: string
  sold_date?: string
  sold_price?: number | null
  total_price: number
  is_sold: boolean
}

// 일별 수입 데이터 (API 응답)
interface DailyIncomeData {
  date: string
  contentIncome: number
  dungeonIncome: number
  itemIncome: number
  totalIncome: number
}

interface CalendarModalProps {
  isOpen: boolean
  currentDate: string
  characterId: string | null
  items?: LedgerItem[]
  onClose: () => void
  onSelectDate: (date: string) => void
  getAuthHeader?: () => Record<string, string>
}

export default function CalendarModal({
  isOpen,
  currentDate,
  characterId,
  items = [],
  onClose,
  onSelectDate,
  getAuthHeader
}: CalendarModalProps) {
  // 게임 날짜 기준 (새벽 5시 기준으로 날짜 변경) - 오늘 하이라이트용
  const todayStr = getGameDate(new Date())
  const gameToday = new Date(todayStr)

  // 실제 오늘 날짜 (미래 날짜 차단용)
  const realToday = new Date()
  const realTodayStr = realToday.toISOString().split('T')[0]

  // 현재 보고 있는 월 (year, month)
  const [viewYear, setViewYear] = useState(gameToday.getFullYear())
  const [viewMonth, setViewMonth] = useState(gameToday.getMonth())

  // 선택된 날짜
  const [selectedDate, setSelectedDate] = useState(currentDate)

  // 월별 수입 데이터 (API에서 가져옴)
  const [monthlyData, setMonthlyData] = useState<DailyIncomeData[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // 모달이 열릴 때 현재 날짜 기준으로 초기화
  useEffect(() => {
    if (isOpen) {
      const date = new Date(currentDate)
      setViewYear(date.getFullYear())
      setViewMonth(date.getMonth())
      setSelectedDate(currentDate)
    }
  }, [isOpen, currentDate])

  // 월별 데이터 로드 (Supabase API 사용)
  const loadMonthlyData = useCallback(async () => {
    if (!characterId || !getAuthHeader) {
      setMonthlyData([])
      return
    }

    setIsLoading(true)
    try {
      // 해당 월의 첫 날을 기준으로 API 호출
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`
      const res = await fetch(
        `/api/ledger/stats?type=monthly&characterId=${characterId}&date=${dateStr}`,
        { headers: getAuthHeader() }
      )

      if (res.ok) {
        const data = await res.json()
        setMonthlyData(data.dailyData || [])
      } else {
        setMonthlyData([])
      }
    } catch (e) {
      console.error('[CalendarModal] Failed to load monthly data:', e)
      setMonthlyData([])
    } finally {
      setIsLoading(false)
    }
  }, [characterId, viewYear, viewMonth, getAuthHeader])

  // 모달이 열리거나 월이 변경될 때 데이터 로드
  useEffect(() => {
    if (isOpen && characterId) {
      loadMonthlyData()
    }
  }, [isOpen, characterId, viewYear, viewMonth, loadMonthlyData])

  // 월별 데이터를 Map으로 변환 (빠른 조회용)
  const monthlyDataMap = useMemo(() => {
    const map = new Map<string, DailyIncomeData>()
    monthlyData.forEach(d => map.set(d.date, d))
    return map
  }, [monthlyData])

  // 특정 날짜에 기록이 있는지 확인 (Supabase 데이터 기반)
  const hasRecordForDate = useCallback((dateStr: string): boolean => {
    const data = monthlyDataMap.get(dateStr)
    if (!data) return false
    // 컨텐츠 또는 던전 수입이 있으면 기록 있음
    return (data.contentIncome + data.dungeonIncome) > 0
  }, [monthlyDataMap])

  // 날짜에 아이템 판매가 있는지 확인 (Supabase 데이터 기반)
  const hasItemSalesForDate = useCallback((dateStr: string): boolean => {
    const data = monthlyDataMap.get(dateStr)
    if (!data) return false
    return data.itemIncome > 0
  }, [monthlyDataMap])

  // 날짜별 총 수입 계산 (Supabase 데이터 기반)
  const getTotalIncomeForDate = useCallback((dateStr: string): { contentIncome: number; itemIncome: number; total: number } => {
    const data = monthlyDataMap.get(dateStr)
    if (!data) {
      return { contentIncome: 0, itemIncome: 0, total: 0 }
    }
    return {
      contentIncome: data.contentIncome + data.dungeonIncome,
      itemIncome: data.itemIncome,
      total: data.totalIncome
    }
  }, [monthlyDataMap])

  // 선택된 날짜의 수입 정보
  const selectedDateIncome = useMemo(() => {
    return getTotalIncomeForDate(selectedDate)
  }, [selectedDate, getTotalIncomeForDate])

  // 달력 데이터 생성
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1)
    const lastDay = new Date(viewYear, viewMonth + 1, 0)
    const startDayOfWeek = firstDay.getDay()
    const daysInMonth = lastDay.getDate()

    const days: (number | null)[] = []

    // 이전 달 빈 칸
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null)
    }

    // 현재 달 날짜
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }

    return days
  }, [viewYear, viewMonth])

  // 날짜 문자열 생성 (YYYY-MM-DD)
  const formatDateStr = (day: number): string => {
    const month = String(viewMonth + 1).padStart(2, '0')
    const dayStr = String(day).padStart(2, '0')
    return `${viewYear}-${month}-${dayStr}`
  }

  // 이전 월로 이동
  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1)
      setViewMonth(11)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  // 다음 월로 이동
  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1)
      setViewMonth(0)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  // 오늘로 이동 (바로 적용하고 모달 닫기)
  const goToToday = () => {
    onSelectDate(todayStr)
    onClose()
  }

  // 날짜 선택 (바로 적용하고 모달 닫기)
  const handleDateClick = (day: number) => {
    const dateStr = formatDateStr(day)
    onSelectDate(dateStr)
    onClose()
  }

  // 확인 버튼
  const handleConfirm = () => {
    onSelectDate(selectedDate)
    onClose()
  }

  // 오버레이 클릭
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  const weekdays = ['일', '월', '화', '수', '목', '금', '토']

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        {/* 헤더 */}
        <div className={styles.header}>
          <button className={styles.navButton} onClick={goToPrevMonth}>
            ◀
          </button>
          <h2 className={styles.title}>
            {viewYear}년 {viewMonth + 1}월
          </h2>
          <button className={styles.navButton} onClick={goToNextMonth}>
            ▶
          </button>
        </div>

        {/* 요일 헤더 */}
        <div className={styles.weekdayHeader}>
          {weekdays.map((day, index) => (
            <div
              key={day}
              className={`${styles.weekday} ${
                index === 0 ? styles.sunday : index === 6 ? styles.saturday : ''
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 달력 그리드 */}
        <div className={styles.calendarGrid}>
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className={styles.emptyCell} />
            }

            const dateStr = formatDateStr(day)
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDate
            const hasRecord = hasRecordForDate(dateStr)
            const hasItemSales = hasItemSalesForDate(dateStr)
            const dayOfWeek = (index) % 7
            // 미래 날짜 체크 (실제 오늘 날짜 기준)
            const isFuture = dateStr > realTodayStr

            return (
              <button
                key={day}
                className={`${styles.dayCell} ${isToday ? styles.today : ''} ${
                  isSelected ? styles.selected : ''
                } ${dayOfWeek === 0 ? styles.sunday : dayOfWeek === 6 ? styles.saturday : ''} ${isFuture ? styles.disabled : ''}`}
                onClick={() => !isFuture && handleDateClick(day)}
                disabled={isFuture}
              >
                <span className={styles.dayNumber}>{day}</span>
                <div className={styles.dotContainer}>
                  {hasRecord && <span className={styles.recordDot} />}
                  {hasItemSales && <span className={styles.itemDot} />}
                </div>
              </button>
            )
          })}
        </div>

        {/* 선택된 날짜 수입 정보 */}
        <div className={styles.incomeInfo}>
          <div className={styles.incomeHeader}>
            <span className={styles.incomeDate}>{selectedDate}</span>
            {(hasRecordForDate(selectedDate) || hasItemSalesForDate(selectedDate)) && (
              <span className={styles.hasRecordBadge}>기록 있음</span>
            )}
          </div>
          {selectedDateIncome.total > 0 ? (
            <div className={styles.incomeDetails}>
              <div className={styles.incomeRow}>
                <span className={styles.incomeLabel}>컨텐츠 수입</span>
                <span className={styles.incomeValue}>
                  {selectedDateIncome.contentIncome.toLocaleString()} 키나
                </span>
              </div>
              <div className={styles.incomeRow}>
                <span className={styles.incomeLabel}>아이템 판매</span>
                <span className={styles.incomeValueItem}>
                  {selectedDateIncome.itemIncome.toLocaleString()} 키나
                </span>
              </div>
              <div className={styles.incomeTotal}>
                <span className={styles.incomeTotalLabel}>총 수입</span>
                <span className={styles.incomeTotalValue}>
                  {selectedDateIncome.total.toLocaleString()} 키나
                </span>
              </div>
            </div>
          ) : (
            <div className={styles.noIncome}>수입 기록이 없습니다</div>
          )}
        </div>

        {/* 버튼 영역 */}
        <div className={styles.actions}>
          <button className={styles.todayButton} onClick={goToToday}>
            오늘
          </button>
          <div className={styles.actionRight}>
            <button className={styles.cancelButton} onClick={onClose}>
              취소
            </button>
            <button className={styles.confirmButton} onClick={handleConfirm}>
              확인
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
