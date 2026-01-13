'use client'

import { useRef } from 'react'
import styles from './DailyContentCard.module.css'

export interface DailyContent {
  id: string
  name: string
  icon: string
  maxCount: number
  completionCount: number
  baseReward: number
  color: string
  colorLight: string
  colorDark: string
  colorGlow: string
  imageUrl?: string
}

interface DailyContentCardProps {
  content: DailyContent
  onIncrement: (id: string) => void
  onDecrement: (id: string) => void
}

export default function DailyContentCard({ content, onIncrement, onDecrement }: DailyContentCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  const handleIncrement = () => {
    if (content.completionCount < content.maxCount) {
      onIncrement(content.id)
      createParticles()
    }
  }

  const handleDecrement = () => {
    if (content.completionCount > 0) {
      onDecrement(content.id)
    }
  }

  const createParticles = () => {
    if (!cardRef.current) return

    const particleContainer = cardRef.current.querySelector(`.${styles.particles}`)
    if (!particleContainer) return

    // Create 12 particles
    for (let i = 0; i < 12; i++) {
      const particle = document.createElement('div')
      particle.className = styles.particle

      // Random position around center
      const angle = (Math.PI * 2 * i) / 12
      const distance = 28 + Math.random() * 21
      const x = 50 + Math.cos(angle) * distance
      const y = 50 + Math.sin(angle) * distance

      particle.style.left = `${x}%`
      particle.style.top = `${y}%`
      particle.style.animationDelay = `${i * 0.05}s`

      particleContainer.appendChild(particle)

      // Remove after animation
      setTimeout(() => {
        particle.remove()
      }, 1200)
    }
  }

  const isComplete = content.completionCount >= content.maxCount

  return (
    <div
      ref={cardRef}
      className={styles.card}
      style={{
        '--card-color': content.color,
        '--card-color-light': content.colorLight,
        '--card-color-dark': content.colorDark,
        '--card-color-glow': content.colorGlow,
      } as React.CSSProperties}
    >
      <div className={styles.particles} />

      {/* Image Container with All Content Overlayed */}
      <div className={styles.imageContainer}>
        {content.imageUrl ? (
          <img src={content.imageUrl} alt={content.name} className={styles.image} />
        ) : (
          <div className={styles.imagePlaceholder}>
            {content.icon}
          </div>
        )}
        <div className={styles.overlay} />

        {/* Complete Badge (Top Left) */}
        {isComplete && (
          <div className={styles.completeBadge}>✓</div>
        )}

        {/* Button Group (Top Right) */}
        <div className={styles.buttonGroupTop}>
          <button
            className={styles.btn}
            onClick={handleDecrement}
            disabled={content.completionCount === 0}
            aria-label={`${content.name} 횟수 감소`}
          >
            −
          </button>
          <button
            className={`${styles.btn} ${styles.btnIncrement}`}
            onClick={handleIncrement}
            disabled={content.completionCount >= content.maxCount}
            aria-label={`${content.name} 횟수 증가`}
          >
            +
          </button>
        </div>

        {/* Title Area (Center) */}
        <div className={styles.titleArea}>
          <div className={styles.title}>{content.name}</div>
        </div>

        {/* Timer (Bottom Left) - Fixed for daily content */}
        <div className={styles.timerInfo}>
          <div className={styles.timerLabel}>이용권 충전</div>
          <div className={styles.timerLabel}>남은시간</div>
          <div className={styles.timerText}>-:--:--</div>
        </div>

        {/* Progress Info (Bottom Right) */}
        <div className={styles.progressInfo}>
          <div className={styles.progressLabel}>잔여 횟수</div>
          <div className={styles.progressText}>
            {content.completionCount}/{content.maxCount}
          </div>
        </div>
      </div>
    </div>
  )
}
