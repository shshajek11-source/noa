'use client'

import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import ProgressBar from './ProgressBar'
import ShugoFestaCard from './ShugoFestaCard'
import AbyssHallwayCard from './AbyssHallwayCard'
import { getWeekKey, getGameDate, isEditable } from '../utils/dateUtils'
import { useDeviceId } from '../hooks'
import styles from './WeeklyContentSection.module.css'

interface WeeklyContentSectionProps {
  characterId: string | null
  selectedDate: string
  shugoInitialSync?: number // 초기설정에서 전달된 슈고페스타 횟수
  onShugoSyncComplete?: () => void // 동기화 완료 콜백
  shugoBonusCharge?: number // 이용권 충전에서 전달된 보너스 충전 횟수
  onShugoBonusChargeComplete?: () => void // 보너스 충전 완료 콜백
}

const DEFAULT_ABYSS_REGIONS = [
  { id: 'ereshrantas_root', name: '에렌슈란타의 뿌리', enabled: false },
  { id: 'siels_wing', name: '시엘의 날개군도', enabled: false },
  { id: 'sulfur_tree', name: '유황나무섬', enabled: false }
]

function WeeklyContentSection({ characterId, selectedDate, shugoInitialSync, onShugoSyncComplete, shugoBonusCharge, onShugoBonusChargeComplete }: WeeklyContentSectionProps) {
  const { getAuthHeader } = useDeviceId()

  const log = (message: string, data?: any) => {
    console.log(`[WeeklyContent] ${message}`, data || '')
  }

  // 로딩 상태 (로딩 중에는 저장 안 함)
  const isLoadingRef = useRef(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastLoadedRef = useRef<string | null>(null) // 중복 호출 방지

  // 주간 키 계산 (수요일 5시 기준)
  const weekKey = useMemo(() => getWeekKey(new Date(selectedDate)), [selectedDate])

  // 수정 가능 여부 (당일만)
  const canEdit = useMemo(() => isEditable(selectedDate), [selectedDate])

  // 게임 날짜 (새벽 5시 기준) - 사명용
  const gameDate = useMemo(() => {
    return getGameDate(new Date(selectedDate))
  }, [selectedDate])

  // 사명 상태 (매일 5:30 리셋)
  const [missionCount, setMissionCount] = useState(0)

  // 주간 지령서 상태 (수요일 5시 리셋)
  const [weeklyOrderCount, setWeeklyOrderCount] = useState(0)
  const [abyssOrderCount, setAbyssOrderCount] = useState(0)

  // 슈고 페스타 상태 (02:00 기준 3시간마다 1회 충전, 최대 14회)
  const [shugoTickets, setShugoTickets] = useState({ base: 14, bonus: 0, lastChargeTime: '' })

  // 어비스 회랑 상태 (주간)
  const [abyssRegions, setAbyssRegions] = useState(DEFAULT_ABYSS_REGIONS)

  // 슈고 페스타 자동 충전은 Supabase pg_cron에서 처리됨

  // DB에 주간 데이터 저장
  const saveToDatabase = useCallback(async () => {
    if (!characterId || isLoadingRef.current) return

    try {
      await fetch('/api/ledger/weekly-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          characterId,
          weekKey,
          gameDate,
          weeklyOrderCount,
          abyssOrderCount,
          shugoTickets,
          abyssRegions,
          missionCount
        })
      })
      log('DB 저장 완료')
    } catch (err) {
      log('DB 저장 실패', err)
    }
  }, [characterId, weekKey, gameDate, weeklyOrderCount, abyssOrderCount, shugoTickets, abyssRegions, missionCount, getAuthHeader])

  // 디바운스된 저장
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveToDatabase()
    }, 500)
  }, [saveToDatabase])

  // 데이터 로드 (캐릭터/주간/날짜 변경 시)
  useEffect(() => {
    // 중복 호출 방지: 같은 캐릭터+주간+날짜 조합이면 스킵
    const loadKey = `${characterId}-${weekKey}-${gameDate}`
    if (lastLoadedRef.current === loadKey) {
      return
    }

    log(`캐릭터/주간/날짜 변경: ${characterId}, ${weekKey}, ${gameDate}`)
    isLoadingRef.current = true

    if (!characterId) {
      setMissionCount(0)
      setWeeklyOrderCount(0)
      setAbyssOrderCount(0)
      setShugoTickets({ base: 14, bonus: 0, lastChargeTime: '' })
      setAbyssRegions(DEFAULT_ABYSS_REGIONS)
      isLoadingRef.current = false
      lastLoadedRef.current = null
      return
    }

    lastLoadedRef.current = loadKey

    const loadData = async () => {
      try {
        const res = await fetch(
          `/api/ledger/weekly-content?characterId=${characterId}&weekKey=${weekKey}&gameDate=${gameDate}`,
          { headers: getAuthHeader() }
        )

        if (!res.ok) {
          if (res.status !== 404) {
            console.error('Failed to load weekly content')
          }
          // 저장된 데이터 없음, 초기화
          log('저장된 주간 데이터 없음, 초기화')
          setWeeklyOrderCount(0)
          setAbyssOrderCount(0)
          setShugoTickets({ base: 14, bonus: 0, lastChargeTime: new Date().toISOString() })
          setAbyssRegions(DEFAULT_ABYSS_REGIONS)
          setMissionCount(0)
        } else {
          const data = await res.json()

          if (data?.weekly) {
            log('주간 데이터 로드 성공', data.weekly)
            setWeeklyOrderCount(data.weekly.weeklyOrderCount ?? 0)
            setAbyssOrderCount(data.weekly.abyssOrderCount ?? 0)

            // 슈고페스타 데이터 로드 (자동 충전은 Supabase pg_cron에서 처리)
            const savedShugo = data.weekly.shugoTickets ?? { base: 14, bonus: 0, lastChargeTime: '' }
            setShugoTickets(savedShugo)

            setAbyssRegions(data.weekly.abyssRegions ?? DEFAULT_ABYSS_REGIONS)
          } else {
            log('저장된 주간 데이터 없음, 초기화')
            setWeeklyOrderCount(0)
            setAbyssOrderCount(0)
            setShugoTickets({ base: 14, bonus: 0, lastChargeTime: new Date().toISOString() })
            setAbyssRegions(DEFAULT_ABYSS_REGIONS)
          }

          if (data?.mission) {
            setMissionCount(data.mission.count ?? 0)
          } else {
            setMissionCount(0)
          }
        }
      } catch (err) {
        console.error('Failed to load weekly content from DB:', err)
      } finally {
        setTimeout(() => {
          isLoadingRef.current = false
          log('로딩 완료')
        }, 100)
      }
    }

    loadData()
  }, [characterId, weekKey, gameDate, getAuthHeader])

  // 슈고 페스타 초기설정 동기화
  useEffect(() => {
    if (shugoInitialSync !== undefined && characterId) {
      log(`슈고페스타 초기설정 동기화: ${shugoInitialSync}회`)
      setShugoTickets({
        base: shugoInitialSync,
        bonus: 0,
        lastChargeTime: new Date().toISOString()
      })
      onShugoSyncComplete?.()
    }
  }, [shugoInitialSync, characterId])

  // 슈고 페스타 보너스 충전 (이용권 충전에서)
  useEffect(() => {
    if (shugoBonusCharge !== undefined && shugoBonusCharge > 0 && characterId) {
      log(`슈고페스타 보너스 충전: +${shugoBonusCharge}회`)
      setShugoTickets(prev => ({
        ...prev,
        bonus: prev.bonus + shugoBonusCharge
      }))
      onShugoBonusChargeComplete?.()
    }
  }, [shugoBonusCharge, characterId])

  // 슈고 페스타 자동 충전은 Supabase pg_cron으로 처리됨

  // 데이터 변경 시 DB 저장 (디바운스)
  useEffect(() => {
    if (!characterId || isLoadingRef.current) return
    debouncedSave()
  }, [characterId, weeklyOrderCount, abyssOrderCount, shugoTickets, abyssRegions, missionCount, debouncedSave])

  // 컴포넌트 언마운트 시 타임아웃 정리
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  if (!characterId) {
    return (
      <section className={styles.section}>
        <div className={styles.placeholder}>
          캐릭터를 선택하면 주간 컨텐츠가 표시됩니다.
        </div>
      </section>
    )
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>주간 지령서&슈고/회랑</h2>
      </div>

      <div className={styles.content}>
        {/* 왼쪽 65%: 진행도 바 3개 */}
        <div className={styles.leftColumn}>
          <ProgressBar
            id="mission"
            name="사명"
            icon="📜"
            currentCount={missionCount}
            maxCount={5}
            resetType="daily"
            onIncrement={() => setMissionCount(prev => Math.min(5, prev + 1))}
            onDecrement={() => setMissionCount(prev => Math.max(0, prev - 1))}
            onComplete={() => setMissionCount(5)}
            readOnly={!canEdit}
          />

          <ProgressBar
            id="weekly_order"
            name="주간 지령서"
            icon="📋"
            currentCount={weeklyOrderCount}
            maxCount={12}
            resetType="weekly"
            onIncrement={() => setWeeklyOrderCount(prev => Math.min(12, prev + 1))}
            onDecrement={() => setWeeklyOrderCount(prev => Math.max(0, prev - 1))}
            onComplete={() => setWeeklyOrderCount(12)}
            readOnly={!canEdit}
          />

          <ProgressBar
            id="abyss_order"
            name="어비스 주간 지령서"
            icon="🔥"
            currentCount={abyssOrderCount}
            maxCount={20}
            resetType="weekly"
            onIncrement={() => setAbyssOrderCount(prev => Math.min(20, prev + 1))}
            onDecrement={() => setAbyssOrderCount(prev => Math.max(0, prev - 1))}
            onComplete={() => setAbyssOrderCount(20)}
            readOnly={!canEdit}
          />
        </div>

        {/* 오른쪽 35%: 슈고 페스타 & 어비스 회랑 */}
        <div className={styles.rightColumn}>
          <ShugoFestaCard
            currentTickets={shugoTickets.base}
            maxTickets={14}
            bonusTickets={shugoTickets.bonus}
            onTicketUse={() => {
              setShugoTickets(prev => {
                if (prev.bonus > 0) {
                  return {
                    ...prev,
                    bonus: prev.bonus - 1
                  }
                } else {
                  return {
                    ...prev,
                    base: Math.max(0, prev.base - 1),
                    lastChargeTime: prev.lastChargeTime || new Date().toISOString()
                  }
                }
              })
            }}
            onTicketRefund={() => {
              setShugoTickets(prev => ({
                ...prev,
                base: Math.min(14, prev.base + 1)
              }))
            }}
            readOnly={!canEdit}
          />

          <AbyssHallwayCard
            regions={abyssRegions}
            onToggleRegion={(regionId) => {
              setAbyssRegions(prev =>
                prev.map(r =>
                  r.id === regionId ? { ...r, enabled: !r.enabled } : r
                )
              )
            }}
            readOnly={!canEdit}
          />
        </div>
      </div>
    </section>
  )
}

// React.memo를 적용하여 props가 변경되지 않으면 리렌더링 방지
export default memo(WeeklyContentSection)
