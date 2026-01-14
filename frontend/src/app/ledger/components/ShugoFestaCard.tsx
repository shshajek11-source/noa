'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import styles from './ShugoFestaCard.module.css'

interface ShugoFestaCardProps {
  currentTickets: number
  maxTickets: number
  bonusTickets: number
}

export default function ShugoFestaCard({
  currentTickets,
  maxTickets,
  bonusTickets
}: ShugoFestaCardProps) {
  const [timeUntilEntry, setTimeUntilEntry] = useState('')
  const [isAlarmActive, setIsAlarmActive] = useState(false)
  const [showOpenMouth, setShowOpenMouth] = useState(false)

  // 다음 입장 시간 계산 및 알람 로직 (테스트: 30초마다 입장 시간)
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date()
      const seconds = now.getSeconds()

      // 테스트: 30초 주기로 입장 시간 설정 (15초, 45초가 입장 시간)
      const currentCycle = Math.floor(seconds / 30)
      const secondsInCycle = seconds % 30

      let secondsUntilEntry: number
      if (secondsInCycle < 15) {
        // 다음 입장 시간: 15초
        secondsUntilEntry = 15 - secondsInCycle
      } else {
        // 다음 입장 시간: 45초 (다음 사이클의 15초)
        secondsUntilEntry = 45 - secondsInCycle
      }

      // 알람 체크: 3초 전부터 4초간 (테스트용 조정)
      const isInAlarmWindow = secondsUntilEntry <= 3 && secondsUntilEntry > 0

      if (isInAlarmWindow && !isAlarmActive) {
        setIsAlarmActive(true)
      } else if (!isInAlarmWindow && isAlarmActive) {
        setIsAlarmActive(false)
      }

      setTimeUntilEntry(`00:00:${secondsUntilEntry.toString().padStart(2, '0')}`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [isAlarmActive])

  // 알람 활성화 시 이미지 깜빡임 (0.5초마다 전환)
  useEffect(() => {
    if (!isAlarmActive) {
      setShowOpenMouth(false)
      return
    }

    const imageInterval = setInterval(() => {
      setShowOpenMouth(prev => !prev)
    }, 500)

    return () => clearInterval(imageInterval)
  }, [isAlarmActive])

  return (
    <div className={styles.card}>
      {/* 제목 & 티켓 정보 */}
      <div className={styles.header}>
        <h3 className={styles.title}>슈고 페스타</h3>
        <div className={styles.ticketInfo}>
          <span className={styles.ticketCount}>
            {currentTickets}/{maxTickets}
          </span>
          {bonusTickets > 0 && (
            <span className={styles.bonusTicket}>
              +{bonusTickets}
            </span>
          )}
        </div>
      </div>

      {/* 이미지 */}
      <div className={styles.imageContainer}>
        <Image
          src={showOpenMouth
            ? '/메달/슈고어비스/입열린-Photoroom.png'
            : '/메달/슈고어비스/입닫힌-Photoroom.png'
          }
          alt="슈고 페스타"
          width={100}
          height={100}
          className={styles.image}
        />
      </div>

      {/* 노란 네온 타이머 */}
      <div className={styles.timer}>
        {timeUntilEntry}
      </div>
    </div>
  )
}
