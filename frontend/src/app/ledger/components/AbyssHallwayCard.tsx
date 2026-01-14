'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import styles from './AbyssHallwayCard.module.css'

interface Region {
  id: string
  name: string
  enabled: boolean
}

interface AbyssHallwayCardProps {
  regions: Region[]
  onToggleRegion: (regionId: string) => void
}

export default function AbyssHallwayCard({
  regions,
  onToggleRegion
}: AbyssHallwayCardProps) {
  const [timeUntilReset, setTimeUntilReset] = useState('')
  const [showModal, setShowModal] = useState(false)

  // 리셋 타이머 (테스트: 30초마다 리셋)
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

  const enabledCount = regions.filter(r => r.enabled).length
  const totalCount = regions.length

  return (
    <div className={styles.cardWrapper}>
      <div className={styles.card} onClick={() => setShowModal(!showModal)}>
        {/* 제목 & 완료 횟수 */}
        <div className={styles.header}>
          <h3 className={styles.title}>어비스 회랑</h3>
          <div className={styles.progressInfo}>
            <span className={styles.progressText}>
              {enabledCount}/{totalCount} 완료
            </span>
          </div>
        </div>

        {/* 이미지 */}
        <div className={styles.imageContainer}>
          <Image
            src="/메달/슈고어비스/어비스회랑.png"
            alt="어비스 회랑"
            width={100}
            height={100}
            className={styles.image}
          />
        </div>

        {/* 보라 네온 타이머 */}
        <div className={styles.timer}>
          {timeUntilReset}
        </div>

        {/* 드롭다운 화살표 */}
        <div className={styles.arrow}>
          {showModal ? '▲' : '▼'}
        </div>
      </div>

      {/* 지역 선택 드롭다운 */}
      {showModal && (
        <div className={styles.dropdown}>
          <h3 className={styles.dropdownTitle}>어비스 회랑 지역 선택</h3>
          <div className={styles.regionList}>
            {regions.map(region => (
              <label
                key={region.id}
                className={styles.regionItem}
              >
                <input
                  type="checkbox"
                  checked={region.enabled}
                  onChange={() => onToggleRegion(region.id)}
                  className={styles.checkbox}
                />
                <span className={styles.regionName}>{region.name}</span>
              </label>
            ))}
          </div>
          <button className={styles.closeBtn} onClick={(e) => {
            e.stopPropagation()
            setShowModal(false)
          }}>
            확인
          </button>
        </div>
      )}
    </div>
  )
}
