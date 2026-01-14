'use client'

import { useState } from 'react'
import AnimatedIncome from './AnimatedIncome'
import styles from './BottomNavBar.module.css'

interface BottomNavBarProps {
  todayIncome: number
  weeklyIncome: number
  selectedDate: string
  onDateClick: () => void
  onChargeClick: () => void
}

export default function BottomNavBar({
  todayIncome,
  weeklyIncome,
  selectedDate,
  onDateClick,
  onChargeClick
}: BottomNavBarProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  // 날짜 포맷팅 (예: 1/14 (화))
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekdays = ['일', '월', '화', '수', '목', '금', '토']
    const weekday = weekdays[date.getDay()]
    return { month, day, weekday }
  }

  const { month, day, weekday } = formatDate(selectedDate)

  return (
    <div className={styles.container}>
      {/* 상단 토글 탭 */}
      <button
        className={styles.toggleTab}
        onClick={() => setIsExpanded(!isExpanded)}
        title={isExpanded ? '접기' : '펼치기'}
      >
        <span className={styles.toggleTabArrow}>
          {isExpanded ? '▼' : '▲'}
        </span>
      </button>

      {isExpanded && (
        // 펼친 상태
        <div className={styles.navBar}>
          {/* 캘린더 버튼 */}
          <button className={styles.calendarBtn} onClick={onDateClick}>
            <span className={styles.icon}>📅</span>
            <span className={styles.dateText}>
              {month}/{day}
            </span>
            <span className={styles.weekdayText}>({weekday})</span>
          </button>

          {/* 일일 수입 */}
          <AnimatedIncome icon="💰" label="일일수입" amount={todayIncome} />

          {/* 주간 수입 */}
          <AnimatedIncome icon="📈" label="주간수입" amount={weeklyIncome} />

          {/* 충전 버튼 */}
          <button className={styles.chargeBtn} onClick={onChargeClick}>
            <span className={styles.icon}>⚡</span>
            <span>충전</span>
          </button>
        </div>
      )}
    </div>
  )
}
