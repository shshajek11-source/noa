'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Wallet, HelpCircle, X } from 'lucide-react'
import {
  useDeviceId,
  useLedgerCharacters,
  useContentRecords,
  useLedgerItems,
  useWeeklyStats,
  useFavoriteItems
} from './hooks'
import LedgerTabs from './components/LedgerTabs'
import LedgerSubTabs, { SubTabType } from './components/LedgerSubTabs'
import DashboardSummary from './components/DashboardSummary'
import BottomNavBar from './components/BottomNavBar'
import TicketChargePopup from './components/TicketChargePopup'
import DungeonContentSection from './components/DungeonContentSection'
import WeeklyContentSection from './components/WeeklyContentSection'
import DailyContentSection from './components/DailyContentSection'
import ItemSection from './components/ItemSection'
import ItemManagementTab from './components/ItemManagementTab'
import LedgerLoginRequired from './components/LedgerLoginRequired'

// 모달 컴포넌트 지연 로딩 (클릭 시에만 로드)
const AddCharacterModal = dynamic(() => import('./components/AddCharacterModal'), { ssr: false })
const AddItemModal = dynamic(() => import('./components/AddItemModal'), { ssr: false })
const CalendarModal = dynamic(() => import('./components/CalendarModal'), { ssr: false })
const MainCharacterModal = dynamic(() => import('@/components/MainCharacterModal'), { ssr: false })

// 모바일 뷰 컴포넌트 (조건부 렌더링)
const MobileLedgerView = dynamic(() => import('./mobile/page'), { ssr: false })

import { useAuth } from '@/context/AuthContext'
import { getGameDate, getWeekKey } from './utils/dateUtils'
import styles from './ledger.module.css'

export default function LedgerPage() {
  // 모바일 감지 (조건부 렌더링)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 인증 (Google 또는 device_id)
  const { nickname, setNickname, mainCharacter, setMainCharacter, isAuthenticated: isGoogleAuth, user, signInWithGoogle, isLoading: isGoogleLoading } = useAuth()
  const { getAuthHeader, isLoading: isAuthLoading, isAuthenticated, isLinked, deviceId } = useDeviceId()
  const isReady = !isAuthLoading && (isAuthenticated || !!deviceId)

  // 동기화 배너 닫기 상태 (세션 동안만 유지)
  const [showSyncBanner, setShowSyncBanner] = useState(true)

  // 상태
  const [activeTab, setActiveTab] = useState('dashboard')
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('content')
  const [selectedDate, setSelectedDate] = useState<string>(getGameDate(new Date()))

  // 페이지 포커스 시 오늘 날짜로 자동 업데이트
  useEffect(() => {
    const updateToToday = () => {
      const today = getGameDate(new Date())
      setSelectedDate(today)
    }

    // 페이지가 다시 포커스될 때 오늘 날짜로 업데이트 (새벽 5시 리셋 대응)
    const handleFocus = () => {
      updateToToday()
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [])
  const [showAddCharacterModal, setShowAddCharacterModal] = useState(false)
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [showDateModal, setShowDateModal] = useState(false)
  const [showMainCharacterModal, setShowMainCharacterModal] = useState(false)
  const [showGuideModal, setShowGuideModal] = useState(false)
  const [showChargePopup, setShowChargePopup] = useState(false)

  // 선택한 날짜의 수입 (하단 네비게이션 바용)
  const [selectedDateIncome, setSelectedDateIncome] = useState({
    dailyIncome: 0,
    weeklyIncome: 0
  })

  // 수입 새로고침 트리거 (던전 클리어/아이템 판매 시 증가)
  const [incomeRefreshKey, setIncomeRefreshKey] = useState(0)

  // 던전 컨텐츠 키나 (초월/원정/루드라)
  const [dungeonKina, setDungeonKina] = useState(0)

  // 슈고페스타 초기설정 동기화 값
  const [shugoInitialSync, setShugoInitialSync] = useState<number | undefined>(undefined)

  // 슈고페스타 보너스 충전 값
  const [shugoBonusCharge, setShugoBonusCharge] = useState<number | undefined>(undefined)

  // 일일컨텐츠 초기설정 동기화 값
  const [dailyInitialSync, setDailyInitialSync] = useState<{
    daily_dungeon: number
    awakening: number
    nightmare: number
    dimension: number
    subjugation: number
  } | undefined>(undefined)

  // 티켓 기본 횟수 (자동 충전)
  const [baseTickets, setBaseTickets] = useState<Record<string, number>>({
    transcend: 14,
    expedition: 21,
    sanctuary: 4,
    daily_dungeon: 7,      // 주간 리셋 (수요일 05:00)
    awakening: 3,          // 주간 리셋 (수요일 05:00)
    nightmare: 14,         // 매일 05:00에 2회 충전
    dimension: 14,         // 24시간마다 1회 충전
    subjugation: 3         // 주간 리셋 (수요일 05:00)
  })

  // 티켓 보너스 횟수 (수동 충전)
  const [ticketBonuses, setTicketBonuses] = useState<Record<string, number>>({
    transcend: 0,
    expedition: 0,
    sanctuary: 0,
    daily_dungeon: 0,
    awakening: 0,
    nightmare: 0,
    dimension: 0,
    subjugation: 0
  })

  // 충전 설정 (주기마다 충전되는 횟수)
  const [chargeSettings, setChargeSettings] = useState<Record<string, number>>({
    transcend: 1,
    expedition: 1,
    nightmare: 2,
    dimension: 1,
    shugo: 2,
    od_energy: 15
  })

  // 마지막 충전 시간
  const [lastChargeTime, setLastChargeTime] = useState<Date>(new Date())

  // 마지막 성역 충전 시간
  const [lastSanctuaryChargeTime, setLastSanctuaryChargeTime] = useState<Date>(new Date())

  // 오드 에너지 상태
  const [odEnergy, setOdEnergy] = useState({
    timeEnergy: 840,          // 시간 충전 (최대 840)
    ticketEnergy: 0,          // 충전권 (최대 2,000)
    lastChargeTime: new Date(),
    nextChargeIn: 30          // 다음 충전까지 남은 초
  })

  // ============================================
  // 자동 충전은 Supabase pg_cron으로 처리됨
  // 타이머 UI는 OdEnergyBar 컴포넌트 내부에서 자체 관리
  // ============================================

  // 오늘 날짜
  const today = new Date().toISOString().split('T')[0]

  // 캐릭터 관리
  const {
    characters,
    isLoading: isCharactersLoading,
    addCharacter,
    removeCharacter,
    refetch: refetchCharacters
  } = useLedgerCharacters({ getAuthHeader, isReady })

  // 대표 캐릭터 변경 시 캐릭터 목록 갱신
  useEffect(() => {
    if (isReady && mainCharacter) {
      refetchCharacters()
    }
  }, [mainCharacter?.characterId, isReady])

  // 로그인/로그아웃 시 캐릭터 목록 갱신
  useEffect(() => {
    if (isReady) {
      refetchCharacters()
    }
  }, [user?.id, isReady, refetchCharacters])

  // 현재 선택된 캐릭터 ID
  const selectedCharacterId = activeTab !== 'dashboard' ? activeTab : characters[0]?.id || null

  // 데이터 로딩 중 플래그
  const [isLoadingCharacterData, setIsLoadingCharacterData] = useState(false)

  // 캐릭터별 데이터 로드 (캐릭터 상태 + 던전 키나 병렬 로드)
  useEffect(() => {
    if (!selectedCharacterId || !isReady) return

    const loadCharacterData = async () => {
      setIsLoadingCharacterData(true)
      try {
        const authHeaders = getAuthHeader()

        // 캐릭터 상태와 던전 키나를 병렬로 로드
        const [stateRes, dungeonRes] = await Promise.all([
          fetch(
            `/api/ledger/character-state?characterId=${selectedCharacterId}`,
            { headers: authHeaders }
          ),
          fetch(
            `/api/ledger/dungeon-records?characterId=${selectedCharacterId}&date=${selectedDate}`,
            { headers: authHeaders }
          )
        ])

        // 캐릭터 상태 처리
        if (!stateRes.ok) {
          throw new Error('Failed to load character state')
        }
        const data = await stateRes.json()

        // 던전 키나 처리
        if (dungeonRes.ok) {
          const dungeonData = await dungeonRes.json()
          let totalKina = 0
          if (dungeonData.records) {
            if (dungeonData.records.transcend && Array.isArray(dungeonData.records.transcend)) {
              totalKina += dungeonData.records.transcend.reduce((sum: number, r: any) => sum + (r.kina || 0), 0)
            }
            if (dungeonData.records.expedition && Array.isArray(dungeonData.records.expedition)) {
              totalKina += dungeonData.records.expedition.reduce((sum: number, r: any) => sum + (r.kina || 0), 0)
            }
            if (dungeonData.records.sanctuary && Array.isArray(dungeonData.records.sanctuary)) {
              totalKina += dungeonData.records.sanctuary.reduce((sum: number, r: any) => sum + (r.kina || 0), 0)
            }
          }
          setDungeonKina(totalKina)
        } else {
          setDungeonKina(0)
        }

        // 티켓 데이터 복원
        if (data.baseTickets) setBaseTickets(data.baseTickets)
        if (data.bonusTickets) setTicketBonuses(data.bonusTickets)

        // 충전 설정 복원
        if (data.chargeSettings) setChargeSettings(data.chargeSettings)

        // 오드 에너지 데이터 복원
        if (data.odEnergy) {
          setOdEnergy({
            timeEnergy: data.odEnergy.timeEnergy,
            ticketEnergy: data.odEnergy.ticketEnergy,
            lastChargeTime: new Date(data.odEnergy.lastChargeTime),
            nextChargeIn: 30
          })
        }

        // 충전 시간 복원
        if (data.lastChargeTime) setLastChargeTime(new Date(data.lastChargeTime))
        if (data.lastSanctuaryChargeTime) setLastSanctuaryChargeTime(new Date(data.lastSanctuaryChargeTime))
      } catch (error: any) {
        console.error('데이터 로드 실패:', error)
        // 에러 발생 시 기본값으로 초기화
        setBaseTickets({
          transcend: 14,
          expedition: 21,
          sanctuary: 4,
          daily_dungeon: 7,
          awakening: 3,
          nightmare: 14,
          dimension: 14,
          subjugation: 3
        })
        setTicketBonuses({
          transcend: 0,
          expedition: 0,
          sanctuary: 0,
          daily_dungeon: 0,
          awakening: 0,
          nightmare: 0,
          dimension: 0,
          subjugation: 0
        })
        setChargeSettings({
          transcend: 1,
          expedition: 1,
          nightmare: 2,
          dimension: 1,
          shugo: 2,
          od_energy: 15
        })
        setOdEnergy({
          timeEnergy: 840,
          ticketEnergy: 0,
          lastChargeTime: new Date(),
          nextChargeIn: 30
        })
        setLastChargeTime(new Date())
        setLastSanctuaryChargeTime(new Date())
      } finally {
        setIsLoadingCharacterData(false)
      }
    }

    loadCharacterData()
  }, [selectedCharacterId, selectedDate, isReady, getAuthHeader])

  // 캐릭터별 데이터 저장 (디바운스)
  useEffect(() => {
    if (!selectedCharacterId || !isReady || isLoadingCharacterData) return

    const saveCharacterData = async () => {
      try {
        const authHeaders = getAuthHeader()
        const res = await fetch('/api/ledger/character-state', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          },
          body: JSON.stringify({
            characterId: selectedCharacterId,
            baseTickets,
            bonusTickets: ticketBonuses,
            chargeSettings,
            odEnergy: {
              timeEnergy: odEnergy.timeEnergy,
              ticketEnergy: odEnergy.ticketEnergy,
              lastChargeTime: odEnergy.lastChargeTime.toISOString()
            },
            lastChargeTime: lastChargeTime.toISOString(),
            lastSanctuaryChargeTime: lastSanctuaryChargeTime.toISOString()
          })
        })

        if (!res.ok) {
          console.error('데이터 저장 실패:', res.status)
        }
      } catch (error: any) {
        console.error('데이터 저장 에러:', error)
      }
    }

    // 1초 디바운스 (500ms에서 증가)
    const timeoutId = setTimeout(saveCharacterData, 1000)
    return () => clearTimeout(timeoutId)
  }, [selectedCharacterId, isReady, isLoadingCharacterData, baseTickets, ticketBonuses, chargeSettings, odEnergy, lastChargeTime, lastSanctuaryChargeTime, getAuthHeader])

  // 컨텐츠 기록
  const {
    records,
    contentTypes,
    dungeonTiers,
    incrementCompletion,
    decrementCompletion,
    toggleDouble,
    changeDungeonTier,
    changeMaxCount,
    getTotalIncome: getContentTotalIncome
  } = useContentRecords({
    getAuthHeader,
    isReady,
    characterId: selectedCharacterId,
    date: selectedDate
  })

  // 아이템 관리
  const {
    items,
    filter,
    setFilter,
    addItem,
    updateItem,
    sellItem,
    unsellItem,
    deleteItem,
    totalSoldIncome,
    selectedDateSoldIncome
  } = useLedgerItems({
    getAuthHeader,
    isReady,
    characterId: selectedCharacterId,
    selectedDate
  })

  // 즐겨찾기 관리
  const {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite
  } = useFavoriteItems({
    getAuthHeader,
    isReady,
    characterId: selectedCharacterId
  })

  // 주간 통계
  const {
    stats: weeklyStats,
    isLoading: isStatsLoading
  } = useWeeklyStats({
    characterId: selectedCharacterId
  })

  // 대시보드용 전체 통계 계산
  const [dashboardStats, setDashboardStats] = useState({
    totalTodayIncome: 0,
    totalWeeklyIncome: 0,
    unsoldItemCount: 0,
    unsoldItemsByGrade: {
      common: 0,
      rare: 0,
      heroic: 0,
      legendary: 0,
      ultimate: 0
    }
  })

  // 대시보드 통계 로드 (배치 API 사용)
  const characterIds = characters.map(c => c.id).join(',')
  const dashboardCacheRef = useRef<{ data: any; timestamp: number; ids: string } | null>(null)
  const DASHBOARD_CACHE_TTL = 5 * 60 * 1000 // 5분

  const loadDashboardStats = useCallback(async () => {
    if (!isReady || characters.length === 0) return

    // 캐시 확인
    if (dashboardCacheRef.current) {
      const { data, timestamp, ids } = dashboardCacheRef.current
      const isValid = Date.now() - timestamp < DASHBOARD_CACHE_TTL
      const isSameChars = ids === characterIds

      if (isValid && isSameChars) {
        // 캐시된 데이터 사용
        setDashboardStats(data)
        return
      }
    }

    try {
      const authHeaders = getAuthHeader()

      // 배치 API로 한 번에 조회
      const res = await fetch(`/api/ledger/dashboard?characterIds=${characterIds}`, {
        headers: authHeaders
      })

      if (!res.ok) {
        console.error('Dashboard API error:', res.status)
        return
      }

      const data = await res.json()

      const stats = {
        totalTodayIncome: data.totals?.todayIncome || 0,
        totalWeeklyIncome: data.totals?.weeklyIncome || 0,
        unsoldItemCount: data.totals?.unsoldItemCount || 0,
        unsoldItemsByGrade: data.totals?.unsoldItemsByGrade || {
          common: 0, rare: 0, heroic: 0, legendary: 0, ultimate: 0
        }
      }

      // 캐시 저장
      dashboardCacheRef.current = {
        data: stats,
        timestamp: Date.now(),
        ids: characterIds
      }

      setDashboardStats(stats)
    } catch (e) {
      console.error('Load dashboard stats error:', e)
    }
  }, [isReady, getAuthHeader, characterIds])

  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadDashboardStats()
    }
  }, [activeTab, loadDashboardStats])

  // 선택한 날짜의 수입 로드 (하단 네비게이션 바용)
  useEffect(() => {
    const loadSelectedDateIncome = async () => {
      if (!isReady || !selectedCharacterId) {
        setSelectedDateIncome({ dailyIncome: 0, weeklyIncome: 0 })
        return
      }

      try {
        const authHeaders = getAuthHeader()

        // 선택한 날짜의 일일/주간 통계 병렬로 가져오기
        const [dailyRes, weeklyRes] = await Promise.all([
          fetch(
            `/api/ledger/stats?characterId=${selectedCharacterId}&type=daily&date=${selectedDate}`,
            { headers: authHeaders }
          ),
          fetch(
            `/api/ledger/stats?characterId=${selectedCharacterId}&type=weekly&date=${selectedDate}`,
            { headers: authHeaders }
          )
        ])

        let dailyIncome = 0
        let weeklyIncome = 0

        if (dailyRes.ok) {
          const data = await dailyRes.json()
          // API 응답 필드: contentIncome, itemIncome, totalIncome
          dailyIncome = data.totalIncome || 0
        }

        if (weeklyRes.ok) {
          const data = await weeklyRes.json()
          // API 응답 필드: totalIncome (주간 합계)
          weeklyIncome = data.totalIncome || 0
        }

        setSelectedDateIncome({ dailyIncome, weeklyIncome })
      } catch (error) {
        console.error('Failed to load selected date income:', error)
        setSelectedDateIncome({ dailyIncome: 0, weeklyIncome: 0 })
      }
    }

    loadSelectedDateIncome()
  }, [selectedDate, selectedCharacterId, isReady, getAuthHeader, incomeRefreshKey])

  // 캐릭터 추가 핸들러
  const handleAddCharacter = async (charData: any) => {
    const result = await addCharacter(charData)
    if (result) {
      setActiveTab(result.id)
    }
  }

  // 아이템 추가 핸들러
  const handleAddItem = async (itemData: any) => {
    await addItem(itemData)
    setShowAddItemModal(false)
  }

  // 즐겨찾기 토글 핸들러
  const handleToggleFavorite = async (itemId: string, itemName: string, itemGrade: string, itemCategory: string, iconUrl?: string) => {
    const favoriteId = favorites.find(f => f.item_id === itemId)?.id
    if (favoriteId) {
      await removeFavorite(favoriteId)
    } else {
      await addFavorite(itemId, itemName, itemGrade, itemCategory, iconUrl)
    }
  }

  // 즐겨찾기 선택 핸들러
  const handleSelectFavorite = async (favorite: any) => {
    // 즐겨찾기 아이템을 선택하면 새 아이템으로 추가
    await addItem({
      item_id: favorite.item_id,
      item_name: favorite.item_name,
      item_grade: favorite.item_grade,
      item_category: favorite.item_category,
      quantity: 1
    })
  }

  // 대표 캐릭터 설정 핸들러
  const handleSetMainCharacter = async (character: { server: string; name: string; className: string; level: number }) => {
    await setMainCharacter(character)
    setShowMainCharacterModal(false)
  }

  // 티켓 충전 핸들러
  const handleTicketCharge = (charges: Record<string, number>) => {
    // 슈고페스타 보너스 충전 처리
    if (charges.shugo_festa && charges.shugo_festa > 0) {
      setShugoBonusCharge(charges.shugo_festa)
    }

    // 다른 티켓 보너스 충전 처리
    setTicketBonuses(prev => {
      const newBonuses = { ...prev }
      Object.keys(charges).forEach(key => {
        if (key !== 'shugo_festa' && charges[key] > 0) {
          newBonuses[key] = (newBonuses[key] || 0) + charges[key]
        }
      })
      return newBonuses
    })
  }

  // 오드 에너지 충전 핸들러
  const handleOdEnergyCharge = (amount: number) => {
    setOdEnergy(prev => ({
      ...prev,
      ticketEnergy: Math.min(2000, prev.ticketEnergy + amount)
    }))
  }

  // 오드 에너지 차감 핸들러 (컨텐츠 사용 시)
  const handleOdEnergyDeduct = (amount: number = 40): boolean => {
    const totalEnergy = odEnergy.timeEnergy + odEnergy.ticketEnergy

    if (totalEnergy < amount) {
      // 에너지 부족
      return false
    }

    setOdEnergy(prev => {
      let remaining = amount
      let newTimeEnergy = prev.timeEnergy
      let newTicketEnergy = prev.ticketEnergy

      // 먼저 시간 충전 에너지에서 차감
      if (newTimeEnergy >= remaining) {
        newTimeEnergy -= remaining
        remaining = 0
      } else {
        remaining -= newTimeEnergy
        newTimeEnergy = 0
      }

      // 남은 금액은 티켓 에너지에서 차감
      if (remaining > 0) {
        newTicketEnergy -= remaining
      }

      return {
        ...prev,
        timeEnergy: newTimeEnergy,
        ticketEnergy: newTicketEnergy
      }
    })

    return true
  }

  // 오드 에너지 복구 핸들러 (기록 삭제 시)
  const handleOdEnergyRestore = (amount: number) => {
    setOdEnergy(prev => ({
      ...prev,
      // 시간 에너지로 복구 (최대 840까지)
      timeEnergy: Math.min(840, prev.timeEnergy + amount)
    }))
  }

  // 초기설정 동기화 핸들러
  const handleInitialSync = async (settings: {
    odTimeEnergy: number
    odTicketEnergy: number
    tickets: Record<string, number>
  }) => {
    if (!selectedCharacterId) {
      console.error('[초기설정] 캐릭터가 선택되지 않음')
      return
    }

    const newOdEnergy = {
      timeEnergy: settings.odTimeEnergy,
      ticketEnergy: settings.odTicketEnergy,
      lastChargeTime: new Date()
    }

    const newBaseTickets = {
      ...baseTickets,
      ...settings.tickets
    }

    const newBonusTickets = {
      transcend: 0,
      expedition: 0,
      sanctuary: 0,
      daily_dungeon: 0,
      awakening: 0,
      nightmare: 0,
      dimension: 0,
      subjugation: 0
    }

    // 먼저 API로 저장
    try {
      const authHeaders = getAuthHeader()
      const res = await fetch('/api/ledger/character-state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          characterId: selectedCharacterId,
          baseTickets: newBaseTickets,
          bonusTickets: newBonusTickets,
          odEnergy: {
            timeEnergy: newOdEnergy.timeEnergy,
            ticketEnergy: newOdEnergy.ticketEnergy,
            lastChargeTime: newOdEnergy.lastChargeTime.toISOString()
          },
          lastChargeTime: lastChargeTime.toISOString(),
          lastSanctuaryChargeTime: lastSanctuaryChargeTime.toISOString()
        })
      })

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`)
      }

      // API 저장 성공 후 state 업데이트
      setOdEnergy(prev => ({
        ...prev,
        ...newOdEnergy
      }))
      setBaseTickets(newBaseTickets)
      setTicketBonuses(newBonusTickets)

      // 슈고페스타 초기설정 동기화
      if (settings.tickets.shugo_festa !== undefined) {
        setShugoInitialSync(settings.tickets.shugo_festa)
      }

      // 일일컨텐츠 초기설정 동기화
      setDailyInitialSync({
        daily_dungeon: settings.tickets.daily_dungeon ?? 7,
        awakening: settings.tickets.awakening ?? 3,
        nightmare: settings.tickets.nightmare ?? 14,
        dimension: settings.tickets.dimension ?? 14,
        subjugation: settings.tickets.subjugation ?? 3
      })

    } catch (error: any) {
      console.error('[초기설정] 저장 실패:', error)
      alert('초기설정 저장에 실패했습니다. 다시 시도해주세요.')
    }
  }

  // 로딩 상태
  if (isAuthLoading || isCharactersLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>로딩 중...</div>
      </div>
    )
  }

  // 날짜 포맷팅 함수
  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekdays = ['일', '월', '화', '수', '목', '금', '토']
    const weekday = weekdays[date.getDay()]
    return `${month}/${day} (${weekday})`
  }

  // Google 로그인 필수 - 비로그인 시 안내 화면 표시
  if (isGoogleLoading || !isGoogleAuth) {
    return <LedgerLoginRequired onLogin={signInWithGoogle} isLoading={isGoogleLoading} />
  }

  // 모바일 뷰 (조건부 렌더링)
  if (isMobile) {
    return <MobileLedgerView />
  }

  return (
    <div className={styles.container}>
      {/* 헤더 */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>
            <Wallet size={24} style={{ marginRight: 8 }} />
            숙제&가계부
          </h1>
          <button
            className={styles.guideButton}
            onClick={() => setShowGuideModal(true)}
          >
            <HelpCircle size={16} />
            이용 가이드
          </button>
        </div>
        <p className={styles.subtitle}>
          캐릭터별 수입을 관리하고 추적하세요
        </p>
      </header>

      {/* 캐릭터 탭 */}
      <LedgerTabs
        characters={characters}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAddCharacter={() => setShowAddCharacterModal(true)}
        onDeleteCharacter={async (id) => {
          const success = await removeCharacter(id)
          if (success && activeTab === id) {
            setActiveTab('dashboard')
          }
        }}
      />

      {/* 크로스 기기 동기화 배너 - Google 로그인 안 한 경우에만 표시 */}
      {showSyncBanner && !isGoogleAuth && activeTab === 'dashboard' && (
        <div className={styles.syncBanner}>
          <div className={styles.syncBannerContent}>
            <span className={styles.syncBannerIcon}>🔄</span>
            <div className={styles.syncBannerText}>
              <strong>Google 로그인</strong>하면 PC/모바일 어디서든 데이터가 동기화됩니다
            </div>
            <button
              className={styles.syncBannerLoginBtn}
              onClick={() => signInWithGoogle()}
            >
              로그인
            </button>
            <button
              className={styles.syncBannerCloseBtn}
              onClick={() => setShowSyncBanner(false)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 동기화 완료 표시 - Google 로그인 + 연동 완료 시 */}
      {isLinked && activeTab === 'dashboard' && (
        <div className={styles.syncCompleteBanner}>
          <span>✓ 크로스 기기 동기화 활성화됨</span>
          <span className={styles.syncEmail}>{user?.email}</span>
        </div>
      )}

      {/* 대시보드 뷰 */}
      {activeTab === 'dashboard' && (
        <DashboardSummary
          characters={characters}
          totalTodayIncome={dashboardStats.totalTodayIncome}
          totalWeeklyIncome={dashboardStats.totalWeeklyIncome}
          unsoldItemCount={dashboardStats.unsoldItemCount}
          unsoldItemsByGrade={dashboardStats.unsoldItemsByGrade}
          onCharacterClick={setActiveTab}
          getAuthHeader={getAuthHeader}
        />
      )}

      {/* 캐릭터 상세 뷰 */}
      {activeTab !== 'dashboard' && selectedCharacterId && (
        <>
          {/* 서브탭: 컨텐츠 / 아이템 */}
          <LedgerSubTabs activeTab={activeSubTab} onTabChange={setActiveSubTab} />

          {/* 컨텐츠 탭 */}
          {activeSubTab === 'content' && (
            <>
              {/* 주간 컨텐츠 */}
              <WeeklyContentSection
                characterId={selectedCharacterId}
                selectedDate={selectedDate}
                shugoInitialSync={shugoInitialSync}
                onShugoSyncComplete={() => setShugoInitialSync(undefined)}
                shugoBonusCharge={shugoBonusCharge}
                onShugoBonusChargeComplete={() => setShugoBonusCharge(undefined)}
              />

              {/* 초월 & 원정 & 성역 */}
              <DungeonContentSection
                characterId={selectedCharacterId}
                selectedDate={selectedDate}
                getAuthHeader={getAuthHeader}
                baseTickets={{
                  transcend: baseTickets.transcend,
                  expedition: baseTickets.expedition,
                  sanctuary: baseTickets.sanctuary
                }}
                bonusTickets={{
                  transcend: ticketBonuses.transcend,
                  expedition: ticketBonuses.expedition,
                  sanctuary: ticketBonuses.sanctuary
                }}
                onBaseTicketsChange={(updates) => {
                  setBaseTickets(prev => ({ ...prev, ...updates }))
                }}
                onBonusTicketsChange={(updates) => {
                  setTicketBonuses(prev => ({ ...prev, ...updates }))
                }}
                odEnergy={{
                  timeEnergy: odEnergy.timeEnergy,
                  ticketEnergy: odEnergy.ticketEnergy,
                  nextChargeIn: odEnergy.nextChargeIn
                }}
                onOdEnergyDeduct={handleOdEnergyDeduct}
                onOdEnergyRestore={handleOdEnergyRestore}
                onTotalKinaChange={(kina) => {
                  setDungeonKina(kina)
                  setIncomeRefreshKey(prev => prev + 1) // 수입 새로고침 트리거
                }}
              />

              {/* 일일 컨텐츠 */}
              <DailyContentSection
                characterId={selectedCharacterId}
                selectedDate={selectedDate}
                getAuthHeader={getAuthHeader}
                baseTickets={{
                  daily_dungeon: baseTickets.daily_dungeon,
                  awakening: baseTickets.awakening,
                  nightmare: baseTickets.nightmare,
                  dimension: baseTickets.dimension,
                  subjugation: baseTickets.subjugation
                }}
                bonusTickets={{
                  daily_dungeon: ticketBonuses.daily_dungeon,
                  awakening: ticketBonuses.awakening,
                  nightmare: ticketBonuses.nightmare,
                  dimension: ticketBonuses.dimension,
                  subjugation: ticketBonuses.subjugation
                }}
                onBaseTicketsChange={(updates) => {
                  setBaseTickets(prev => ({ ...prev, ...updates }))
                }}
                onBonusTicketsChange={(updates) => {
                  setTicketBonuses(prev => ({ ...prev, ...updates }))
                }}
                initialSyncTickets={dailyInitialSync}
                onInitialSyncComplete={() => setDailyInitialSync(undefined)}
                onIncomeChange={() => setIncomeRefreshKey(prev => prev + 1)}
              />

            </>
          )}

          {/* 아이템 탭 */}
          {activeSubTab === 'item' && (
            <ItemManagementTab
              items={items.map(item => ({
                ...item,
                item_id: item.item_id || '',
                unit_price: item.unit_price || 0,
                total_price: item.total_price || 0,
                is_sold: item.sold_price !== null,
                is_favorite: isFavorite(item.item_id || ''),
                obtained_date: item.obtained_date,
                sold_date: item.sold_date || undefined
              }))}
              favorites={favorites}
              selectedDate={selectedDate}
              onAddItem={async (itemData) => {
                await addItem(itemData)
              }}
              onUpdateItem={async (id, data) => {
                await updateItem(id, data as any)
              }}
              onSellItem={async (id, soldPrice) => {
                await sellItem(id, soldPrice)
                setIncomeRefreshKey(prev => prev + 1)
              }}
              onUnsellItem={async (id) => {
                await unsellItem(id)
                setIncomeRefreshKey(prev => prev + 1)
              }}
              onDeleteItem={async (id) => { await deleteItem(id) }}
              onToggleFavorite={handleToggleFavorite}
              onSelectFavorite={handleSelectFavorite}
              onRemoveFavorite={async (id) => { await removeFavorite(id) }}
            />
          )}
        </>
      )}

      {/* 캐릭터 등록 모달 */}
      <AddCharacterModal
        isOpen={showAddCharacterModal}
        onClose={() => setShowAddCharacterModal(false)}
        onAdd={handleAddCharacter}
      />

      {/* 아이템 등록 모달 */}
      <AddItemModal
        isOpen={showAddItemModal}
        contentTypes={contentTypes}
        onClose={() => setShowAddItemModal(false)}
        onAdd={handleAddItem}
      />

      {/* 캘린더 모달 */}
      <CalendarModal
        isOpen={showDateModal}
        currentDate={selectedDate}
        characterId={selectedCharacterId}
        items={items.map(item => ({
          id: item.id,
          sold_date: item.sold_date || undefined,
          sold_price: item.sold_price,
          total_price: item.total_price || 0,
          is_sold: item.sold_price !== null
        }))}
        onClose={() => setShowDateModal(false)}
        onSelectDate={setSelectedDate}
        getAuthHeader={getAuthHeader}
      />

      {/* 대표 캐릭터 설정 모달 */}
      <MainCharacterModal
        isOpen={showMainCharacterModal}
        onClose={() => setShowMainCharacterModal(false)}
        onSubmit={handleSetMainCharacter}
        currentCharacter={mainCharacter}
      />

      {/* 티켓 충전 팝업 */}
      <TicketChargePopup
        isOpen={showChargePopup}
        onClose={() => setShowChargePopup(false)}
        onCharge={handleTicketCharge}
        currentTickets={{
          transcend: { base: baseTickets.transcend, bonus: ticketBonuses.transcend },
          expedition: { base: baseTickets.expedition, bonus: ticketBonuses.expedition },
          sanctuary: { base: baseTickets.sanctuary, bonus: ticketBonuses.sanctuary },
          daily_dungeon: { base: baseTickets.daily_dungeon, bonus: ticketBonuses.daily_dungeon },
          awakening: { base: baseTickets.awakening, bonus: ticketBonuses.awakening },
          nightmare: { base: baseTickets.nightmare, bonus: ticketBonuses.nightmare },
          dimension: { base: baseTickets.dimension, bonus: ticketBonuses.dimension },
          subjugation: { base: baseTickets.subjugation, bonus: ticketBonuses.subjugation }
        }}
        odEnergy={{
          timeEnergy: odEnergy.timeEnergy,
          ticketEnergy: odEnergy.ticketEnergy
        }}
        onOdEnergyCharge={handleOdEnergyCharge}
        onInitialSync={handleInitialSync}
      />

      {/* 하단 네비게이션 바 (캐릭터 선택 시에만 표시) */}
      {activeTab !== 'dashboard' && selectedCharacterId && (
        <BottomNavBar
          todayIncome={selectedDateIncome.dailyIncome}
          weeklyIncome={selectedDateIncome.weeklyIncome}
          selectedDate={selectedDate}
          onDateClick={() => setShowDateModal(true)}
          onChargeClick={() => setShowChargePopup(true)}
        />
      )}

      {/* 이용 가이드 모달 */}
      {showGuideModal && (
        <div className={styles.guideModalOverlay} onClick={() => setShowGuideModal(false)}>
          <div className={styles.guideModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.guideModalHeader}>
              <h2>숙제&가계부 이용 가이드</h2>
              <button onClick={() => setShowGuideModal(false)} className={styles.guideCloseButton}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.guideModalContent}>
              <div className={styles.guideSection}>
                <h3>시작하기 전에</h3>
                <ul>
                  <li><strong>PC 환경 권장</strong>: 숙제&가계부는 PC 환경에 최적화되어 있습니다.</li>
                  <li><strong>Google 로그인 필수</strong>: 데이터 저장 및 동기화를 위해 Google 로그인이 필요합니다.</li>
                  <li><strong>게임 날짜 기준</strong>: 새벽 5시에 "오늘"이 바뀝니다.</li>
                </ul>
              </div>

              <div className={styles.guideSection}>
                <h3>1단계: 캐릭터 등록</h3>
                <ol>
                  <li>하단의 <strong>[+ 캐릭터]</strong> 버튼 클릭</li>
                  <li>서버, 종족 선택 후 캐릭터명 검색</li>
                  <li>검색 결과에서 내 캐릭터 선택하여 등록</li>
                </ol>
                <p style={{ marginTop: '8px', fontSize: '13px', color: '#9CA3AF' }}>
                  * 캐릭터 삭제: 캐릭터 탭의 X 버튼 클릭
                </p>
              </div>

              <div className={styles.guideSection}>
                <h3>2단계: 인게임 동기화 (중요!)</h3>
                <p className={styles.guideHighlight}>
                  처음 사용 시 반드시 인게임 상태와 동기화해야 합니다.
                </p>
                <ol>
                  <li>등록한 캐릭터 탭 선택</li>
                  <li>하단의 <strong>[설정&충전]</strong> 버튼 클릭</li>
                  <li>현재 인게임에서 확인한 <strong>잔여 횟수</strong>를 입력</li>
                  <li><strong>[가계부에 적용하기]</strong> 버튼 클릭</li>
                </ol>
              </div>

              <div className={styles.guideSection}>
                <h3>3단계: 컨텐츠 클리어 체크</h3>
                <ul>
                  <li>컨텐츠 카드를 <strong>클릭</strong>하면 클리어 횟수가 증가합니다.</li>
                  <li>충전권 사용 시: <strong>[설정&충전]</strong>에서 보너스 횟수를 추가하세요.</li>
                </ul>
              </div>

              <div className={styles.guideSection}>
                <h3>4단계: 아이템 수입 관리</h3>
                <ol>
                  <li><strong>아이템</strong> 서브탭으로 이동</li>
                  <li><strong>[+ 아이템]</strong> 버튼 클릭</li>
                  <li>아이템 정보 입력 후 등록</li>
                  <li>판매 완료 시 가격 입력하여 상태 변경</li>
                </ol>
              </div>

              <div className={styles.guideSection}>
                <h3>5단계: 총합 탭에서 전체 현황 확인</h3>
                <ul>
                  <li><strong>총합</strong> 탭에서 모든 캐릭터의 수입을 한눈에 확인</li>
                  <li>오늘/이번주/이번달 총 수입 표시</li>
                  <li>캐릭터별 수입 현황 테이블</li>
                </ul>
              </div>

              <div className={styles.guideSection}>
                <h3>충전 시간 안내</h3>
                <ul>
                  <li><strong>8시간 충전</strong>: 05시 / 13시 / 21시 (초월, 원정, 슈고페스타)</li>
                  <li><strong>일일 충전</strong>: 매일 05시 (사명, 악몽)</li>
                  <li><strong>24시간 충전</strong>: 마지막 클리어 후 24시간 (차원침공)</li>
                  <li><strong>주간 리셋</strong>: 수요일 05시 (성역, 지령서, 일일던전, 각성전, 토벌전, 어비스회랑)</li>
                </ul>
              </div>

              <div className={styles.guideSection}>
                <h3>자주 묻는 질문</h3>
                <div className={styles.guideFaq}>
                  <p><strong>Q: 컨텐츠 횟수가 실제와 다른데요?</strong></p>
                  <p>A: [설정&충전] 버튼을 눌러 현재 인게임 상태로 동기화하세요.</p>
                </div>
                <div className={styles.guideFaq}>
                  <p><strong>Q: 주간 리셋은 언제인가요?</strong></p>
                  <p>A: 매주 수요일 새벽 5시입니다.</p>
                </div>
                <div className={styles.guideFaq}>
                  <p><strong>Q: 다른 기기에서 접속하면 데이터가 보이나요?</strong></p>
                  <p>A: 같은 Google 계정으로 로그인하면 자동으로 동기화됩니다.</p>
                </div>
                <div className={styles.guideFaq}>
                  <p><strong>Q: 게임 날짜 기준이 뭔가요?</strong></p>
                  <p>A: 아이온2는 새벽 5시에 일일 리셋됩니다. 가계부도 동일하게 05시 기준으로 "오늘"이 바뀝니다.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
