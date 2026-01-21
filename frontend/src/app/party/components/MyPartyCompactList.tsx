'use client'

import { useMemo } from 'react'
import type { PartyPost, PartyMember } from '@/types/party'
import { getRelativeTime, getRemainingTime } from '@/types/party'
import styles from './MyPartyCompactList.module.css'

interface MyPartyCompactListProps {
  title: string
  icon: string
  parties: (PartyPost & {
    members?: PartyMember[]
    current_members?: number
    pending_count?: number
    my_member?: { character_name: string; character_class: string; role: string }
    my_application?: { character_name: string; applied_at: string }
  })[]
  loading?: boolean
  emptyMessage: string
  type: 'created' | 'joined' | 'pending'
  onSelect: (partyId: string) => void
}

const DUNGEON_TYPE_LABELS: Record<string, string> = {
  transcend: '초월',
  expedition: '원정',
  sanctuary: '성역',
  subjugation: '토벌전',
  pvp: 'PVP'
}

const DUNGEON_TYPE_COLORS: Record<string, string> = {
  transcend: '#f59e0b',
  expedition: '#3b82f6',
  sanctuary: '#ef4444',
  subjugation: '#8b5cf6',
  pvp: '#ef4444'
}

export default function MyPartyCompactList({
  title,
  icon,
  parties,
  loading,
  emptyMessage,
  type,
  onSelect
}: MyPartyCompactListProps) {
  if (loading) {
    return (
      <div className={styles.section}>
        <div className={styles.header}>
          <span className={styles.icon}>{icon}</span>
          <span className={styles.title}>{title}</span>
        </div>
        <div className={styles.loading}>불러오는 중...</div>
      </div>
    )
  }

  if (parties.length === 0) {
    return null // 빈 섹션은 숨김
  }

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <span className={styles.icon}>{icon}</span>
        <span className={styles.title}>{title}</span>
        <span className={styles.count}>{parties.length}</span>
      </div>
      <div className={styles.list}>
        {parties.map(party => {
          const currentMembers = party.current_members ||
            party.members?.filter(m => m.status === 'approved').length || 0

          // 시간 표시
          let timeStr = ''
          if (party.is_immediate) {
            timeStr = '즉시'
          } else if (party.scheduled_date && party.scheduled_time_start) {
            const date = new Date(party.scheduled_date)
            const dayNames = ['일', '월', '화', '수', '목', '금', '토']
            timeStr = `${date.getMonth() + 1}/${date.getDate()}(${dayNames[date.getDay()]}) ${party.scheduled_time_start.slice(0, 5)}`
          }

          return (
            <div
              key={party.id}
              className={styles.row}
              onClick={() => onSelect(party.id)}
            >
              {/* 던전 타입 뱃지 */}
              <span
                className={styles.typeBadge}
                style={{ background: DUNGEON_TYPE_COLORS[party.dungeon_type] }}
              >
                {DUNGEON_TYPE_LABELS[party.dungeon_type]}
              </span>

              {/* 던전명 */}
              <span className={styles.dungeonName}>
                {party.dungeon_name}
                {party.dungeon_tier && <span className={styles.tier}>{party.dungeon_tier}단</span>}
              </span>

              {/* 시간 */}
              <span className={styles.time}>{timeStr}</span>

              {/* 인원 */}
              <span className={styles.members}>
                {currentMembers}/{party.max_members}
              </span>

              {/* 상태 뱃지 */}
              {type === 'created' && party.pending_count && party.pending_count > 0 && (
                <span className={styles.pendingBadge}>
                  대기 {party.pending_count}
                </span>
              )}
              {type === 'joined' && party.my_member && (
                <span className={styles.roleBadge}>
                  {party.my_member.character_class}
                </span>
              )}
              {type === 'pending' && (
                <span className={styles.waitingBadge}>
                  승인대기
                </span>
              )}

              {/* 상태 */}
              <span className={`${styles.status} ${party.status === 'recruiting' ? styles.recruiting : styles.full}`}>
                {party.status === 'recruiting' ? '모집중' : '마감'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
