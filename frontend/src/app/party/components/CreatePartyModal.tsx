'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMyCharacters } from '@/hooks/useMyCharacters'
import { useAuth } from '@/context/AuthContext'
import type { DungeonType, CreatePartyRequest, PartyUserCharacter, PartyPost } from '@/types/party'
import { SERVERS } from '@/app/constants/servers'
import { CLASSES } from '@/app/constants/game-data'
import styles from './CreatePartyModal.module.css'

const DUNGEON_TYPES: { value: DungeonType; label: string; maxMembers: number }[] = [
  { value: 'transcend', label: '초월', maxMembers: 4 },
  { value: 'expedition', label: '원정', maxMembers: 4 },
  { value: 'sanctuary', label: '성역', maxMembers: 8 },
  { value: 'subjugation', label: '토벌전', maxMembers: 4 },
  { value: 'pvp', label: 'PVP', maxMembers: 4 }
]

interface DungeonData {
  id: string
  name: string
  tiers?: number[]
  category?: string  // 원정의 경우 카테고리명
}

interface SlotConfig {
  slot_number: number
  party_number: number
  required_class: string | null
}

interface CreatePartyModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated?: (partyId: string) => void
  // 수정 모드
  editMode?: boolean
  editData?: PartyPost
  onUpdated?: () => void
}

// 직업별 아이콘
const CLASS_ICONS: Record<string, string> = {
  검성: '🗡️',
  수호성: '🛡️',
  궁성: '🏹',
  살성: '🔪',
  마도성: '🔮',
  정령성: '👻',
  치유성: '💚',
  호법성: '⚡'
}

// 날짜 헬퍼: 오늘부터 7일간의 날짜 생성
const getNext7Days = () => {
  const days = []
  const today = new Date()
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]

    let label = ''
    if (i === 0) label = '오늘'
    else if (i === 1) label = '내일'
    else {
      const dayNames = ['일', '월', '화', '수', '목', '금', '토']
      label = `${d.getMonth() + 1}/${d.getDate()}(${dayNames[d.getDay()]})`
    }

    days.push({ date: dateStr, label })
  }
  return days
}

export default function CreatePartyModal({ isOpen, onClose, onCreated, editMode, editData, onUpdated }: CreatePartyModalProps) {
  const router = useRouter()
  const { session } = useAuth()
  const { characters, loading: loadingCharacters, refresh: refreshCharacters } = useMyCharacters({ accessToken: session?.access_token })

  // 모달이 열릴 때마다 캐릭터 목록 새로고침
  useEffect(() => {
    if (isOpen && session?.access_token) {
      console.log('[CreatePartyModal] Modal opened, refreshing characters...')
      refreshCharacters()
    }
  }, [isOpen, session?.access_token, refreshCharacters])

  // 디버깅용 로그
  useEffect(() => {
    console.log('[CreatePartyModal] Characters:', characters.length, 'Loading:', loadingCharacters, 'Session:', !!session?.access_token)
  }, [characters, loadingCharacters, session])

  // 수정 모드: 초기값 설정
  useEffect(() => {
    if (editMode && editData && isOpen) {
      setDungeonType(editData.dungeon_type)
      setSelectedTier(editData.dungeon_tier || 1)
      setIsImmediate(editData.is_immediate)
      setScheduledDate(editData.scheduled_date || new Date().toISOString().split('T')[0])
      if (editData.scheduled_time_start) {
        const [sh, sm] = editData.scheduled_time_start.split(':')
        setStartHour(sh)
        setStartMinute(sm)
      }
      if (editData.scheduled_time_end) {
        const [eh, em] = editData.scheduled_time_end.split(':')
        setEndHour(eh)
        setEndMinute(em)
      }
      setRunCount(editData.run_count || 1)
      setMinItemLevel(editData.min_item_level || undefined)
      setMinBreakthrough(editData.min_breakthrough || undefined)
      setMinCombatPower(editData.min_combat_power || undefined)
      setTitle(editData.title)
      setDescription(editData.description || '')
    }
  }, [editMode, editData, isOpen])

  const [dungeonType, setDungeonType] = useState<DungeonType>('transcend')
  const [dungeons, setDungeons] = useState<DungeonData[]>([])
  const [selectedDungeon, setSelectedDungeon] = useState<DungeonData | null>(null)
  const [selectedTier, setSelectedTier] = useState<number>(1)
  const [isImmediate, setIsImmediate] = useState(true)

  // 원정 타입/난이도 선택
  const [expeditionType, setExpeditionType] = useState<'exploration' | 'conquest'>('exploration')
  const [expeditionDifficulty, setExpeditionDifficulty] = useState<'normal' | 'hard'>('normal')

  // 날짜/시간 선택 개선
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0])
  const [startHour, setStartHour] = useState('21')
  const [startMinute, setStartMinute] = useState('00')
  const [endHour, setEndHour] = useState('23')
  const [endMinute, setEndMinute] = useState('00')

  const [runCount, setRunCount] = useState(1)
  const [minItemLevel, setMinItemLevel] = useState<number | undefined>()
  const [minBreakthrough, setMinBreakthrough] = useState<number | undefined>()
  const [minCombatPower, setMinCombatPower] = useState<number | undefined>()
  const [joinType] = useState<'approval'>('approval')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedCharacter, setSelectedCharacter] = useState<PartyUserCharacter | null>(null)
  const [slots, setSlots] = useState<SlotConfig[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const maxMembers = DUNGEON_TYPES.find(d => d.value === dungeonType)?.maxMembers || 4

  // 던전 데이터 로드
  useEffect(() => {
    if (!isOpen) return

    fetch('/api/ledger/dungeon-data')
      .then(res => res.json())
      .then(data => {
        const dungeonList: DungeonData[] = []

        if (dungeonType === 'transcend' && data.transcend?.bosses) {
          // 초월: bosses 배열, 각 보스에 tiers 배열
          data.transcend.bosses.forEach((boss: { id: string; name: string; tiers?: { tier: number }[] }) => {
            dungeonList.push({
              id: boss.id,
              name: boss.name,
              tiers: boss.tiers ? boss.tiers.map(t => t.tier) : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
            })
          })
        } else if (dungeonType === 'expedition' && data.expedition?.categories) {
          // 원정: 타입/난이도에 따라 필터링
          // 선택된 카테고리 ID 결정
          let categoryId = 'exploration'
          if (expeditionType === 'conquest') {
            categoryId = expeditionDifficulty === 'hard' ? 'conquest_hard' : 'conquest_normal'
          }

          const selectedCategory = data.expedition.categories.find(
            (cat: { id: string }) => cat.id === categoryId
          )

          if (selectedCategory) {
            selectedCategory.bosses.forEach((boss: { id: string; name: string }) => {
              dungeonList.push({
                id: boss.id,
                name: boss.name,
                category: selectedCategory.name
              })
            })
          }
        } else if (dungeonType === 'sanctuary' && data.sanctuary?.categories) {
          // 성역: categories 배열 -> bosses 배열
          data.sanctuary.categories.forEach((cat: { id: string; name: string; bosses: { id: string; name: string }[] }) => {
            cat.bosses.forEach(boss => {
              dungeonList.push({
                id: boss.id,
                name: boss.name,
                category: cat.name
              })
            })
          })
        } else if (dungeonType === 'subjugation') {
          dungeonList.push({ id: 'subjugation', name: '토벌전' })
        } else if (dungeonType === 'pvp') {
          dungeonList.push({ id: 'arena', name: '아레나' })
          dungeonList.push({ id: 'battlefield', name: '전장' })
        }

        setDungeons(dungeonList)
        if (dungeonList.length > 0) {
          // 수정 모드: 기존 던전 선택
          if (editMode && editData) {
            const existingDungeon = dungeonList.find(d => d.id === editData.dungeon_id)
            setSelectedDungeon(existingDungeon || dungeonList[0])
          } else {
            setSelectedDungeon(dungeonList[0])
          }
        }
      })
      .catch(err => console.error('Failed to load dungeon data:', err))
  }, [dungeonType, isOpen, editMode, editData, expeditionType, expeditionDifficulty])

  // 슬롯 초기화
  useEffect(() => {
    const newSlots: SlotConfig[] = []
    for (let i = 1; i <= maxMembers; i++) {
      newSlots.push({
        slot_number: i,
        party_number: i <= 4 ? 1 : 2,
        required_class: null
      })
    }
    setSlots(newSlots)
  }, [maxMembers])

  // 모달이 닫힐 때 선택 초기화
  useEffect(() => {
    if (!isOpen) {
      setSelectedCharacter(null)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 수정 모드에서는 캐릭터/던전 선택 검증 스킵
    if (!editMode) {
      if (!selectedCharacter) {
        setError('캐릭터를 선택해주세요.')
        return
      }

      if (!selectedDungeon) {
        setError('던전을 선택해주세요.')
        return
      }
    }

    if (!title.trim()) {
      setError('제목을 입력해주세요.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // 인증 헤더 (Bearer 토큰만 사용)
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      if (editMode && editData) {
        // 수정 모드: PATCH 요청
        const updateData = {
          title: title.trim(),
          description: description.trim() || null,
          dungeon_type: dungeonType,
          dungeon_id: selectedDungeon?.id || editData.dungeon_id,
          dungeon_name: selectedDungeon?.name || editData.dungeon_name,
          dungeon_tier: selectedDungeon?.tiers ? selectedTier : null,
          is_immediate: isImmediate,
          scheduled_date: !isImmediate ? scheduledDate : null,
          scheduled_time_start: !isImmediate ? `${startHour}:${startMinute}` : null,
          scheduled_time_end: !isImmediate ? `${endHour}:${endMinute}` : null,
          run_count: runCount,
          join_type: joinType,
          min_item_level: minItemLevel || null,
          min_breakthrough: minBreakthrough || null,
          min_combat_power: minCombatPower || null
        }

        const response = await fetch(`/api/party/${editData.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(updateData)
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || '파티 수정에 실패했습니다.')
        }

        onClose()
        onUpdated?.()
      } else {
        // 생성 모드: POST 요청
        const requestData: CreatePartyRequest = {
          title: title.trim(),
          description: description.trim() || undefined,
          dungeon_type: dungeonType,
          dungeon_id: selectedDungeon!.id,
          dungeon_name: selectedDungeon!.name,
          dungeon_tier: selectedDungeon!.tiers ? selectedTier : undefined,
          is_immediate: isImmediate,
          scheduled_date: !isImmediate ? scheduledDate : undefined,
          scheduled_time_start: !isImmediate ? `${startHour}:${startMinute}` : undefined,
          scheduled_time_end: !isImmediate ? `${endHour}:${endMinute}` : undefined,
          run_count: runCount,
          max_members: maxMembers,
          join_type: joinType,
          min_item_level: minItemLevel,
          min_breakthrough: minBreakthrough,
          min_combat_power: minCombatPower,
          character_name: selectedCharacter!.character_name,
          character_class: selectedCharacter!.character_class,
          character_server_id: selectedCharacter!.character_server_id,
          character_level: selectedCharacter!.character_level,
          character_item_level: selectedCharacter!.character_item_level,
          character_breakthrough: selectedCharacter!.character_breakthrough,
          character_combat_power: selectedCharacter!.character_combat_power,
          profile_image: selectedCharacter!.profile_image,
          slots: slots.map(s => ({
            ...s,
            required_class: s.required_class || undefined
          }))
        }

        const response = await fetch('/api/party', {
          method: 'POST',
          headers,
          body: JSON.stringify(requestData)
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || '파티 생성에 실패했습니다.')
        }

        const data = await response.json()
        onClose()
        if (onCreated) {
          onCreated(data.party.id)
        } else {
          router.push(`/party/${data.party.id}`)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : editMode ? '파티 수정에 실패했습니다.' : '파티 생성에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const updateSlotClass = (index: number, className: string | null) => {
    setSlots(prev => {
      const newSlots = [...prev]
      newSlots[index] = { ...newSlots[index], required_class: className }
      return newSlots
    })
  }

  if (!isOpen) return null

  const leaderIcon = selectedCharacter ? (CLASS_ICONS[selectedCharacter.character_class] || '👤') : '👤'

  // 작성 중인 내용이 있는지 확인
  const hasUnsavedChanges = title.trim() || description.trim() || selectedCharacter

  const handleCloseWithConfirm = () => {
    if (hasUnsavedChanges) {
      if (confirm('작성 중인 내용이 있습니다. 정말 닫으시겠습니까?')) {
        onClose()
      }
    } else {
      onClose()
    }
  }

  return (
    <div className={styles.overlay} onClick={handleCloseWithConfirm}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{editMode ? '파티 설정 수정' : '파티 모집 등록'}</h2>
          <button className={styles.closeButton} onClick={handleCloseWithConfirm}>×</button>
        </div>

        <form className={styles.modalContent} onSubmit={handleSubmit}>
          {/* 수정 모드: 파티장 정보 표시 */}
          {editMode && editData && (
            <div className={styles.editInfo}>
              <span className={styles.editLeader}>
                파티장: {editData.character_class} {editData.character_name}
              </span>
            </div>
          )}

          {/* 캐릭터 선택 섹션 - 생성 모드에서만 */}
          {!editMode && (
            <div className={styles.characterSection}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>파티장 캐릭터</span>
                {loadingCharacters && <span className={styles.loadingText}>불러오는 중...</span>}
              </div>
              {!loadingCharacters && characters.length === 0 ? (
                <div className={styles.emptyCharacter}>
                  등록된 캐릭터가 없습니다. 좌측 "내 모집 캐릭터"에서 먼저 등록해주세요.
                </div>
              ) : (
                <div className={styles.characterCards}>
                  {characters.map(char => {
                    const serverName = SERVERS.find(s => s.id === String(char.character_server_id))?.name || ''
                    const isSelected = selectedCharacter?.id === char.id
                    const classIcon = CLASS_ICONS[char.character_class] || '👤'
                    return (
                      <button
                        key={char.id}
                        type="button"
                        className={`${styles.characterCard} ${isSelected ? styles.selected : ''}`}
                        onClick={() => setSelectedCharacter(char)}
                      >
                        <div className={styles.cardIcon}>
                          {char.profile_image ? (
                            <img
                              src={char.profile_image}
                              alt={char.character_name}
                              className={styles.profileImage}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none'
                                const parent = (e.target as HTMLImageElement).parentElement
                                if (parent) {
                                  parent.textContent = classIcon
                                }
                              }}
                            />
                          ) : (
                            classIcon
                          )}
                        </div>
                        <div className={styles.cardInfo}>
                          <span className={styles.cardName}>{char.character_name}</span>
                          <span className={styles.cardMeta}>
                            {char.character_class} · {serverName}
                          </span>
                          {char.character_item_level && (
                            <span className={styles.cardStat}>아이템 {char.character_item_level}</span>
                          )}
                        </div>
                        {isSelected && <span className={styles.selectedCheck}>✓</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* 던전 선택 섹션 */}
          <div className={styles.section}>
            <div className={styles.dungeonTypes}>
              {DUNGEON_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  className={`${styles.typeButton} ${dungeonType === type.value ? styles.active : ''} ${type.value === 'pvp' ? styles.pvp : ''}`}
                  onClick={() => setDungeonType(type.value)}
                >
                  {type.label}
                </button>
              ))}
            </div>

            <div className={styles.dungeonRow}>
              {/* 원정: 타입 드롭다운 */}
              {dungeonType === 'expedition' && (
                <div className={styles.dungeonSelect}>
                  <label>타입</label>
                  <select
                    value={expeditionType}
                    onChange={e => setExpeditionType(e.target.value as 'exploration' | 'conquest')}
                  >
                    <option value="exploration">탐험</option>
                    <option value="conquest">정복</option>
                  </select>
                </div>
              )}

              {/* 원정 정복: 난이도 드롭다운 */}
              {dungeonType === 'expedition' && expeditionType === 'conquest' && (
                <div className={styles.dungeonSelect}>
                  <label>난이도</label>
                  <select
                    value={expeditionDifficulty}
                    onChange={e => setExpeditionDifficulty(e.target.value as 'normal' | 'hard')}
                  >
                    <option value="normal">보통</option>
                    <option value="hard">어려움</option>
                  </select>
                </div>
              )}

              {dungeons.length > 0 && (
                <div className={styles.dungeonSelect}>
                  <label>던전</label>
                  <select
                    value={selectedDungeon?.id || ''}
                    onChange={e => {
                      const dungeon = dungeons.find(d => d.id === e.target.value)
                      setSelectedDungeon(dungeon || null)
                    }}
                  >
                    {dungeons.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedDungeon?.tiers && (
                <div className={styles.tierSelect}>
                  <label>단계</label>
                  <div className={styles.tiers}>
                    {selectedDungeon.tiers.map(tier => (
                      <button
                        key={tier}
                        type="button"
                        className={`${styles.tierButton} ${selectedTier === tier ? styles.active : ''}`}
                        onClick={() => setSelectedTier(tier)}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.runCountSelect}>
                <label>횟수</label>
                <div className={styles.runCount}>
                  <button type="button" onClick={() => setRunCount(Math.max(1, runCount - 1))}>-</button>
                  <span>{runCount}회</span>
                  <button type="button" onClick={() => setRunCount(Math.min(10, runCount + 1))}>+</button>
                </div>
              </div>
            </div>
          </div>

          {/* 진행 방식 */}
          <div className={styles.section}>
            <div className={styles.scheduleRow}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  checked={isImmediate}
                  onChange={() => setIsImmediate(true)}
                />
                <span>⚡ 즉시 진행</span>
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  checked={!isImmediate}
                  onChange={() => setIsImmediate(false)}
                />
                <span>📅 예약 진행</span>
              </label>

              {!isImmediate && (
                <div className={styles.scheduleInputs}>
                  <div className={styles.dateChips}>
                    {getNext7Days().map(day => (
                      <button
                        key={day.date}
                        type="button"
                        className={`${styles.dateChip} ${scheduledDate === day.date ? styles.active : ''}`}
                        onClick={() => setScheduledDate(day.date)}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                  <div className={styles.timeSelectRow}>
                    <div className={styles.timeGroup}>
                      <select value={startHour} onChange={e => setStartHour(e.target.value)}>
                        {Array.from({ length: 24 }).map((_, i) => (
                          <option key={i} value={String(i).padStart(2, '0')}>
                            {i < 12 ? '오전' : '오후'} {i % 12 === 0 ? 12 : i % 12}시
                          </option>
                        ))}
                      </select>
                      <select value={startMinute} onChange={e => setStartMinute(e.target.value)}>
                        {['00', '10', '20', '30', '40', '50'].map(m => (
                          <option key={m} value={m}>{m}분</option>
                        ))}
                      </select>
                    </div>
                    <span>~</span>
                    <div className={styles.timeGroup}>
                      <select value={endHour} onChange={e => setEndHour(e.target.value)}>
                        {Array.from({ length: 24 }).map((_, i) => (
                          <option key={i} value={String(i).padStart(2, '0')}>
                            {i < 12 ? '오전' : '오후'} {i % 12 === 0 ? 12 : i % 12}시
                          </option>
                        ))}
                      </select>
                      <select value={endMinute} onChange={e => setEndMinute(e.target.value)}>
                        {['00', '10', '20', '30', '40', '50'].map(m => (
                          <option key={m} value={m}>{m}분</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2단 레이아웃: 파티 설정 | 스펙 조건 */}
          <div className={styles.twoColumn}>
            {/* 왼쪽: 파티 설정 - 생성 모드에서만 표시 */}
            {!editMode && (
              <div className={styles.columnLeft}>
                {/* 성역: 1팀/2팀 구분 */}
                {dungeonType === 'sanctuary' ? (
                  <div className={styles.sanctuarySlots}>
                    {/* 1팀 */}
                    <div className={styles.teamSection}>
                      <div className={styles.teamHeader}>1팀</div>
                      <div className={styles.slotsCompact}>
                        {slots.slice(0, 4).map((slot, index) => (
                          <div key={index} className={styles.slotRow}>
                            <span className={styles.slotLabel}>
                              슬롯{slot.slot_number}{index === 0 && '(나)'}:
                            </span>
                            {index === 0 ? (
                              <span className={styles.leaderSlot}>
                                {selectedCharacter
                                  ? `${leaderIcon} ${selectedCharacter.character_class} ${selectedCharacter.character_name}`
                                  : '캐릭터 선택'}
                              </span>
                            ) : (
                              <select
                                className={styles.slotSelect}
                                value={slot.required_class || ''}
                                onChange={e => updateSlotClass(index, e.target.value || null)}
                              >
                                <option value="">자유</option>
                                {CLASSES.map(cls => (
                                  <option key={cls.id} value={cls.name}>{cls.name}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* 2팀 */}
                    <div className={styles.teamSection}>
                      <div className={styles.teamHeader}>2팀</div>
                      <div className={styles.slotsCompact}>
                        {slots.slice(4, 8).map((slot, index) => (
                          <div key={index + 4} className={styles.slotRow}>
                            <span className={styles.slotLabel}>
                              슬롯{slot.slot_number}:
                            </span>
                            <select
                              className={styles.slotSelect}
                              value={slot.required_class || ''}
                              onChange={e => updateSlotClass(index + 4, e.target.value || null)}
                            >
                              <option value="">자유</option>
                              {CLASSES.map(cls => (
                                <option key={cls.id} value={cls.name}>{cls.name}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 일반 던전: 기존 4슬롯 */
                  <div className={styles.slotsCompact}>
                    {slots.slice(0, 4).map((slot, index) => (
                      <div key={index} className={styles.slotRow}>
                        <span className={styles.slotLabel}>
                          슬롯{slot.slot_number}{index === 0 && '(나)'}:
                        </span>
                        {index === 0 ? (
                          <span className={styles.leaderSlot}>
                            {selectedCharacter
                              ? `${leaderIcon} ${selectedCharacter.character_class} ${selectedCharacter.character_name}`
                              : '캐릭터 선택'}
                          </span>
                        ) : (
                          <select
                            className={styles.slotSelect}
                            value={slot.required_class || ''}
                            onChange={e => updateSlotClass(index, e.target.value || null)}
                          >
                            <option value="">자유</option>
                            {CLASSES.map(cls => (
                              <option key={cls.id} value={cls.name}>{cls.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 오른쪽: 스펙 조건 */}
            <div className={editMode ? styles.columnFull : styles.columnRight}>
              <div className={styles.specRow}>
                <label>
                  <input
                    type="checkbox"
                    checked={!!minItemLevel}
                    onChange={e => setMinItemLevel(e.target.checked ? 500 : undefined)}
                  />
                  <span>아이템레벨</span>
                </label>
                <input
                  type="number"
                  className={styles.specInput}
                  value={minItemLevel || ''}
                  onChange={e => setMinItemLevel(Number(e.target.value) || undefined)}
                  disabled={!minItemLevel}
                  placeholder="510"
                />
              </div>
              <div className={styles.specRow}>
                <label>
                  <input
                    type="checkbox"
                    checked={!!minBreakthrough}
                    onChange={e => setMinBreakthrough(e.target.checked ? 10 : undefined)}
                  />
                  <span>돌파횟수</span>
                </label>
                <input
                  type="number"
                  className={styles.specInput}
                  value={minBreakthrough || ''}
                  onChange={e => setMinBreakthrough(Number(e.target.value) || undefined)}
                  disabled={!minBreakthrough}
                  placeholder="15"
                />
              </div>
              <div className={styles.specRow}>
                <label>
                  <input
                    type="checkbox"
                    checked={!!minCombatPower}
                    onChange={e => setMinCombatPower(e.target.checked ? 100000 : undefined)}
                  />
                  <span>전투력</span>
                </label>
                <input
                  type="number"
                  className={styles.specInput}
                  value={minCombatPower || ''}
                  onChange={e => setMinCombatPower(Number(e.target.value) || undefined)}
                  disabled={!minCombatPower}
                  placeholder="140000"
                />
              </div>
            </div>
          </div>

          {/* 제목 */}
          <div className={styles.section}>
            <input
              type="text"
              className={styles.titleInput}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="제목: 초월 10단 3회 편하게~"
              maxLength={50}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          {/* 푸터 버튼 */}
          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>
              취소
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={submitting || (!editMode && (!selectedCharacter || loadingCharacters))}
            >
              {submitting ? (editMode ? '저장 중...' : '생성 중...') : (editMode ? '저장' : '파티 등록')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
