'use client'

import { useEffect, useRef, useMemo, useCallback, memo } from 'react'
import DailyContentCard from './DailyContentCard'
import { useDailyContent } from '../hooks/useDailyContent'
import { isEditable } from '../utils/dateUtils'
import styles from './DailyContentSection.module.css'

interface DailyContentSectionProps {
  characterId: string | null
  selectedDate: string
  getAuthHeader: () => Record<string, string>
  baseTickets?: {
    daily_dungeon: number
    awakening: number
    nightmare: number
    dimension: number
    subjugation: number
  }
  bonusTickets?: {
    daily_dungeon: number
    awakening: number
    nightmare: number
    dimension: number
    subjugation: number
  }
  onBaseTicketsChange?: (updates: Record<string, number>) => void
  onBonusTicketsChange?: (updates: Record<string, number>) => void
  onIncomeChange?: () => void  // 수입 변경 시 호출 (통계 갱신용)
  // 초기설정 동기화용
  initialSyncTickets?: {
    daily_dungeon: number
    awakening: number
    nightmare: number
    dimension: number
    subjugation: number
  }
  onInitialSyncComplete?: () => void
}

function DailyContentSection({
  characterId,
  selectedDate,
  getAuthHeader,
  baseTickets = {
    daily_dungeon: 7,
    awakening: 3,
    nightmare: 14,
    dimension: 14,
    subjugation: 3
  },
  bonusTickets = {
    daily_dungeon: 0,
    awakening: 0,
    nightmare: 0,
    dimension: 0,
    subjugation: 0
  },
  onBaseTicketsChange,
  onBonusTicketsChange,
  onIncomeChange,
  initialSyncTickets,
  onInitialSyncComplete
}: DailyContentSectionProps) {
  const { contents, loading, error, handleIncrement, handleDecrement, updateRemainingCounts, forceSync } = useDailyContent(characterId, selectedDate, getAuthHeader)

  // 수정 가능 여부 (당일만)
  const canEdit = useMemo(() => isEditable(selectedDate), [selectedDate])

  // 이전 baseTickets 값 저장
  const prevBaseTicketsRef = useRef<typeof baseTickets | null>(null)

  // 초기설정 동기화 (강제 적용)
  useEffect(() => {
    if (initialSyncTickets && characterId) {
      console.log('[DailyContentSection] 초기설정 동기화:', initialSyncTickets)
      const syncData: Record<string, number> = {
        daily_dungeon: initialSyncTickets.daily_dungeon,
        awakening_battle: initialSyncTickets.awakening,
        nightmare: initialSyncTickets.nightmare,
        dimension_invasion: initialSyncTickets.dimension,
        subjugation: initialSyncTickets.subjugation
      }
      forceSync(syncData)
      // prevBaseTicketsRef도 업데이트하여 이후 자동충전 로직이 정상 작동하도록
      prevBaseTicketsRef.current = { ...baseTickets, ...initialSyncTickets }
      onInitialSyncComplete?.()
    }
  }, [initialSyncTickets, characterId])

  // 자동 충전 시에만 updateRemainingCounts 호출 (값이 증가했을 때만)
  useEffect(() => {
    if (!prevBaseTicketsRef.current) {
      // 최초 로드 시에는 저장만 하고 업데이트 안 함
      prevBaseTicketsRef.current = { ...baseTickets }
      return
    }

    // 이전 값보다 증가한 항목만 업데이트
    const updates: Record<string, number> = {}
    let hasUpdate = false

    if (baseTickets.daily_dungeon > prevBaseTicketsRef.current.daily_dungeon) {
      updates.daily_dungeon = baseTickets.daily_dungeon
      hasUpdate = true
    }
    if (baseTickets.awakening > prevBaseTicketsRef.current.awakening) {
      updates.awakening_battle = baseTickets.awakening
      hasUpdate = true
    }
    if (baseTickets.nightmare > prevBaseTicketsRef.current.nightmare) {
      updates.nightmare = baseTickets.nightmare
      hasUpdate = true
    }
    if (baseTickets.dimension > prevBaseTicketsRef.current.dimension) {
      updates.dimension_invasion = baseTickets.dimension
      hasUpdate = true
    }
    if (baseTickets.subjugation > prevBaseTicketsRef.current.subjugation) {
      updates.subjugation = baseTickets.subjugation
      hasUpdate = true
    }

    if (hasUpdate) {
      updateRemainingCounts(updates)
    }

    prevBaseTicketsRef.current = { ...baseTickets }
  }, [baseTickets, updateRemainingCounts])

  // ID → bonusTickets 키 매핑
  const bonusKeyMap: Record<string, keyof typeof bonusTickets> = {
    'daily_dungeon': 'daily_dungeon',
    'awakening_battle': 'awakening',
    'nightmare': 'nightmare',
    'dimension_invasion': 'dimension',
    'subjugation': 'subjugation'
  }

  // + 버튼 클릭 래퍼: 충전권 차감 처리
  const handleIncrementWithBonus = useCallback((id: string) => {
    const content = contents.find(c => c.id === id)
    if (!content) return

    const bonusKey = bonusKeyMap[id]
    if (!bonusKey) return

    // 현재 상태 계산
    const baseRemaining = Math.max(0, content.maxCount - content.completionCount)
    const usedFromBonus = Math.max(0, content.completionCount - content.maxCount)
    const currentBonus = bonusTickets[bonusKey] || 0
    const bonusRemaining = Math.max(0, currentBonus - usedFromBonus)

    // 기본 잔여가 0이고 충전권 잔여가 있으면 충전권 차감
    if (baseRemaining === 0 && bonusRemaining > 0 && onBonusTicketsChange) {
      onBonusTicketsChange({ [bonusKey]: currentBonus - 1 })
    }

    // 원래 증가 로직 실행
    handleIncrement(id)
    // 통계 갱신 트리거
    onIncomeChange?.()
  }, [contents, bonusTickets, handleIncrement, onBonusTicketsChange, onIncomeChange])

  // - 버튼 클릭 래퍼: 충전권 복구 처리
  const handleDecrementWithBonus = useCallback((id: string) => {
    const content = contents.find(c => c.id === id)
    if (!content) return

    const bonusKey = bonusKeyMap[id]
    if (!bonusKey) return

    // 현재 completionCount가 maxCount를 초과한 경우에만 충전권 복구
    // (즉, 충전권을 사용한 상태에서 - 를 누른 경우)
    if (content.completionCount > content.maxCount && onBonusTicketsChange) {
      const currentBonus = bonusTickets[bonusKey] || 0
      onBonusTicketsChange({ [bonusKey]: currentBonus + 1 })
    }

    // 원래 감소 로직 실행
    handleDecrement(id)
    // 통계 갱신 트리거
    onIncomeChange?.()
  }, [contents, bonusTickets, handleDecrement, onBonusTicketsChange, onIncomeChange])

  // 보너스 티켓이 적용된 컨텐츠 목록
  const contentsWithBonus = contents.map(content => {
    const bonusMap: Record<string, number> = {
      '일일던전': bonusTickets.daily_dungeon,
      '각성전': bonusTickets.awakening,
      '악몽': bonusTickets.nightmare,
      '차원침공': bonusTickets.dimension,
      '토벌전': bonusTickets.subjugation
    }

    return {
      ...content,
      bonusCount: bonusMap[content.name] || 0
    }
  })

  if (loading) {
    return (
      <section className={styles.section}>
        <div className={styles.loading}>주간 컨텐츠 정보를 불러오는 중...</div>
      </section>
    )
  }

  if (error) {
    return (
      <section className={styles.section}>
        <div className={styles.error}>{error}</div>
      </section>
    )
  }

  return (
    <section className={styles.section}>
      <div className={styles.grid}>
        {contentsWithBonus.map((content) => (
          <DailyContentCard
            key={content.id}
            content={content}
            onIncrement={handleIncrementWithBonus}
            onDecrement={handleDecrementWithBonus}
            readOnly={!canEdit}
          />
        ))}
      </div>
    </section>
  )
}

// React.memo를 적용하여 props가 변경되지 않으면 리렌더링 방지
export default memo(DailyContentSection)
