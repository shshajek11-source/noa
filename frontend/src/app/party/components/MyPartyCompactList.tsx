'use client'

import { useState } from 'react'
import type { PartyPost, PartyMember } from '@/types/party'
import { getAuthHeaders } from '@/lib/auth-client'
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
  onDelete?: () => void
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
  onSelect,
  onDelete
}: MyPartyCompactListProps) {
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string; dungeonName: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDeleteClick = (e: React.MouseEvent, party: PartyPost) => {
    e.stopPropagation()
    setDeleteTarget({
      id: party.id,
      title: party.title || '',
      dungeonName: party.dungeon_name
    })
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/party/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      if (res.ok) {
        setDeleteTarget(null)
        onDelete?.()
      } else {
        const data = await res.json()
        alert(data.error || '삭제에 실패했습니다.')
      }
    } catch (err) {
      console.error('Delete error:', err)
      alert('삭제 중 오류가 발생했습니다.')
    } finally {
      setDeleting(false)
    }
  }

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

              {/* 던전명 + 제목 */}
              <div className={styles.dungeonInfo}>
                <span className={styles.dungeonName}>
                  {party.dungeon_name}
                  {party.dungeon_tier && <span className={styles.tier}>{party.dungeon_tier}단</span>}
                </span>
                {party.title && (
                  <span className={styles.partyTitle}>{party.title}</span>
                )}
              </div>

              {/* 시간 */}
              <span className={styles.time}>{timeStr}</span>

              {/* 인원 */}
              <span className={styles.members}>
                {currentMembers}/{party.max_members}
              </span>

              {/* 상태 뱃지 */}
              {type === 'created' && party.pending_count && party.pending_count > 0 && (
                <span className={styles.pendingBadge}>
                  {party.pending_count}
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

              {/* 삭제 버튼 (내가 만든 파티만) */}
              {type === 'created' && (
                <button
                  className={styles.deleteButton}
                  onClick={(e) => handleDeleteClick(e, party)}
                  title="파티 삭제"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className={styles.confirmOverlay} onClick={() => !deleting && setDeleteTarget(null)}>
          <div className={styles.confirmModal} onClick={e => e.stopPropagation()}>
            <div className={styles.confirmHeader}>
              <h3>파티 삭제</h3>
            </div>
            <div className={styles.confirmContent}>
              <p className={styles.confirmText}>
                정말 이 파티를 삭제하시겠습니까?
              </p>
              <div className={styles.confirmPartyInfo}>
                <span className={styles.confirmDungeon}>{deleteTarget.dungeonName}</span>
                {deleteTarget.title && (
                  <span className={styles.confirmTitle}>{deleteTarget.title}</span>
                )}
              </div>
              <p className={styles.confirmWarning}>
                삭제된 파티는 복구할 수 없습니다.
              </p>
            </div>
            <div className={styles.confirmActions}>
              <button
                className={styles.confirmCancel}
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                취소
              </button>
              <button
                className={styles.confirmDelete}
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
