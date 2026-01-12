'use client'

import { Gamepad2, Sword, Compass, Shield } from 'lucide-react'
import { ContentType, DungeonTier, ContentRecord } from '@/types/ledger'
import ContentIncomeRow from './ContentIncomeRow'
import styles from '../ledger.module.css'

interface ContentIncomeSectionProps {
  contentTypes: ContentType[]
  dungeonTiers: DungeonTier[]
  records: ContentRecord[]
  onIncrementCompletion: (contentType: string) => void
  onDecrementCompletion: (contentType: string) => void
  onToggleDouble: (contentType: string) => void
  onChangeTier: (contentType: string, tierId: string) => void
  onChangeMaxCount: (contentType: string, count: number) => void
}

const CONTENT_ICONS: Record<string, React.ReactNode> = {
  transcend: <Sword size={18} />,
  expedition: <Compass size={18} />,
  sanctuary: <Shield size={18} />
}

export default function ContentIncomeSection({
  contentTypes,
  dungeonTiers,
  records,
  onIncrementCompletion,
  onDecrementCompletion,
  onToggleDouble,
  onChangeTier,
  onChangeMaxCount
}: ContentIncomeSectionProps) {
  const today = new Date()
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']
  const dayStr = dayNames[today.getDay()]

  // 총 수입 계산
  const totalIncome = records.reduce((sum, r) => sum + (r.total_kina || 0), 0)

  const getTiersForContent = (contentType: string) => {
    return dungeonTiers.filter(t => t.content_type === contentType)
  }

  const getRecordForContent = (contentType: string) => {
    return records.find(r => r.content_type === contentType)
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          <Gamepad2 size={18} />
          컨텐츠별 수입
        </h2>
        <span className={styles.sectionDate}>{dateStr}({dayStr})</span>
      </div>

      <div className={styles.contentList}>
        {contentTypes.map((content) => {
          const tiers = getTiersForContent(content.id)
          const record = getRecordForContent(content.id)
          const defaultTier = tiers[0]

          return (
            <ContentIncomeRow
              key={content.id}
              contentId={content.id}
              contentName={content.name}
              icon={CONTENT_ICONS[content.id] || <Gamepad2 size={18} />}
              tiers={tiers}
              selectedTierId={record?.dungeon_tier || defaultTier?.id || ''}
              maxCount={record?.max_count ?? 3}
              completionCount={record?.completion_count ?? 0}
              isDouble={record?.is_double ?? false}
              baseKina={record?.base_kina ?? defaultTier?.default_kina ?? 50000}
              totalKina={record?.total_kina ?? 0}
              onIncrement={() => onIncrementCompletion(content.id)}
              onDecrement={() => onDecrementCompletion(content.id)}
              onToggleDouble={() => onToggleDouble(content.id)}
              onChangeTier={(tierId) => onChangeTier(content.id, tierId)}
              onChangeMaxCount={(count) => onChangeMaxCount(content.id, count)}
            />
          )
        })}
      </div>

      <div className={styles.contentTotal}>
        <span className={styles.contentTotalLabel}>오늘 컨텐츠 총합</span>
        <span className={styles.contentTotalValue}>
          {totalIncome.toLocaleString('ko-KR')} 키나
        </span>
      </div>
    </section>
  )
}
