'use client'

import { useMemo, memo } from 'react'
import Image from 'next/image'
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

  const timeDisplay = useMemo(() => {
    if (party.is_immediate) {
      return {
        icon: '⚡',
        label: '즉시 진행',
        sub: getRelativeTime(party.created_at)
      }
    }

    if (!party.scheduled_date || !party.scheduled_time_start) {
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

    // 리더가 먼저 오고 나머지 멤버들
    // const sortedMembers = [
    //     ...(leaderMember ? [leaderMember] : []),
    //     ...approvedMembers.filter(m => m.user_id !== party.user_id)
    // ]

    const result = []

    for (let i = 0; i < maxDisplay; i++) {
      const slot = slots[i]
      // 슬롯 ID로 멤버 찾기 (없으면 순서대로)
      let member = slot ? approvedMembers.find(m => m.slot_id === slot.id) : approvedMembers[i]

      // 리더 표시 (첫 번째 슬롯이고 멤버가 없거나, 해당 멤버가 리더인 경우)
      // 여기서는 단순히 멤버 정보만 매핑
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
            profileImage: null,
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

  const handleClick = () => {
    if (onSelect) {
      onSelect(party.id)
    }
  }

  return (
    <div className={styles.card} onClick={handleClick} style={{ cursor: 'pointer' }}>
      {/* 헤더: 던전 정보 + 상태 */}
      <div className={styles.header}>
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
        <div className={styles.statusBadge}>
          <span className={party.status === 'recruiting' ? styles.recruiting : styles.full}>
            {party.status === 'recruiting' ? '모집중' : '마감'}
          </span>
          <span className={styles.memberCount}>{currentMembers}/{party.max_members}</span>
        </div>
      </div>

      {/* 제목 */}
      {party.title && (
        <div className={styles.title}>{party.title}</div>
      )}

      {/* 시간 정보 */}
      {timeDisplay && (
        <div className={styles.timeBox}>
          <span className={styles.timeIcon}>{timeDisplay.icon}</span>
          <span className={styles.timeLabel}>{timeDisplay.label}</span>
          <span className={styles.timeSub}>{timeDisplay.sub}</span>
        </div>
      )}

      {/* 파티원 슬롯 그리드 (4열 고정) */}
      <div className={styles.membersSection}>
        <div className={styles.membersGrid}>
          {memberSlots.map((slot, idx) => (
            <div key={slot.id} className={styles.memberSlot}>
              {slot.type === 'filled' ? (
                <div className={styles.memberCard}>
                  {slot.isLeader && <div className={styles.leaderBadge}>파티장</div>}
                  <div className={styles.profileWrapper}>
                    {slot.member.profileImage ? (
                      <Image
                        src={slot.member.profileImage}
                        alt={slot.member.name}
                        width={42}
                        height={42}
                        className={styles.profileImage}
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
              <div className={styles.partyStatIcon} style={{ color: '#60A5FA' }}>🛡️</div>
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

      {/* 푸터: 상태 뱃지 */}
      <div className={styles.footer}>
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
    </div>
  )
})
