'use client'

import { useState, useMemo, useEffect } from 'react'
import { useMyCharacters } from '@/hooks/useMyCharacters'
import { supabase } from '@/lib/supabaseClient'
import type { PartyPost, PartySlot, PartyMember, PartyUserCharacter } from '@/types/party'
import { getTimeOfDay, getTimeOfDayIcon, getRelativeTime, getRemainingTime } from '@/types/party'
import { SERVERS } from '@/app/constants/servers'
import styles from './PartyApplyConfirmModal.module.css'

interface PartyApplyConfirmModalProps {
  party: PartyPost & {
    slots?: PartySlot[]
    members?: PartyMember[]
    current_members?: number
  }
  isOpen: boolean
  onClose: () => void
  onApplied: () => void  // 신청 완료 후 콜백
}

const DUNGEON_TYPE_LABELS: Record<string, string> = {
  transcend: '초월',
  expedition: '원정',
  sanctuary: '성역',
  subjugation: '토벌전',
  pvp: 'PVP'
}

export default function PartyApplyConfirmModal({
  party,
  isOpen,
  onClose,
  onApplied
}: PartyApplyConfirmModalProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const { characters, loading: loadingCharacters } = useMyCharacters({ accessToken })
  const [selectedCharacter, setSelectedCharacter] = useState<PartyUserCharacter | null>(null)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentMembers = party.current_members ||
    party.members?.filter(m => m.status === 'approved').length || 0

  const serverName = SERVERS.find(s => s.id === String(party.character_server_id))?.name || ''

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
    const icon = getTimeOfDayIcon(getTimeOfDay(hour))
    const date = new Date(party.scheduled_date)
    const dateStr = `${date.getMonth() + 1}/${date.getDate()}(${['일', '월', '화', '수', '목', '금', '토'][date.getDay()]})`

    return {
      icon: icon,
      label: `${dateStr} ${party.scheduled_time_start.slice(0, 5)}`,
      sub: getRemainingTime(party.scheduled_date, party.scheduled_time_start)
    }
  }, [party])

  // 슬롯 정보 계산 (멤버 정보 포함)
  const slotInfo = useMemo(() => {
    if (!party.slots) return []

    return party.slots.map(slot => {
      // 해당 슬롯에 배정된 멤버 찾기
      const member = party.members?.find(m =>
        m.slot_id === slot.id && m.status === 'approved'
      )

      return {
        ...slot,
        member,
        isEmpty: !member && slot.status !== 'filled'
      }
    }).sort((a, b) => a.slot_number - b.slot_number)
  }, [party.slots, party.members])

  // 빈 슬롯 목록
  const emptySlots = useMemo(() => {
    return slotInfo.filter(s => s.isEmpty)
  }, [slotInfo])

  // 모든 캐릭터 표시 (필터링 없음 - 유저가 직접 판단)
  const eligibleCharacters = characters

  // 세션 토큰 가져오기
  useEffect(() => {
    const getToken = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        setAccessToken(session.access_token)
      }
    }
    if (isOpen) {
      getToken()
    }
  }, [isOpen])

  // 캐릭터가 1개면 자동 선택
  useEffect(() => {
    if (eligibleCharacters.length === 1 && !selectedCharacter) {
      setSelectedCharacter(eligibleCharacters[0])
    }
  }, [eligibleCharacters, selectedCharacter])

  // 빈 슬롯이 1개면 자동 선택
  useEffect(() => {
    if (emptySlots.length === 1 && !selectedSlotId) {
      setSelectedSlotId(emptySlots[0].id)
    }
  }, [emptySlots, selectedSlotId])

  const handleApply = async () => {
    if (!selectedCharacter) {
      setError('캐릭터를 선택해주세요.')
      return
    }

    if (!selectedSlotId) {
      setError('슬롯을 선택해주세요.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch(`/api/party/${party.id}/apply`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          slot_id: selectedSlotId,
          character_name: selectedCharacter.character_name,
          character_class: selectedCharacter.character_class,
          character_server_id: selectedCharacter.character_server_id,
          character_level: selectedCharacter.character_level,
          character_item_level: selectedCharacter.character_item_level,
          character_breakthrough: selectedCharacter.character_breakthrough,
          character_combat_power: selectedCharacter.character_combat_power,
          profile_image: selectedCharacter.profile_image
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '신청에 실패했습니다.')
      }

      alert('파티 신청이 완료되었습니다. 파티장의 승인을 기다려주세요.')
      onApplied()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '신청에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>파티 신청</h3>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          {/* 파티 정보 요약 */}
          <div className={styles.partyInfo}>
            <div className={styles.dungeonRow}>
              <span className={styles.dungeonType}>
                {DUNGEON_TYPE_LABELS[party.dungeon_type]}
              </span>
              <span className={styles.dungeonName}>
                {party.dungeon_name}
                {party.dungeon_tier && ` ${party.dungeon_tier}단`}
              </span>
            </div>

            {party.title && (
              <div className={styles.title}>{party.title}</div>
            )}

            {timeDisplay && (
              <div className={styles.timeRow}>
                <span>{timeDisplay.icon}</span>
                <span>{timeDisplay.label}</span>
                <span className={styles.timeSub}>{timeDisplay.sub}</span>
              </div>
            )}

            <div className={styles.infoRow}>
              <span>파티장: {party.character_name} ({party.character_class})</span>
              <span>서버: {serverName}</span>
            </div>

            {(party.min_item_level || party.min_breakthrough || party.min_combat_power) && (
              <div className={styles.requirements}>
                <span className={styles.reqLabel}>참여 조건:</span>
                {party.min_item_level && <span>아이템 {party.min_item_level}+</span>}
                {party.min_breakthrough && <span>돌파 {party.min_breakthrough}+</span>}
                {party.min_combat_power && <span>전투력 {(party.min_combat_power / 10000).toFixed(0)}만+</span>}
              </div>
            )}
          </div>

          {/* 슬롯 선택 */}
          <div className={styles.slotSection}>
            <label className={styles.sectionLabel}>슬롯 선택</label>
            {slotInfo.length === 0 ? (
              <p className={styles.noSlots}>슬롯 정보를 불러올 수 없습니다.</p>
            ) : (
              <div className={styles.slotGrid}>
                {slotInfo.map(slot => {
                  const isSelected = selectedSlotId === slot.id
                  const canSelect = slot.isEmpty

                  return (
                    <button
                      key={slot.id}
                      className={`${styles.slotItem} ${isSelected ? styles.selectedSlot : ''} ${!canSelect ? styles.filledSlot : ''}`}
                      onClick={() => canSelect && setSelectedSlotId(slot.id)}
                      disabled={!canSelect}
                    >
                      <span className={styles.slotNumber}>{slot.slot_number}</span>
                      {slot.member ? (
                        <span className={styles.slotMember}>
                          {slot.member.character_class}
                        </span>
                      ) : slot.required_class ? (
                        <span className={styles.slotRequired}>
                          {slot.required_class}
                        </span>
                      ) : (
                        <span className={styles.slotEmpty}>빈자리</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
            {emptySlots.length === 0 && (
              <p className={styles.noSlots}>빈 슬롯이 없습니다.</p>
            )}
          </div>

          {/* 캐릭터 선택 */}
          <div className={styles.characterSection}>
            <label className={styles.sectionLabel}>신청 캐릭터</label>
            {loadingCharacters ? (
              <p className={styles.loading}>캐릭터 불러오는 중...</p>
            ) : eligibleCharacters.length === 0 ? (
              <p className={styles.noCharacter}>
                {characters.length === 0
                  ? '등록된 캐릭터가 없습니다.'
                  : '조건에 맞는 캐릭터가 없습니다.'
                }
              </p>
            ) : eligibleCharacters.length === 1 ? (
              <div className={styles.singleCharacter}>
                {eligibleCharacters[0].character_class} | {SERVERS.find(s => s.id === String(eligibleCharacters[0].character_server_id))?.name || `서버${eligibleCharacters[0].character_server_id || '?'}`} {eligibleCharacters[0].character_name}
              </div>
            ) : (
              <div className={styles.characterList}>
                {eligibleCharacters.map(char => {
                  const charServerName = SERVERS.find(s => s.id === String(char.character_server_id))?.name || `서버${char.character_server_id || '?'}`
                  return (
                    <button
                      key={char.id}
                      className={`${styles.characterOption} ${selectedCharacter?.id === char.id ? styles.selected : ''}`}
                      onClick={() => setSelectedCharacter(char)}
                    >
                      <span className={styles.charInfo}>
                        {char.character_class} | {charServerName} {char.character_name}
                      </span>
                      {char.character_item_level && (
                        <span className={styles.charStats}>iLv.{char.character_item_level}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <p className={styles.subText}>
            파티장이 신청을 승인하면 선택한 슬롯에 참여하게 됩니다.
          </p>
        </div>

        <div className={styles.actions}>
          <button className={styles.cancelButton} onClick={onClose}>
            취소
          </button>
          <button
            className={styles.applyButton}
            onClick={handleApply}
            disabled={!selectedCharacter || !selectedSlotId || submitting || eligibleCharacters.length === 0}
          >
            {submitting ? '신청 중...' : '신청하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
