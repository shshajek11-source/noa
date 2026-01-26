'use client'

import { useState, useEffect } from 'react'
import styles from './ProgressBar.module.css'

interface ProgressBarProps {
  id: string
  name: string
  icon: string
  currentCount: number
  maxCount: number
  resetType: 'daily' | 'weekly'  // daily: 매일 5시, weekly: 수요일 5시
  onIncrement: () => void
  onDecrement: () => void
  onComplete: () => void
  readOnly?: boolean
}

// 다음 리셋 시간 계산
function getNextResetTime(resetType: 'daily' | 'weekly'): Date {
  const now = new Date()
  const reset = new Date(now)

  if (resetType === 'daily') {
    // 매일 새벽 5시
    reset.setHours(5, 0, 0, 0)
    if (now >= reset) {
      // 이미 5시가 지났으면 내일 5시
      reset.setDate(reset.getDate() + 1)
    }
  } else {
    // 수요일 새벽 5시
    reset.setHours(5, 0, 0, 0)
    const dayOfWeek = reset.getDay()  // 0=일, 3=수
    let daysUntilWed = (3 - dayOfWeek + 7) % 7

    // 오늘이 수요일이고 5시 이전이면 오늘
    // 오늘이 수요일이고 5시 이후면 다음주 수요일
    if (daysUntilWed === 0 && now >= reset) {
      daysUntilWed = 7
    }

    reset.setDate(reset.getDate() + daysUntilWed)
  }

  return reset
}

// 남은 시간 포맷팅
function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '00:00:00'

  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    return `${days}일 ${remainingHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export default function ProgressBar({
  id,
  name,
  icon,
  currentCount,
  maxCount,
  resetType,
  onIncrement,
  onDecrement,
  onComplete,
  readOnly = false
}: ProgressBarProps) {
  const [timeUntilReset, setTimeUntilReset] = useState('')

  // 진행률 계산 (남은 횟수 방식)
  const remainingCount = maxCount - currentCount
  const percentage = (currentCount / maxCount) * 100
  const isCompleted = currentCount >= maxCount

  // 리셋까지 남은 시간 타이머
  useEffect(() => {
    const updateTimer = () => {
      const nextReset = getNextResetTime(resetType)
      const remaining = nextReset.getTime() - Date.now()
      setTimeUntilReset(formatTimeRemaining(remaining))
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [resetType])

  return (
    <div className={`${styles.progressBar} ${isCompleted ? styles.completed : ''}`}>
      {/* 상단: 제목 + 타이머 + 진행 횟수 + 버튼 */}
      <div className={styles.header}>
        <div className={styles.leftGroup}>
          <span className={styles.name}>
            {icon} {name}
          </span>
          <span className={styles.timer}>
            ⏰ {timeUntilReset}
          </span>
        </div>
        <div className={styles.rightGroup}>
          <button
            className={styles.completeBtn}
            onClick={onComplete}
            disabled={readOnly || currentCount >= maxCount}
            title={readOnly ? '과거 기록은 수정할 수 없습니다' : undefined}
          >
            전체 완료 하기
          </button>
          <span className={styles.count}>
            {remainingCount}/{maxCount}
          </span>
          <div className={styles.buttons}>
            <button
              className={styles.btn}
              onClick={onIncrement}
              disabled={readOnly || currentCount >= maxCount}
              title={readOnly ? '과거 기록은 수정할 수 없습니다' : undefined}
            >
              +
            </button>
            <button
              className={styles.btn}
              onClick={onDecrement}
              disabled={readOnly || currentCount <= 0}
              title={readOnly ? '과거 기록은 수정할 수 없습니다' : undefined}
            >
              −
            </button>
          </div>
        </div>
      </div>

      {/* 하단: 세그먼트 바 */}
      <div className={styles.barRow}>
        <div className={styles.segmentsContainer}>
          {Array.from({ length: maxCount }).map((_, index) => (
            <div
              key={index}
              className={`${styles.segment} ${
                index < currentCount ? styles.filled : styles.empty
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
