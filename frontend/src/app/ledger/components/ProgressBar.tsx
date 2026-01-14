'use client'

import { useState, useEffect } from 'react'
import styles from './ProgressBar.module.css'

interface ProgressBarProps {
  id: string
  name: string
  icon: string
  currentCount: number
  maxCount: number
  onIncrement: () => void
  onDecrement: () => void
  onComplete: () => void
}

export default function ProgressBar({
  id,
  name,
  icon,
  currentCount,
  maxCount,
  onIncrement,
  onDecrement,
  onComplete
}: ProgressBarProps) {
  const [timeUntilReset, setTimeUntilReset] = useState('')

  // 진행률 계산
  const percentage = (currentCount / maxCount) * 100
  const isCompleted = currentCount >= maxCount

  // 타이머 (30초마다 리셋 - 테스트용)
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date()
      const seconds = now.getSeconds()

      // 30초 주기로 계산
      const secondsUntilReset = 30 - (seconds % 30)

      setTimeUntilReset(`00:00:${secondsUntilReset.toString().padStart(2, '0')}`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [])

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
            disabled={currentCount >= maxCount}
          >
            전체 완료 하기
          </button>
          <span className={styles.count}>
            {currentCount}/{maxCount}
          </span>
          <div className={styles.buttons}>
            <button
              className={styles.btn}
              onClick={onIncrement}
              disabled={currentCount >= maxCount}
            >
              +
            </button>
            <button
              className={styles.btn}
              onClick={onDecrement}
              disabled={currentCount <= 0}
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
