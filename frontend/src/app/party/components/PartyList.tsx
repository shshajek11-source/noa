'use client'

import type { PartyPost, PartySlot, PartyMember } from '@/types/party'
import PartyCard from './PartyCard'
import styles from './PartyList.module.css'

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
  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span>파티 목록을 불러오는 중...</span>
      </div>
    )
  }

  // 즉시 진행 / 예약 진행 분리
  const immediateParties = parties.filter(p => p.is_immediate)
  const scheduledParties = parties.filter(p => !p.is_immediate)

  if (parties.length === 0) {
    return (
      <div className={styles.empty}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {immediateParties.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            🔥 즉시 진행 (지금 바로 시작)
          </h3>
          <div className={styles.grid}>
            {immediateParties.map(party => (
              <PartyCard key={party.id} party={party} onSelect={onSelect} />
            ))}
          </div>
        </div>
      )}

      {scheduledParties.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            📅 예약 진행 (약속 시간에 시작)
          </h3>
          <div className={styles.grid}>
            {scheduledParties.map(party => (
              <PartyCard key={party.id} party={party} onSelect={onSelect} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
