'use client'

import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import ContentCard from './ContentCard'
import OdEnergyBar from './OdEnergyBar'
import { getWeekKey, isEditable } from '../utils/dateUtils'
import styles from './DungeonContentSection.module.css'

interface Boss {
  id: string
  name: string
  imageUrl: string
  kina?: number
}

interface Tier {
  tier: number
  kina: number
}

interface Category {
  id: string
  name: string
  bosses: Boss[]
}

interface DungeonData {
  transcend: {
    maxTickets: number
    bosses: Boss[]
    tiers: Tier[]
  }
  expedition: {
    maxTickets: number
    categories: Category[]
  }
  sanctuary: {
    maxTickets: number
    categories: Category[]
  }
}

interface ContentRecord {
  id: string
  bossName: string
  tier?: number
  category?: string
  count: number
  kina: number
  usedFromBonus?: number  // 충전권에서 사용한 횟수
}

interface DungeonContentSectionProps {
  characterId: string | null
  selectedDate: string
  getAuthHeader?: () => Record<string, string>
  baseTickets?: {
    transcend: number
    expedition: number
    sanctuary: number
  }
  bonusTickets?: {
    transcend: number
    expedition: number
    sanctuary: number
  }
  onBaseTicketsChange?: (updates: Record<string, number>) => void
  onBonusTicketsChange?: (updates: Record<string, number>) => void
  odEnergy?: {
    timeEnergy: number
    ticketEnergy: number
    nextChargeIn: number
  }
  onOdEnergyDeduct?: (amount: number) => boolean
  onOdEnergyRestore?: (amount: number) => void
  onTotalKinaChange?: (totalKina: number) => void
}

function DungeonContentSection({
  characterId,
  selectedDate,
  getAuthHeader,
  baseTickets = { transcend: 14, expedition: 21, sanctuary: 4 },
  bonusTickets = { transcend: 0, expedition: 0, sanctuary: 0 },
  onBaseTicketsChange,
  onBonusTicketsChange,
  odEnergy = { timeEnergy: 840, ticketEnergy: 0, nextChargeIn: 30 },
  onOdEnergyDeduct,
  onOdEnergyRestore,
  onTotalKinaChange
}: DungeonContentSectionProps) {
  // 로딩 상태 (로딩 중에는 저장 안 함)
  const isLoadingRef = useRef(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const selectionsLoadedRef = useRef(false)
  const lastLoadedRef = useRef<string | null>(null) // 중복 호출 방지

  // onTotalKinaChange ref (인라인 함수로 전달되면 무한 루프 방지용)
  // 실제 호출은 debouncedSave에서 DB 저장 완료 후 수행
  const onTotalKinaChangeRef = useRef(onTotalKinaChange)
  onTotalKinaChangeRef.current = onTotalKinaChange

  // 주간 키 계산 (수요일 5시 기준)
  const weekKey = useMemo(() => getWeekKey(new Date(selectedDate)), [selectedDate])

  // 수정 가능 여부 (이틀 전까지만)
  const canEdit = useMemo(() => isEditable(selectedDate), [selectedDate])

  const [dungeonData, setDungeonData] = useState<DungeonData | null>(null)

  // 접기/펼치기 상태 (UI 상태라 localStorage 유지)
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dungeonCardsCollapsed')
      return saved ? JSON.parse(saved) : {}
    }
    return {}
  })

  // 초월 상태
  const [transcendTickets, setTranscendTickets] = useState({ base: baseTickets.transcend || 14, bonus: bonusTickets.transcend || 0 })
  const [transcendDouble, setTranscendDouble] = useState(false)
  const [transcendBoss, setTranscendBoss] = useState('')
  const [transcendTier, setTranscendTier] = useState(1)
  const [transcendRecords, setTranscendRecords] = useState<ContentRecord[]>([])

  // 원정 상태
  const [expeditionTickets, setExpeditionTickets] = useState({ base: baseTickets.expedition || 21, bonus: bonusTickets.expedition || 0 })
  const [expeditionDouble, setExpeditionDouble] = useState(false)
  const [expeditionCategory, setExpeditionCategory] = useState('')
  const [expeditionBoss, setExpeditionBoss] = useState('')
  const [expeditionRecords, setExpeditionRecords] = useState<ContentRecord[]>([])

  // 성역 상태
  const [sanctuaryTickets, setSanctuaryTickets] = useState({ base: baseTickets.sanctuary || 4, bonus: bonusTickets.sanctuary || 0 })
  const [sanctuaryDouble, setSanctuaryDouble] = useState(false)
  const [sanctuaryBoss, setSanctuaryBoss] = useState('')
  const [sanctuaryRecords, setSanctuaryRecords] = useState<ContentRecord[]>([])

  // props 변경 시 티켓 state 동기화
  useEffect(() => {
    setTranscendTickets({ base: baseTickets.transcend, bonus: bonusTickets.transcend })
    setExpeditionTickets({ base: baseTickets.expedition, bonus: bonusTickets.expedition })
    setSanctuaryTickets({ base: baseTickets.sanctuary, bonus: bonusTickets.sanctuary })
  }, [baseTickets.transcend, baseTickets.expedition, baseTickets.sanctuary, bonusTickets.transcend, bonusTickets.expedition, bonusTickets.sanctuary])

  // DB에서 던전 기록 로드
  const loadFromDatabase = useCallback(async () => {
    if (!characterId || !getAuthHeader) return null

    try {
      const res = await fetch(
        `/api/ledger/dungeon-records?characterId=${characterId}&date=${selectedDate}`,
        { headers: getAuthHeader() }
      )

      if (!res.ok) {
        if (res.status === 404) return null
        throw new Error('Failed to load dungeon records')
      }

      return await res.json()
    } catch (err) {
      console.error('Failed to load dungeon records from DB:', err)
      return null
    }
  }, [characterId, selectedDate, getAuthHeader])

  // DB에 던전 기록 저장
  const saveToDatabase = useCallback(async () => {
    if (!characterId || !getAuthHeader || isLoadingRef.current || !canEdit) return

    try {
      await fetch('/api/ledger/dungeon-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          characterId,
          date: selectedDate,
          transcendRecords,
          expeditionRecords,
          sanctuaryRecords,
          transcendDouble,
          expeditionDouble,
          sanctuaryDouble
        })
      })
    } catch (err) {
      console.error('Failed to save dungeon records to DB:', err)
    }
  }, [characterId, selectedDate, getAuthHeader, canEdit, transcendRecords, expeditionRecords, sanctuaryRecords, transcendDouble, expeditionDouble, sanctuaryDouble])

  // DB에 선택 정보 저장
  const saveSelectionsToDatabase = useCallback(async () => {
    if (!characterId || !getAuthHeader || !selectionsLoadedRef.current) return
    if (!transcendBoss && !expeditionBoss && !sanctuaryBoss) return

    try {
      await fetch('/api/ledger/dungeon-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          characterId,
          selections: {
            transcendBoss,
            transcendTier,
            expeditionCategory,
            expeditionBoss,
            sanctuaryBoss
          }
        })
      })
    } catch (err) {
      console.error('Failed to save dungeon selections to DB:', err)
    }
  }, [characterId, getAuthHeader, transcendBoss, transcendTier, expeditionCategory, expeditionBoss, sanctuaryBoss])

  // 디바운스된 저장 (UI는 즉시 업데이트, DB 저장은 디바운스)
  const debouncedSave = useCallback(() => {
    // UI 즉시 업데이트 (낙관적 업데이트)
    if (onTotalKinaChangeRef.current) {
      const totalKina =
        transcendRecords.reduce((sum, r) => sum + (r.kina || 0), 0) +
        expeditionRecords.reduce((sum, r) => sum + (r.kina || 0), 0) +
        sanctuaryRecords.reduce((sum, r) => sum + (r.kina || 0), 0)
      onTotalKinaChangeRef.current(totalKina)
    }

    // DB 저장은 디바운스
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(async () => {
      await saveToDatabase()
    }, 100)
  }, [saveToDatabase, transcendRecords, expeditionRecords, sanctuaryRecords])

  // 기록 불러오기 (캐릭터/날짜 변경 시)
  useEffect(() => {
    // 중복 호출 방지: 같은 캐릭터+날짜 조합이면 스킵
    const loadKey = `${characterId}-${selectedDate}`
    if (lastLoadedRef.current === loadKey) {
      return
    }

    isLoadingRef.current = true

    if (!characterId) {
      setTranscendRecords([])
      setExpeditionRecords([])
      setSanctuaryRecords([])
      setTranscendDouble(false)
      setExpeditionDouble(false)
      setSanctuaryDouble(false)
      isLoadingRef.current = false
      lastLoadedRef.current = null
      return
    }

    lastLoadedRef.current = loadKey

    // 기록 초기화
    setTranscendRecords([])
    setExpeditionRecords([])
    setSanctuaryRecords([])
    setTranscendDouble(false)
    setExpeditionDouble(false)
    setSanctuaryDouble(false)

    const loadData = async () => {
      const data = await loadFromDatabase()

      if (data?.records) {
        if (data.records.transcend) setTranscendRecords(data.records.transcend)
        if (data.records.expedition) setExpeditionRecords(data.records.expedition)
        if (data.records.sanctuary) setSanctuaryRecords(data.records.sanctuary)
        if (data.records.transcendDouble !== undefined) setTranscendDouble(data.records.transcendDouble)
        if (data.records.expeditionDouble !== undefined) setExpeditionDouble(data.records.expeditionDouble)
        if (data.records.sanctuaryDouble !== undefined) setSanctuaryDouble(data.records.sanctuaryDouble)
      }

      if (data?.selections) {
        if (data.selections.transcendBoss) setTranscendBoss(data.selections.transcendBoss)
        if (data.selections.transcendTier) setTranscendTier(data.selections.transcendTier)
        if (data.selections.expeditionCategory) setExpeditionCategory(data.selections.expeditionCategory)
        if (data.selections.expeditionBoss) setExpeditionBoss(data.selections.expeditionBoss)
        if (data.selections.sanctuaryBoss) setSanctuaryBoss(data.selections.sanctuaryBoss)
      }

      setTimeout(() => {
        isLoadingRef.current = false
        selectionsLoadedRef.current = true
      }, 100)
    }

    loadData()
  }, [characterId, selectedDate, loadFromDatabase])

  // 기록 변경 시 DB 저장 (디바운스)
  useEffect(() => {
    if (!characterId || isLoadingRef.current || !canEdit) return
    debouncedSave()
  }, [characterId, canEdit, transcendRecords, expeditionRecords, sanctuaryRecords, transcendDouble, expeditionDouble, sanctuaryDouble, debouncedSave])

  // 선택 정보 변경 시 DB 저장
  useEffect(() => {
    if (!characterId || !selectionsLoadedRef.current) return
    saveSelectionsToDatabase()
  }, [characterId, transcendBoss, transcendTier, expeditionCategory, expeditionBoss, sanctuaryBoss, saveSelectionsToDatabase])

  // DB에 키나 정보 저장 (content-records API)
  useEffect(() => {
    if (!characterId || !getAuthHeader || isLoadingRef.current) return

    const transcendKina = transcendRecords.reduce((sum, r) => sum + (r.kina || 0), 0)
    const expeditionKina = expeditionRecords.reduce((sum, r) => sum + (r.kina || 0), 0)
    const sanctuaryKina = sanctuaryRecords.reduce((sum, r) => sum + (r.kina || 0), 0)

    const saveToContentRecords = async (contentType: string, kina: number, count: number) => {
      try {
        await fetch('/api/ledger/content-records', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
          },
          body: JSON.stringify({
            characterId,
            date: selectedDate,
            content_type: contentType,
            dungeon_tier: contentType,
            max_count: count,
            completion_count: count,
            is_double: false,
            base_kina: count > 0 ? Math.round(kina / count) : 0
          })
        })
      } catch (err) {
        console.error(`Failed to save ${contentType} to content-records:`, err)
      }
    }

    // 3개 컨텐츠 동시 저장 (병렬 처리)
    Promise.all([
      saveToContentRecords('transcend', transcendKina, transcendRecords.length),
      saveToContentRecords('expedition', expeditionKina, expeditionRecords.length),
      saveToContentRecords('sanctuary', sanctuaryKina, sanctuaryRecords.length)
    ]).catch(err => console.error('Failed to save content records:', err))
  }, [transcendRecords, expeditionRecords, sanctuaryRecords, characterId, selectedDate, getAuthHeader])

  // 컴포넌트 언마운트 시 타임아웃 정리
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // 던전 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/ledger/dungeon-data')
        const data = await res.json()

        // 초월 데이터 변환
        const transcendData = {
          maxTickets: data.transcend.maxTickets,
          bosses: data.transcend.bosses,
          tiers: data.transcend.bosses[0].tiers
        }

        // 원정 데이터 변환
        const expeditionData = {
          maxTickets: data.expedition.maxTickets,
          categories: data.expedition.categories
        }

        // 성역 데이터 변환
        const sanctuaryData = {
          maxTickets: data.sanctuary.maxTickets,
          categories: data.sanctuary.categories
        }

        setDungeonData({
          transcend: transcendData,
          expedition: expeditionData,
          sanctuary: sanctuaryData
        })

        // DB에서 선택값을 불러온 후 없으면 기본값 설정
        setTimeout(() => {
          if (transcendData.bosses.length > 0 && !transcendBoss) {
            setTranscendBoss(transcendData.bosses[0].id)
          }
          if (expeditionData.categories.length > 0 && !expeditionCategory) {
            setExpeditionCategory(expeditionData.categories[0].id)
            if (expeditionData.categories[0].bosses.length > 0 && !expeditionBoss) {
              setExpeditionBoss(expeditionData.categories[0].bosses[0].id)
            }
          }
          if (sanctuaryData.categories.length > 0 && sanctuaryData.categories[0].bosses.length > 0 && !sanctuaryBoss) {
            setSanctuaryBoss(sanctuaryData.categories[0].bosses[0].id)
          }
        }, 200)
      } catch (error) {
        console.error('Failed to load dungeon data:', error)
      }
    }

    fetchData()
  }, [])

  // 초월 기록 추가
  const handleAddTranscendRecord = (record: Omit<ContentRecord, 'id'>) => {
    setTranscendRecords(prev => {
      const existing = prev.find(
        r => r.bossName === record.bossName && r.tier === record.tier
      )

      if (existing) {
        return prev.map(r =>
          r.id === existing.id
            ? {
              ...r,
              count: r.count + record.count,
              kina: r.kina + record.kina,
              usedFromBonus: (r.usedFromBonus || 0) + (record.usedFromBonus || 0)
            }
            : r
        )
      } else {
        return [...prev, { ...record, id: Date.now().toString() }]
      }
    })
  }

  // 초월 기록 삭제
  const handleDeleteTranscendRecord = (recordId: string, count: number) => {
    setTranscendRecords(prev => prev.filter(r => r.id !== recordId))
  }

  // 원정 기록 추가
  const handleAddExpeditionRecord = (record: Omit<ContentRecord, 'id'>) => {
    setExpeditionRecords(prev => {
      const existing = prev.find(
        r => r.bossName === record.bossName && r.category === record.category
      )

      if (existing) {
        return prev.map(r =>
          r.id === existing.id
            ? {
              ...r,
              count: r.count + record.count,
              kina: r.kina + record.kina,
              usedFromBonus: (r.usedFromBonus || 0) + (record.usedFromBonus || 0)
            }
            : r
        )
      } else {
        return [...prev, { ...record, id: Date.now().toString() }]
      }
    })
  }

  // 원정 기록 삭제
  const handleDeleteExpeditionRecord = (recordId: string, count: number) => {
    setExpeditionRecords(prev => prev.filter(r => r.id !== recordId))
  }

  // 카테고리 변경 시 보스 초기화
  const handleExpeditionCategoryChange = (categoryId: string) => {
    setExpeditionCategory(categoryId)
    const category = dungeonData?.expedition.categories.find(c => c.id === categoryId)
    if (category && category.bosses.length > 0) {
      setExpeditionBoss(category.bosses[0].id)
    }
  }

  // 성역 기록 추가
  const handleAddSanctuaryRecord = (record: Omit<ContentRecord, 'id'>) => {
    setSanctuaryRecords(prev => {
      const existing = prev.find(r => r.bossName === record.bossName)

      if (existing) {
        return prev.map(r =>
          r.id === existing.id
            ? {
              ...r,
              count: r.count + record.count,
              kina: r.kina + record.kina,
              usedFromBonus: (r.usedFromBonus || 0) + (record.usedFromBonus || 0)
            }
            : r
        )
      } else {
        return [...prev, { ...record, id: Date.now().toString() }]
      }
    })
  }

  // 성역 기록 삭제
  const handleDeleteSanctuaryRecord = (recordId: string, count: number) => {
    setSanctuaryRecords(prev => prev.filter(r => r.id !== recordId))
  }

  // 카드 접기/펼치기 토글 (UI 상태라 localStorage 유지)
  const toggleCardCollapse = (cardId: string) => {
    setCollapsedCards(prev => {
      const newState = {
        ...prev,
        [cardId]: !prev[cardId]
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('dungeonCardsCollapsed', JSON.stringify(newState))
      }
      return newState
    })
  }

  if (!dungeonData) {
    return <div className={styles.loading}>던전 데이터를 불러오는 중...</div>
  }

  // 현재 선택된 카테고리의 보스 목록
  const currentExpeditionBosses = dungeonData.expedition.categories.find(
    c => c.id === expeditionCategory
  )?.bosses || []

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>초월/원정/성역</h2>
        <OdEnergyBar
          timeEnergy={odEnergy.timeEnergy}
          ticketEnergy={odEnergy.ticketEnergy}
          maxTimeEnergy={840}
          maxTicketEnergy={2000}
        />
      </div>

      {/* 초월 카드 */}
      <ContentCard
        contentType="transcend"
        title="초월"
        maxTickets={dungeonData.transcend.maxTickets}
        currentTickets={transcendTickets.base}
        bonusTickets={bonusTickets.transcend}
        onTicketsChange={(base, bonus) => {
          setTranscendTickets({ base, bonus })
          if (onBaseTicketsChange) {
            onBaseTicketsChange({ transcend: base })
          }
          if (onBonusTicketsChange) {
            onBonusTicketsChange({ transcend: bonus })
          }
        }}
        bossOptions={dungeonData.transcend.bosses}
        tierOptions={dungeonData.transcend.tiers}
        isDoubleReward={transcendDouble}
        onDoubleToggle={() => setTranscendDouble(!transcendDouble)}
        records={transcendRecords}
        onAddRecord={handleAddTranscendRecord}
        onDeleteRecord={handleDeleteTranscendRecord}
        selectedBoss={transcendBoss}
        selectedTier={transcendTier}
        onBossChange={setTranscendBoss}
        onTierChange={setTranscendTier}
        collapsed={collapsedCards['transcend']}
        onToggleCollapse={() => toggleCardCollapse('transcend')}
        onOdEnergyDeduct={onOdEnergyDeduct}
        onOdEnergyRestore={onOdEnergyRestore}
        readOnly={!canEdit}
      />

      {/* 원정 카드 */}
      <ContentCard
        contentType="expedition"
        title="원정"
        maxTickets={dungeonData.expedition.maxTickets}
        currentTickets={expeditionTickets.base}
        bonusTickets={bonusTickets.expedition}
        onTicketsChange={(base, bonus) => {
          setExpeditionTickets({ base, bonus })
          if (onBaseTicketsChange) {
            onBaseTicketsChange({ expedition: base })
          }
          if (onBonusTicketsChange) {
            onBonusTicketsChange({ expedition: bonus })
          }
        }}
        bossOptions={currentExpeditionBosses}
        categoryOptions={dungeonData.expedition.categories}
        isDoubleReward={expeditionDouble}
        onDoubleToggle={() => setExpeditionDouble(!expeditionDouble)}
        records={expeditionRecords}
        onAddRecord={handleAddExpeditionRecord}
        onDeleteRecord={handleDeleteExpeditionRecord}
        selectedBoss={expeditionBoss}
        selectedCategory={expeditionCategory}
        onBossChange={setExpeditionBoss}
        onCategoryChange={handleExpeditionCategoryChange}
        collapsed={collapsedCards['expedition']}
        onToggleCollapse={() => toggleCardCollapse('expedition')}
        onOdEnergyDeduct={onOdEnergyDeduct}
        onOdEnergyRestore={onOdEnergyRestore}
        readOnly={!canEdit}
      />

      {/* 성역 카드 (심연의 재련: 루드라) */}
      <ContentCard
        contentType="sanctuary"
        title="심연의 재련: 루드라"
        maxTickets={dungeonData.sanctuary.maxTickets}
        currentTickets={sanctuaryTickets.base}
        bonusTickets={bonusTickets.sanctuary}
        onTicketsChange={(base, bonus) => {
          setSanctuaryTickets({ base, bonus })
          if (onBaseTicketsChange) {
            onBaseTicketsChange({ sanctuary: base })
          }
          if (onBonusTicketsChange) {
            onBonusTicketsChange({ sanctuary: bonus })
          }
        }}
        bossOptions={dungeonData.sanctuary.categories[0].bosses}
        categoryOptions={dungeonData.sanctuary.categories}
        isDoubleReward={sanctuaryDouble}
        onDoubleToggle={() => setSanctuaryDouble(!sanctuaryDouble)}
        records={sanctuaryRecords}
        onAddRecord={handleAddSanctuaryRecord}
        onDeleteRecord={handleDeleteSanctuaryRecord}
        selectedBoss={sanctuaryBoss}
        onBossChange={setSanctuaryBoss}
        collapsed={collapsedCards['sanctuary']}
        onToggleCollapse={() => toggleCardCollapse('sanctuary')}
        onOdEnergyDeduct={onOdEnergyDeduct}
        onOdEnergyRestore={onOdEnergyRestore}
        readOnly={!canEdit}
      />
    </section>
  )
}

// React.memo를 적용하여 props가 변경되지 않으면 리렌더링 방지
export default memo(DungeonContentSection)
