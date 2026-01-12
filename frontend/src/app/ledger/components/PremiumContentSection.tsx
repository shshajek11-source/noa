'use client'

import PremiumContentCard from './PremiumContentCard'
import { usePremiumContent } from '../hooks/usePremiumContent'
import styles from './PremiumContentSection.module.css'

interface PremiumContentSectionProps {
  characterId: string | null
  selectedDate: string
}

export default function PremiumContentSection({ characterId, selectedDate }: PremiumContentSectionProps) {
  const { contents, loading, error, handleIncrement, handleDecrement } = usePremiumContent(characterId, selectedDate)

  if (loading) {
    return (
      <section className={styles.section}>
        <div className={styles.loading}>프리미엄 컨텐츠 정보를 불러오는 중...</div>
      </section>
    )
  }

  if (error) {
    return (
      <section className={styles.section}>
        <div className={styles.error}>{error}</div>
      </section>
    )
  }

  return (
    <section className={styles.section}>
      <div className={styles.grid}>
        {contents.map((content) => (
          <PremiumContentCard
            key={content.id}
            content={content}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
          />
        ))}
      </div>
    </section>
  )
}
