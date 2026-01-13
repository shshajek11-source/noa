'use client'

import DailyContentCard from './DailyContentCard'
import { useDailyContent } from '../hooks/useDailyContent'
import styles from './DailyContentSection.module.css'

interface DailyContentSectionProps {
  characterId: string | null
  selectedDate: string
}

export default function DailyContentSection({ characterId, selectedDate }: DailyContentSectionProps) {
  const { contents, loading, error, handleIncrement, handleDecrement } = useDailyContent(characterId, selectedDate)

  if (loading) {
    return (
      <section className={styles.section}>
        <div className={styles.loading}>주간 컨텐츠 정보를 불러오는 중...</div>
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
          <DailyContentCard
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
