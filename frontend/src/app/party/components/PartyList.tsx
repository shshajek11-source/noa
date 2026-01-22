'use client'

import { useState } from 'react'
import type { PartyPost, PartySlot, PartyMember } from '@/types/party'
import PartyCard from './PartyCard'
import styles from './PartyList.module.css'

type TimeFilter = 'all' | 'immediate' | 'scheduled'

interface PartyListProps {
  parties: (PartyPost & {
    slots?: PartySlot[]
    members?: PartyMember[]
    current_members?: number
    pending_count?: number
  })[]
  loading?: boolean
  emptyMessage?: string
  onSelect?: (partyId: string) => void
}

export default function PartyList({
  parties,
  loading = false,
  emptyMessage = '등록된 파티가 없습니다.',
  onSelect
}: PartyListProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span>파티 목록을 불러오는 중...</span>
      </div>
    )
  }

  // 필터링된 파티
  const filteredParties = parties.filter(p => {
    if (timeFilter === 'all') return true
    if (timeFilter === 'immediate') return p.is_immediate
    if (timeFilter === 'scheduled') return !p.is_immediate
    return true
  })

  // 카운트
  const immediateCount = parties.filter(p => p.is_immediate).length
  const scheduledCount = parties.filter(p => !p.is_immediate).length

  if (parties.length === 0) {
    return (
      <div className={styles.empty}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* 즉시/예약 필터 탭 */}
      <div className={styles.timeFilterTabs}>
        <button
          className={`${styles.timeFilterTab} ${timeFilter === 'all' ? styles.activeTimeFilter : ''}`}
          onClick={() => setTimeFilter('all')}
        >
          전체 <span className={styles.filterCount}>{parties.length}</span>
        </button>
        <button
          className={`${styles.timeFilterTab} ${timeFilter === 'immediate' ? styles.activeTimeFilter : ''}`}
          onClick={() => setTimeFilter('immediate')}
        >
          🔥 즉시 <span className={styles.filterCount}>{immediateCount}</span>
        </button>
        <button
          className={`${styles.timeFilterTab} ${timeFilter === 'scheduled' ? styles.activeTimeFilter : ''}`}
          onClick={() => setTimeFilter('scheduled')}
        >
          📅 예약 <span className={styles.filterCount}>{scheduledCount}</span>
        </button>
      </div>

      {/* 파티 목록 */}
      {filteredParties.length === 0 ? (
        <div className={styles.empty}>
          {timeFilter === 'immediate' ? '즉시 진행 파티가 없습니다.' :
           timeFilter === 'scheduled' ? '예약 진행 파티가 없습니다.' :
           emptyMessage}
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredParties.map(party => (
            <PartyCard key={party.id} party={party} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  )
}
