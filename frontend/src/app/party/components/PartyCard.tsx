'use client'

import { useMemo, memo, useState, useEffect } from 'react'
import type { PartyPost, PartySlot, PartyMember } from '@/types/party'
import { getTimeOfDay, getTimeOfDayIcon, getTimeOfDayLabel, getRelativeTime, getRemainingTime } from '@/types/party'
import { SERVERS } from '@/app/constants/servers'
import styles from './PartyCard.module.css'

interface PartyCardProps {
  party: PartyPost & {
    slots?: PartySlot[]
    members?: PartyMember[]
    current_members?: number
    pending_count?: number
  }
  showPendingBadge?: boolean
  showMyRole?: boolean
  myMember?: { character_name: string; character_class: string; role: string }
  myApplication?: { character_name: string; character_class: string; applied_at: string }
  onSelect?: (partyId: string) => void
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

// 종족 색상
const RACE_COLORS: Record<string, string> = {
  Elyos: '#2DD4BF',
  Asmodian: '#A78BFA'
}

// 클래스 아이콘 (임시 - 실제 아이콘으로 대체 가능)
const CLASS_ICONS: Record<string, string> = {
  검성: '⚔️',
  마도성: '🔮',
  호법성: '🛡️',
  치유성: '💚',
  기공사: '🌀',
  사격성: '🎯',
  궁성: '🏹',
  암살성: '🗡️'
}

export default memo(function PartyCard({
  party,
  showPendingBadge = false,
  showMyRole = false,
  myMember,
  myApplication,
  onSelect
}: PartyCardProps) {
  const isPvp = party.dungeon_type === 'pvp'
  const dungeonColor = DUNGEON_TYPE_COLORS[party.dungeon_type] || '#f59e0b'

  // 성역 8인 파티인지 확인
  const isSanctuary8 = party.dungeon_type === 'sanctuary' && (party.max_members || 4) === 8
  const [selectedPartyGroup, setSelectedPartyGroup] = useState<1 | 2>(1)

  const [isExpanded, setIsExpanded] = useState(true)

  // 모바일인 경우 기본적으로 접힘 상태로 시작 (마운트 시점에 체크)
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsExpanded(false)
    }
  }, [])

  const currentMembers = party.current_members ||
    party.members?.filter(m => m.status === 'approved').length || 0

  // 파티 스탯 계산 (총 전투력, 평균 돌파)
  const partyStats = useMemo(() => {
    const approved = party.members?.filter(m => m.status === 'approved') || []
    const totalPower = approved.reduce((acc, m) => acc + (m.character_combat_power || 0), 0)

    // 돌파 평균 계산 (정보 있는 사람만)
    const breakthroughMembers = approved.filter(m => (m.character_breakthrough || 0) > 0)
    const totalBreakthrough = breakthroughMembers.reduce((acc, m) => acc + (m.character_breakthrough || 0), 0)
    const avgBreakthrough = breakthroughMembers.length > 0 ? Math.floor(totalBreakthrough / breakthroughMembers.length) : 0

    return { totalPower, avgBreakthrough }
  }, [party.members])

  // 예약 시간 표시 (즉시 진행은 표시하지 않음)
  const timeDisplay = useMemo(() => {
    // 즉시 진행이거나 예약 정보가 없으면 null
    if (party.is_immediate || !party.scheduled_date || !party.scheduled_time_start) {
      return null
    }

    const hour = parseInt(party.scheduled_time_start.split(':')[0])
    const timeRef = getTimeOfDay(hour)
    const icon = getTimeOfDayIcon(timeRef)
    const date = new Date(party.scheduled_date)
    const dateStr = `${date.getMonth() + 1}/${date.getDate()}(${['일', '월', '화', '수', '목', '금', '토'][date.getDay()]})`

    return {
      icon: icon,
      label: `${dateStr} ${party.scheduled_time_start.slice(0, 5)}`,
      sub: getRemainingTime(party.scheduled_date, party.scheduled_time_start)
    }
  }, [party])

  const serverName = SERVERS.find(s => s.id === String(party.character_server_id))?.name || ''

  // 슬롯과 멤버 정보 매핑
  const memberSlots = useMemo(() => {
    const slots = party.slots || []
    const approvedMembers = party.members?.filter(m => m.status === 'approved') || []
    const leaderMember = approvedMembers.find(m => m.user_id === party.user_id)

    // 최대 표시 슬롯 수 (최소 4개, 최대 8개)
    const maxDisplay = Math.max(4, Math.min(party.max_members || 4, 8))

    // 파티장 먼저, 나머지 멤버들 순서대로
    const sortedMembers = [
      ...(leaderMember ? [leaderMember] : []),
      ...approvedMembers.filter(m => m.user_id !== party.user_id)
    ]

    const result = []

    for (let i = 0; i < maxDisplay; i++) {
      const slot = slots[i]
      // 정렬된 멤버 순서대로 배치 (파티장이 항상 첫 번째)
      const member = sortedMembers[i]
      const isLeader = member && member.user_id === party.user_id

      if (member) {
        const memberServerName = SERVERS.find(s => s.id === String(member.character_server_id))?.name || serverName
        result.push({
          id: slot?.id || i,
          type: 'filled' as const,
          isLeader: isLeader,
          member: {
            name: member.character_name || '파티원',
            class: member.character_class || '자유',
            server: memberServerName,
            race: 'Elyos', // API 연동 시 수정
            profileImage: member.profile_image || null,
            itemLevel: member.character_item_level || 0,
            pveScore: member.character_combat_power || 0,
            pvpScore: null
          }
        })
      } else {
        result.push({
          id: slot?.id || i,
          type: 'empty' as const,
          requiredClass: slot?.required_class || '자유'
        })
      }
    }

    return result
  }, [party, serverName])

  // 성역 8인 파티: 1파티/2파티로 분리
  const party1Slots = useMemo(() => memberSlots.slice(0, 4), [memberSlots])
  const party2Slots = useMemo(() => memberSlots.slice(4, 8), [memberSlots])

  // 각 파티의 빈 슬롯 수
  const party1EmptyCount = useMemo(() => party1Slots.filter(s => s.type === 'empty').length, [party1Slots])
  const party2EmptyCount = useMemo(() => party2Slots.filter(s => s.type === 'empty').length, [party2Slots])

  // 현재 선택된 파티의 슬롯
  const displaySlots = useMemo(() => {
    if (!isSanctuary8) return memberSlots
    return selectedPartyGroup === 1 ? party1Slots : party2Slots
  }, [isSanctuary8, selectedPartyGroup, memberSlots, party1Slots, party2Slots])

  const handleClick = () => {
    // 모바일에서 접힌 상태면 카드 클릭 시 펼치기 (이벤트 전파 제어 고려)
    if (!isExpanded && window.innerWidth < 1024) {
      setIsExpanded(true)
      return
    }

    if (onSelect) {
      onSelect(party.id)
    }
  }

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  return (
    <div className={styles.card} onClick={handleClick} style={{ cursor: 'pointer' }}>
      {/* 파티 제목 (맨 위에 강조) */}
      {party.title && (
        <div className={styles.titleRow}>
          <h3 className={styles.partyTitle}>{party.title}</h3>
          {/* 예약 시간 표시 */}
          {timeDisplay && (
            <div className={styles.scheduleTime}>
              <span className={styles.scheduleIcon}>{timeDisplay.icon}</span>
              <span className={styles.scheduleLabel}>{timeDisplay.label}</span>
            </div>
          )}
        </div>
      )}

      {/* 제목 없을 때 예약 시간만 표시 */}
      {!party.title && timeDisplay && (
        <div className={styles.titleRow}>
          <div className={styles.scheduleTime}>
            <span className={styles.scheduleIcon}>{timeDisplay.icon}</span>
            <span className={styles.scheduleLabel}>{timeDisplay.label}</span>
            {timeDisplay.sub && <span className={styles.scheduleSub}>{timeDisplay.sub}</span>}
          </div>
        </div>
      )}

      {/* 헤더: 던전 정보 + 상태 */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.dungeonInfo}>
            <span
              className={styles.dungeonBadge}
              style={{ background: dungeonColor }}
            >
              {DUNGEON_TYPE_LABELS[party.dungeon_type]}
            </span>
            <span className={styles.dungeonName}>
              {party.dungeon_name}
              {party.dungeon_tier && <span className={styles.tier}>{party.dungeon_tier}단</span>}
            </span>
          </div>
        </div>
        <div className={styles.statusBadge}>
          <span className={party.status === 'recruiting' ? styles.recruiting : styles.full}>
            {party.status === 'recruiting' ? '모집중' : '마감'}
          </span>
          <span className={styles.memberCount}>{currentMembers}/{party.max_members}</span>
        </div>
      </div>

      {/* 참여 조건 */}
      {(party.min_item_level || party.min_breakthrough || party.min_combat_power) && (
        <div className={styles.requirements}>
          <span className={styles.reqPrefix}>참여조건:</span>
          {party.min_item_level && (
            <span className={styles.reqItem}>
              <span className={styles.reqLabel}>아이템</span>
              <span className={styles.reqValue}>{party.min_item_level}+</span>
            </span>
          )}
          {party.min_breakthrough && (
            <span className={styles.reqItem}>
              <span className={styles.reqLabel}>돌파</span>
              <span className={styles.reqValue}>{party.min_breakthrough}+</span>
            </span>
          )}
          {party.min_combat_power && (
            <span className={styles.reqItem}>
              <span className={styles.reqLabel}>전투력</span>
              <span className={styles.reqValue}>{(party.min_combat_power / 10000).toFixed(0)}만+</span>
            </span>
          )}
        </div>
      )}

      {/* 성역 8인: 1파티/2파티 탭 */}
      {isSanctuary8 && (
        <div className={styles.partyGroupTabs}>
          <button
            className={`${styles.partyGroupTab} ${selectedPartyGroup === 1 ? styles.activeTab : ''}`}
            onClick={(e) => { e.stopPropagation(); setSelectedPartyGroup(1) }}
          >
            1파티 {party1EmptyCount > 0 && <span className={styles.emptyBadge}>{party1EmptyCount}자리</span>}
          </button>
          <button
            className={`${styles.partyGroupTab} ${selectedPartyGroup === 2 ? styles.activeTab : ''}`}
            onClick={(e) => { e.stopPropagation(); setSelectedPartyGroup(2) }}
          >
            2파티 {party2EmptyCount > 0 && <span className={styles.emptyBadge}>{party2EmptyCount}자리</span>}
          </button>
        </div>
      )}

      {/* 파티원 슬롯 그리드 (4열 고정) - 펼쳐진 상태거나 PC인 경우 표시 */}
      {(isExpanded || (typeof window !== 'undefined' && window.innerWidth >= 1024)) && (
        <>
          <div className={styles.membersSection}>
            <div className={styles.membersGrid}>
              {displaySlots.map((slot, idx) => (
                <div key={slot.id} className={styles.memberSlot}>
                  {slot.type === 'filled' ? (
                    <div className={styles.memberCard}>
                      {slot.isLeader && <div className={styles.leaderBadge}>파티장</div>}
                      <div className={styles.profileWrapper}>
                        {slot.member.profileImage ? (
                          <img
                            src={slot.member.profileImage}
                            alt={slot.member.name}
                            className={styles.profileImage}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                              const parent = (e.target as HTMLImageElement).parentElement
                              if (parent) {
                                const placeholder = document.createElement('div')
                                placeholder.className = styles.profilePlaceholder
                                placeholder.innerHTML = CLASS_ICONS[slot.member.class] || '👤'
                                parent.insertBefore(placeholder, e.target as HTMLImageElement)
                              }
                            }}
                          />
                        ) : (
                          <div className={styles.profilePlaceholder}>
                            {CLASS_ICONS[slot.member.class] || '👤'}
                          </div>
                        )}
                        <span
                          className={styles.raceIndicator}
                          style={{ background: RACE_COLORS[slot.member.race] || '#2DD4BF' }}
                        />
                      </div>
                      <div className={styles.memberInfo}>
                        <div className={styles.memberMainInfo}>
                          <span className={styles.memberName}>{slot.member.name}</span>
                          <span className={styles.memberClass}>{slot.member.class}</span>
                          {slot.member.itemLevel > 0 && (
                            <span className={styles.itemLevel}>iLv.{slot.member.itemLevel}</span>
                          )}
                        </div>
                        {slot.member.pveScore && slot.member.pveScore > 0 && (
                          <span className={styles.combatPower}>
                            {(slot.member.pveScore / 10000).toFixed(1)}만
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className={styles.emptySlot}>
                      <div className={styles.emptyIcon}>+</div>
                      <span className={styles.emptyClass}>
                        {slot.requiredClass === '자유' ? '모집중' : slot.requiredClass}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 하단 스탯 (파티 전투력, 평균 돌파) */}
          {(partyStats.totalPower > 0 || partyStats.avgBreakthrough > 0) && (
            <div className={styles.partyStats}>
              {partyStats.totalPower > 0 && (
                <div className={styles.partyStatItem}>
                  <div className={styles.partyStatIcon} style={{ color: '#f59e0b' }}>⚔️</div>
                  <div className={styles.partyStatContent}>
                    <span className={styles.partyStatLabel}>파티 전투력</span>
                    <span className={styles.partyStatValue}>
                      {(partyStats.totalPower / 10000).toFixed(0)}만
                    </span>
                  </div>
                </div>
              )}

              {partyStats.totalPower > 0 && partyStats.avgBreakthrough > 0 && (
                <div style={{ width: 1, height: 24, background: '#333' }} />
              )}

              {partyStats.avgBreakthrough > 0 && (
                <div className={styles.partyStatItem}>
                  <div className={styles.breakthroughBadge}>
                    <span className={styles.breakthroughText}>{partyStats.avgBreakthrough}</span>
                  </div>
                  <div className={styles.partyStatContent}>
                    <span className={styles.partyStatLabel}>평균 돌파</span>
                    <span className={styles.partyStatValue}>
                      +{partyStats.avgBreakthrough}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* 푸터: 상태 뱃지 + 시간 */}
      <div className={styles.footer}>
        <div className={styles.footerBadges}>
          {showPendingBadge && party.pending_count && party.pending_count > 0 && (
            <span className={styles.pendingBadge}>
              신청 대기 {party.pending_count}건
            </span>
          )}
          {showMyRole && myMember && (
            <span className={styles.myRoleBadge}>
              내 역할: {myMember.character_class}
            </span>
          )}
          {myApplication && (
            <span className={styles.applicationBadge}>
              승인 대기중
            </span>
          )}
          {party.run_count && party.run_count > 1 && (
            <span className={styles.runCountBadge}>
              {party.run_count}회 진행
            </span>
          )}
        </div>
        <div className={styles.footerRight}>
          {partyStats.totalPower > 0 && (
            <span className={styles.footerTotalPower}>
              ⚔️ {(partyStats.totalPower / 10000).toFixed(0)}만
            </span>
          )}
          <span className={styles.timeAgo}>{getRelativeTime(party.created_at)}</span>
          <button
            className={`${styles.expandButton} ${isExpanded ? styles.expanded : ''}`}
            onClick={toggleExpand}
            aria-label={isExpanded ? '접기' : '펼치기'}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
})
