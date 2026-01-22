'use client'

import styles from './BreakthroughBadge.module.css'

interface BreakthroughBadgeProps {
  value: number
  size?: 'small' | 'medium' | 'large'
  showLabel?: boolean  // "돌파" 라벨 표시 여부
}

/**
 * 돌파 횟수를 파란 마름모 안에 숫자로 표시하는 공통 컴포넌트
 * 캐릭터 상세 페이지의 장비 아이템 돌파 스타일과 동일
 */
export default function BreakthroughBadge({
  value,
  size = 'medium',
  showLabel = false
}: BreakthroughBadgeProps) {
  if (!value || value <= 0) return null

  return (
    <span className={`${styles.badge} ${styles[size]}`}>
      <span className={styles.diamond}>
        <span className={styles.value}>{value}</span>
      </span>
      {showLabel && <span className={styles.label}>돌파</span>}
    </span>
  )
}
