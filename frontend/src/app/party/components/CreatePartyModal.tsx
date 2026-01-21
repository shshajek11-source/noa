'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMyCharacters } from '@/hooks/useMyCharacters'
import { useAuth } from '@/context/AuthContext'
import type { DungeonType, CreatePartyRequest, PartyUserCharacter } from '@/types/party'
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

export default function CreatePartyModal({ isOpen, onClose, onCreated }: CreatePartyModalProps) {
  const router = useRouter()
  const { session } = useAuth()
  const { characters, loading: loadingCharacters } = useMyCharacters({ accessToken: session?.access_token })

  const [dungeonType, setDungeonType] = useState<DungeonType>('transcend')
  const [dungeons, setDungeons] = useState<DungeonData[]>([])
  const [selectedDungeon, setSelectedDungeon] = useState<DungeonData | null>(null)
  const [selectedTier, setSelectedTier] = useState<number>(1)
  const [isImmediate, setIsImmediate] = useState(true)
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTimeStart, setScheduledTimeStart] = useState('21:00')
  const [scheduledTimeEnd, setScheduledTimeEnd] = useState('23:00')
  const [runCount, setRunCount] = useState(1)
  const [minItemLevel, setMinItemLevel] = useState<number | undefined>()
  const [minBreakthrough, setMinBreakthrough] = useState<number | undefined>()
  const [minCombatPower, setMinCombatPower] = useState<number | undefined>()
  const [joinType, setJoinType] = useState<'approval' | 'first_come'>('approval')
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
          // 원정: categories 배열 -> 각 카테고리 안에 bosses 배열
          data.expedition.categories.forEach((cat: { id: string; name: string; bosses: { id: string; name: string }[] }) => {
            cat.bosses.forEach(boss => {
              dungeonList.push({
                id: boss.id,
                name: boss.name,
                category: cat.name  // 카테고리명 (탐험, 정복 보통, 정복 어려움)
              })
            })
          })
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
          setSelectedDungeon(dungeonList[0])
        }
      })
      .catch(err => console.error('Failed to load dungeon data:', err))
  }, [dungeonType, isOpen])

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

    if (!selectedCharacter) {
      setError('캐릭터를 선택해주세요.')
      return
    }

    if (!selectedDungeon) {
      setError('던전을 선택해주세요.')
      return
    }

    if (!title.trim()) {
      setError('제목을 입력해주세요.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // ledger_device_id 키 사용 (useMyCharacters와 동일)
      let deviceId = localStorage.getItem('ledger_device_id')
      if (!deviceId) {
        deviceId = crypto.randomUUID()
        localStorage.setItem('ledger_device_id', deviceId)
      }

      const requestData: CreatePartyRequest = {
        title: title.trim(),
        description: description.trim() || undefined,
        dungeon_type: dungeonType,
        dungeon_id: selectedDungeon.id,
        dungeon_name: selectedDungeon.name,
        dungeon_tier: selectedDungeon.tiers ? selectedTier : undefined,
        is_immediate: isImmediate,
        scheduled_date: !isImmediate ? scheduledDate : undefined,
        scheduled_time_start: !isImmediate ? scheduledTimeStart : undefined,
        scheduled_time_end: !isImmediate ? scheduledTimeEnd : undefined,
        run_count: runCount,
        max_members: maxMembers,
        join_type: joinType,
        min_item_level: minItemLevel,
        min_breakthrough: minBreakthrough,
        min_combat_power: minCombatPower,
        character_name: selectedCharacter.character_name,
        character_class: selectedCharacter.character_class,
        character_server_id: selectedCharacter.character_server_id,
        character_level: selectedCharacter.character_level,
        character_item_level: selectedCharacter.character_item_level,
        character_breakthrough: selectedCharacter.character_breakthrough,
        character_combat_power: selectedCharacter.character_combat_power,
        slots: slots.map(s => ({
          ...s,
          required_class: s.required_class || undefined
        }))
      }

      const response = await fetch('/api/party', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-ID': deviceId
        },
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
    } catch (err) {
      setError(err instanceof Error ? err.message : '파티 생성에 실패했습니다.')
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

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>파티 모집 등록</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <form className={styles.modalContent} onSubmit={handleSubmit}>
          {/* 캐릭터 선택 섹션 */}
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
                      <div className={styles.cardIcon}>{classIcon}</div>
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
                        {d.category ? `[${d.category}] ${d.name}` : d.name}
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
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={e => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <input
                    type="time"
                    value={scheduledTimeStart}
                    onChange={e => setScheduledTimeStart(e.target.value)}
                  />
                  <span>~</span>
                  <input
                    type="time"
                    value={scheduledTimeEnd}
                    onChange={e => setScheduledTimeEnd(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 2단 레이아웃: 파티 설정 | 스펙 조건 */}
          <div className={styles.twoColumn}>
            {/* 왼쪽: 파티 설정 */}
            <div className={styles.columnLeft}>
              <div className={styles.joinTypeRow}>
                <span>참가:</span>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    checked={joinType === 'approval'}
                    onChange={() => setJoinType('approval')}
                  />
                  <span>승인제</span>
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    checked={joinType === 'first_come'}
                    onChange={() => setJoinType('first_come')}
                  />
                  <span>선착순</span>
                </label>
              </div>

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

            {/* 오른쪽: 스펙 조건 */}
            <div className={styles.columnRight}>
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

          {/* 제목/설명 */}
          <div className={styles.section}>
            <input
              type="text"
              className={styles.titleInput}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="제목: 초월 10단 3회 편하게~"
              maxLength={50}
            />
            <input
              type="text"
              className={styles.descInput}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="설명 (선택): ㄴㅇㄹ 필수"
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
              disabled={submitting || !selectedCharacter || loadingCharacters}
            >
              {submitting ? '생성 중...' : '파티 등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
