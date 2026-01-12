'use client'

import { useRef } from 'react'
import styles from './PremiumContentCard.module.css'

export interface PremiumContent {
  id: string
  name: string
  subtitle: string
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

interface PremiumContentCardProps {
  content: PremiumContent
  onIncrement: (id: string) => void
  onDecrement: (id: string) => void
}

export default function PremiumContentCard({ content, onIncrement, onDecrement }: PremiumContentCardProps) {
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
      const distance = 40 + Math.random() * 30
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
  const progressPercentage = Math.round((content.completionCount / content.maxCount) * 100)

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

      {/* Image Section */}
      <div className={styles.imageContainer}>
        {content.imageUrl ? (
          <img src={content.imageUrl} alt={content.name} className={styles.image} />
        ) : (
          <div className={styles.imagePlaceholder}>
            {content.icon}
          </div>
        )}
        <div className={styles.overlay} />

        {isComplete && (
          <div className={styles.completeBadge}>✓</div>
        )}

        <div className={styles.badge}>
          {progressPercentage}% 완료
        </div>
      </div>

      {/* Content Section */}
      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <div className={styles.title}>{content.name}</div>
            <div className={styles.subtitle}>{content.subtitle}</div>
          </div>
          <div className={styles.progressArea}>
            <div className={styles.progressText}>
              {content.completionCount}/{content.maxCount}
            </div>
            <div className={styles.progressLabel}>진행 횟수</div>
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.controls}>
          <div className={styles.buttonGroup}>
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

          <div className={styles.rewardInfo}>
            <div className={styles.rewardLabel}>일일 보상</div>
            <div className={`${styles.rewardValue} ${content.baseReward === 0 ? styles.rewardValueZero : ''}`}>
              {content.baseReward === 0 ? '보상 없음' : `${content.baseReward.toLocaleString()} 키나`}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
