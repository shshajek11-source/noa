'use client'

import { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { usePartyDetail } from '@/hooks/usePartyDetail'
import type { PartySlot } from '@/types/party'
import { getTimeOfDay, getRelativeTime, getRemainingTime } from '@/types/party'
import { SERVERS } from '@/app/constants/servers'
import SlotCard from './SlotCard'
import PartyComments from './PartyComments'
import styles from './PartyDetailModal.module.css'

const ApplyModal = dynamic(() => import('./ApplyModal'), { ssr: false })

const DUNGEON_TYPE_ICONS: Record<string, string> = {
  transcend: '🏰',
  expedition: '🗺️',
  sanctuary: '⚔️',
  subjugation: '👹',
  pvp: '🎮'
}

interface PartyDetailModalProps {
  partyId: string
  isOpen: boolean
  onClose: () => void
}

export default function PartyDetailModal({ partyId, isOpen, onClose }: PartyDetailModalProps) {
  const {
    party,
    loading,
    error,
    apply,
    cancelApplication,
    approve,
    reject,
    kick,
    addComment,
    updateParty,
    deleteParty
  } = usePartyDetail(partyId)

  const [applySlot, setApplySlot] = useState<PartySlot | null>(null)
  const [processing, setProcessing] = useState(false)

  const isPvp = party?.dungeon_type === 'pvp'
  const serverName = party ? SERVERS.find(s => s.id === String(party.character_server_id))?.name || '' : ''

  const timeDisplay = useMemo(() => {
    if (!party) return null

    if (party.is_immediate) {
      return {
        icon: '⚡',
        label: '즉시 진행',
        timeAgo: `등록 ${getRelativeTime(party.created_at)}`
      }
    }

    if (!party.scheduled_date || !party.scheduled_time_start) {
      return null
    }

    const hour = parseInt(party.scheduled_time_start.split(':')[0], 10)
    const timeOfDay = getTimeOfDay(hour)
    const date = new Date(party.scheduled_date)
    const dateStr = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${['일', '월', '화', '수', '목', '금', '토'][date.getDay()]})`

    const timeIcons: Record<string, string> = {
      morning: '🌅',
      afternoon: '☀️',
      evening: '🌙',
      night: '🌃'
    }

    return {
      icon: timeIcons[timeOfDay] || '📅',
      label: `${dateStr} ${party.scheduled_time_start.slice(0, 5)}~${party.scheduled_time_end?.slice(0, 5) || ''}`,
      remaining: getRemainingTime(party.scheduled_date, party.scheduled_time_start)
    }
  }, [party])

  const slotsWithMembers = useMemo(() => {
    if (!party?.slots) return []
    const approvedMembers = party.members?.filter(m => m.status === 'approved') || []
    return party.slots.map(slot => {
      const member = approvedMembers.find(m => m.slot_id === slot.id)
      return { slot, member }
    })
  }, [party])

  const pendingMembers = useMemo(() => {
    if (!party?.members) return []
    return party.members.filter(m => m.status === 'pending')
  }, [party])

  const myApplication = useMemo(() => {
    if (!party?.members || !party.user_id) return null
    return party.members.find(
      m => m.user_id === party.user_id && ['pending', 'approved'].includes(m.status)
    )
  }, [party])

  const handleApply = async (data: Parameters<typeof apply>[0]) => {
    try {
      await apply(data)
      setApplySlot(null)
    } catch (err) {
      throw err
    }
  }

  const handleApprove = async (memberId: string) => {
    if (processing) return
    setProcessing(true)
    try {
      await approve(memberId)
    } catch (err) {
      alert(err instanceof Error ? err.message : '승인에 실패했습니다.')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async (memberId: string) => {
    if (processing) return
    const reason = prompt('거절 사유 (선택)')
    setProcessing(true)
    try {
      await reject(memberId, reason || undefined)
    } catch (err) {
      alert(err instanceof Error ? err.message : '거절에 실패했습니다.')
    } finally {
      setProcessing(false)
    }
  }

  const handleKick = async (memberId: string) => {
    if (processing) return
    if (!confirm('정말 추방하시겠습니까?')) return
    const reason = prompt('추방 사유 (선택)')
    setProcessing(true)
    try {
      await kick(memberId, reason || undefined)
    } catch (err) {
      alert(err instanceof Error ? err.message : '추방에 실패했습니다.')
    } finally {
      setProcessing(false)
    }
  }

  const handleToggleNotification = async () => {
    if (!party) return
    try {
      await updateParty({ notification_enabled: !party.notification_enabled })
    } catch (err) {
      alert(err instanceof Error ? err.message : '설정 변경에 실패했습니다.')
    }
  }

  const handleComplete = async () => {
    if (!confirm('파티를 완료 처리하시겠습니까?')) return
    try {
      await updateParty({ status: 'completed' })
    } catch (err) {
      alert(err instanceof Error ? err.message : '완료 처리에 실패했습니다.')
    }
  }

  const handleDelete = async () => {
    if (!confirm('파티를 취소하시겠습니까? 파티원들에게 알림이 발송됩니다.')) return
    try {
      await deleteParty()
      onClose()
    } catch (err) {
      alert(err instanceof Error ? err.message : '취소에 실패했습니다.')
    }
  }

  const handleCancelApplication = async () => {
    if (!confirm('신청을 취소하시겠습니까?')) return
    try {
      await cancelApplication()
    } catch (err) {
      alert(err instanceof Error ? err.message : '취소에 실패했습니다.')
    }
  }

  const canApplySlot = (slot: PartySlot) => {
    if (!party) return false
    if (party.is_leader || party.is_member) return false
    if (myApplication) return false
    if (slot.status === 'filled') return false
    if (party.status !== 'recruiting') return false
    return true
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>파티 상세</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalContent}>
          {loading && (
            <div className={styles.loading}>불러오는 중...</div>
          )}

          {error && (
            <div className={styles.error}>{error}</div>
          )}

          {party && (
            <>
              {/* 파티장 액션 버튼 */}
              {party.is_leader && (
                <div className={styles.leaderActions}>
                  <button
                    className={styles.actionButton}
                    onClick={handleToggleNotification}
                  >
                    알림 {party.notification_enabled ? 'ON' : 'OFF'}
                  </button>
                  <button
                    className={`${styles.actionButton} ${styles.complete}`}
                    onClick={handleComplete}
                  >
                    완료
                  </button>
                  <button
                    className={`${styles.actionButton} ${styles.danger}`}
                    onClick={handleDelete}
                  >
                    취소
                  </button>
                </div>
              )}

              {/* 파티 정보 */}
              <div className={`${styles.partyInfo} ${isPvp ? styles.pvp : ''}`}>
                <div className={styles.partyHeader}>
                  <span className={styles.dungeonName}>
                    {DUNGEON_TYPE_ICONS[party.dungeon_type]} {party.dungeon_name}
                    {party.dungeon_tier && ` ${party.dungeon_tier}단`}
                    {party.run_count && party.run_count > 1 && ` ${party.run_count}회`}
                  </span>
                  <span className={styles.status}>
                    [{party.status === 'recruiting' ? '모집중' : party.status === 'full' ? '마감' : party.status}]
                  </span>
                </div>

                {party.title && <h3 className={styles.partyTitle}>{party.title}</h3>}

                {timeDisplay && (
                  <div className={styles.timeInfo}>
                    <span className={styles.timeIcon}>{timeDisplay.icon}</span>
                    <span className={styles.timeLabel}>{timeDisplay.label}</span>
                    <span className={styles.timeRemaining}>
                      {timeDisplay.remaining || timeDisplay.timeAgo}
                    </span>
                  </div>
                )}

                {(party.min_item_level || party.min_breakthrough || party.min_combat_power) && (
                  <div className={styles.specs}>
                    조건:
                    {party.min_item_level && ` 아이템${party.min_item_level}+`}
                    {party.min_breakthrough && ` | 돌파${party.min_breakthrough}+`}
                    {party.min_combat_power && ` | 전투력${(party.min_combat_power / 10000).toFixed(0)}만+`}
                  </div>
                )}

                {party.description && (
                  <div className={styles.description}>"{party.description}"</div>
                )}
              </div>

              {/* 파티 슬롯 */}
              <div className={styles.section}>
                <h4 className={styles.sectionTitle}>
                  파티 슬롯 ({party.current_members}/{party.max_members})
                </h4>
                <div className={styles.slotsGrid}>
                  {slotsWithMembers.map(({ slot, member }) => (
                    <SlotCard
                      key={slot.id}
                      slot={slot}
                      member={member}
                      isLeader={party.is_leader}
                      canKick={party.is_leader}
                      canApply={canApplySlot(slot)}
                      onKick={() => member && handleKick(member.id)}
                      onApply={() => setApplySlot(slot)}
                    />
                  ))}
                </div>
              </div>

              {/* 신청 대기 (파티장) */}
              {party.is_leader && pendingMembers.length > 0 && (
                <div className={styles.section}>
                  <h4 className={styles.sectionTitle}>
                    신청 대기 ({pendingMembers.length}명)
                  </h4>
                  <div className={styles.pendingList}>
                    {pendingMembers.map(member => {
                      const memberServerName = SERVERS.find(s => s.id === String(member.character_server_id))?.name || ''
                      const targetSlot = party.slots?.find(s => s.id === member.slot_id)
                      return (
                        <div key={member.id} className={styles.pendingCard}>
                          <div className={styles.pendingInfo}>
                            <div className={styles.pendingMain}>
                              {member.character_class} Lv{member.character_level} | {memberServerName} {member.character_name}
                            </div>
                            <div className={styles.pendingStats}>
                              {member.character_item_level && `아이템${member.character_item_level}`}
                              {member.character_breakthrough && ` 돌파${member.character_breakthrough}`}
                            </div>
                            {member.apply_message && (
                              <div className={styles.pendingMessage}>"{member.apply_message}"</div>
                            )}
                            <div className={styles.pendingSlot}>
                              신청 슬롯: [{targetSlot?.required_class || '자유'}]
                            </div>
                          </div>
                          <div className={styles.pendingActions}>
                            <button
                              className={styles.rejectButton}
                              onClick={() => handleReject(member.id)}
                              disabled={processing}
                            >
                              거절
                            </button>
                            <button
                              className={styles.approveButton}
                              onClick={() => handleApprove(member.id)}
                              disabled={processing}
                            >
                              승인
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 내 신청 상태 */}
              {!party.is_leader && !party.is_member && myApplication && (
                <div className={styles.myApplicationStatus}>
                  <span>신청 상태: {myApplication.status === 'pending' ? '승인 대기 중...' : '승인됨'}</span>
                  {myApplication.status === 'pending' && (
                    <button onClick={handleCancelApplication} className={styles.cancelButton}>
                      신청 취소
                    </button>
                  )}
                </div>
              )}

              {/* 댓글 */}
              {(party.is_member || party.is_leader) && (
                <div className={styles.section}>
                  <PartyComments
                    comments={party.comments || []}
                    canComment={true}
                    onAddComment={addComment}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {applySlot && party && (
          <ApplyModal
            slot={applySlot}
            minItemLevel={party.min_item_level}
            minBreakthrough={party.min_breakthrough}
            minCombatPower={party.min_combat_power}
            onClose={() => setApplySlot(null)}
            onApply={handleApply}
          />
        )}
      </div>
    </div>
  )
}
