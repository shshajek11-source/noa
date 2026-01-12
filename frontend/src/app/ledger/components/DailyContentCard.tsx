'use client'

import { useRef } from 'react'
import CircularProgress from './CircularProgress'
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

    // Create 8 particles
    for (let i = 0; i < 8; i++) {
      const particle = document.createElement('div')
      particle.className = styles.particle

      // Random position around center
      const angle = (Math.PI * 2 * i) / 8
      const distance = 30 + Math.random() * 20
      const x = 50 + Math.cos(angle) * distance
      const y = 50 + Math.sin(angle) * distance

      particle.style.left = `${x}%`
      particle.style.top = `${y}%`
      particle.style.animationDelay = `${i * 0.05}s`

      particleContainer.appendChild(particle)

      // Remove after animation
      setTimeout(() => {
        particle.remove()
      }, 1000)
    }
  }

  const isComplete = content.completionCount >= content.maxCount

  return (
    <div
      ref={cardRef}
      className={`${styles.card} ${isComplete ? styles.complete : ''}`}
      style={{
        '--card-color': content.color,
        '--card-color-light': content.colorLight,
        '--card-color-dark': content.colorDark,
        '--card-color-glow': content.colorGlow,
      } as React.CSSProperties}
    >
      <div className={styles.particles} />

      <div className={styles.contentName}>{content.name}</div>

      <div className={styles.progressWrapper}>
        <CircularProgress
          current={content.completionCount}
          max={content.maxCount}
          color={content.color}
          size={80}
          strokeWidth={5}
        />
      </div>

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

      <div className={styles.reward}>
        보상: <span className={styles.rewardValue}>{content.baseReward.toLocaleString()} 키나</span>
      </div>

      {isComplete && (
        <div className={styles.completeBadge}>✓</div>
      )}
    </div>
  )
}
