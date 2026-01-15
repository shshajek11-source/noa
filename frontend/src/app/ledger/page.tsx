'use client'

import { useState, useEffect, useCallback } from 'react'
import { Wallet } from 'lucide-react'
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
import WeeklyChart from './components/WeeklyChart'
import AddCharacterModal from './components/AddCharacterModal'
import AddItemModal from './components/AddItemModal'
import CalendarModal from './components/CalendarModal'
import NicknameModal from '@/components/NicknameModal'
import MainCharacterModal from '@/components/MainCharacterModal'
import DebugPanel from './components/DebugPanel'
import ConsoleDebugPanel from './components/ConsoleDebugPanel'
import { useAuth } from '@/context/AuthContext'
import { getGameDate, getWeekKey } from './utils/dateUtils'
import styles from './ledger.module.css'

export default function LedgerPage() {
  // 인증 (Google 또는 device_id)
  const { nickname, setNickname, mainCharacter, setMainCharacter, isAuthenticated: isGoogleAuth, user } = useAuth()
  const { getAuthHeader, isLoading: isAuthLoading, isAuthenticated, deviceId } = useDeviceId()
  const isReady = !isAuthLoading && (isAuthenticated || !!deviceId)

  // 상태
  const [activeTab, setActiveTab] = useState('dashboard')
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('content')
  const [selectedDate, setSelectedDate] = useState<string>(getGameDate(new Date()))
  const [showAddCharacterModal, setShowAddCharacterModal] = useState(false)
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [showDateModal, setShowDateModal] = useState(false)
  const [showNicknameModal, setShowNicknameModal] = useState(false)
  const [showMainCharacterModal, setShowMainCharacterModal] = useState(false)
  const [showChargePopup, setShowChargePopup] = useState(false)

  // 선택한 날짜의 수입 (하단 네비게이션 바용)
  const [selectedDateIncome, setSelectedDateIncome] = useState({
    dailyIncome: 0,
    weeklyIncome: 0
  })

  // 던전 컨텐츠 키나 (초월/원정/루드라)
  const [dungeonKina, setDungeonKina] = useState(0)

  // 티켓 기본 횟수 (자동 충전)
  const [baseTickets, setBaseTickets] = useState<Record<string, number>>({
    transcend: 14,
    expedition: 21,
    sanctuary: 4,
    daily_dungeon: 7,
    awakening: 3,
    nightmare: 14,
    dimension: 14,
    subjugation: 3
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

  // 초월/원정 자동 충전 (21:00 기준 8시간마다)
  useEffect(() => {
    const checkTranscendExpeditionCharge = () => {
      const now = new Date()
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()

      // 충전 시간 확인 (21, 05, 13)
      const chargeHours = [21, 5, 13]
      const isChargeTime = chargeHours.includes(currentHour) && currentMinute === 0

      // 이미 충전했는지 확인
      const lastChargeHour = lastChargeTime.getHours()
      const isSameHour = currentHour === lastChargeHour &&
                         now.getDate() === lastChargeTime.getDate()

      if (isChargeTime && !isSameHour) {
        console.log('[자동 충전] 초월/원정 충전:', now.toLocaleString())

        setBaseTickets(prev => ({
          ...prev,
          transcend: Math.min(14, prev.transcend + 1),
          expedition: Math.min(21, prev.expedition + 1)
        }))

        setLastChargeTime(now)
      }
    }

    // 1분마다 체크
    const interval = setInterval(checkTranscendExpeditionCharge, 60000)
    checkTranscendExpeditionCharge() // 즉시 한번 실행

    return () => clearInterval(interval)
  }, [lastChargeTime])

  // 악몽 자동 충전 (02:00 기준 3시간마다)
  useEffect(() => {
    const checkNightmareCharge = () => {
      const now = new Date()
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()

      // 충전 시간 확인 (02, 05, 08, 11, 14, 17, 20, 23)
      const chargeHours = [2, 5, 8, 11, 14, 17, 20, 23]
      const isChargeTime = chargeHours.includes(currentHour) && currentMinute === 0

      // 이미 충전했는지 확인
      const lastChargeHour = lastChargeTime.getHours()
      const isSameHour = currentHour === lastChargeHour &&
                         now.getDate() === lastChargeTime.getDate()

      if (isChargeTime && !isSameHour) {
        console.log('[자동 충전] 악몽 충전:', now.toLocaleString())

        setBaseTickets(prev => ({
          ...prev,
          nightmare: Math.min(6, prev.nightmare + 1)
        }))
      }
    }

    // 1분마다 체크
    const interval = setInterval(checkNightmareCharge, 60000)
    checkNightmareCharge() // 즉시 한번 실행

    return () => clearInterval(interval)
  }, [lastChargeTime])

  // 기타 티켓 자동 충전 (0, 3, 6, 9, 12, 15, 18, 21시)
  useEffect(() => {
    const checkOtherTicketsCharge = () => {
      const now = new Date()
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()

      // 충전 시간인지 확인 (3시간 단위 정각)
      const isChargeTime = currentHour % 3 === 0 && currentMinute === 0

      // 이미 충전했는지 확인
      const lastChargeHour = lastChargeTime.getHours()
      const isSameHour = currentHour === lastChargeHour &&
                         now.getDate() === lastChargeTime.getDate()

      if (isChargeTime && !isSameHour) {
        console.log('[자동 충전] 기타 티켓 충전:', now.toLocaleString())

        setBaseTickets(prev => ({
          ...prev,
          daily_dungeon: Math.min(6, prev.daily_dungeon + 1),
          awakening: Math.min(6, prev.awakening + 1),
          dimension: Math.min(6, prev.dimension + 1),
          subjugation: Math.min(6, prev.subjugation + 1)
        }))
      }
    }

    // 1분마다 체크
    const interval = setInterval(checkOtherTicketsCharge, 60000)
    checkOtherTicketsCharge() // 즉시 한번 실행

    return () => clearInterval(interval)
  }, [lastChargeTime])

  // 매주 수요일 5시 성역 티켓 충전
  useEffect(() => {
    const checkSanctuaryCharge = () => {
      const now = new Date()
      const currentDay = now.getDay() // 0 (일요일) ~ 6 (토요일)
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()

      // 수요일 5시인지 확인
      const isSanctuaryChargeTime = currentDay === 3 && currentHour === 5 && currentMinute === 0

      // 이미 충전했는지 확인 (같은 날에 중복 충전 방지)
      const lastChargeDay = lastSanctuaryChargeTime.getDay()
      const lastChargeDate = lastSanctuaryChargeTime.getDate()
      const nowDate = now.getDate()
      const isSameWeek = currentDay === 3 && lastChargeDay === 3 && lastChargeDate === nowDate

      if (isSanctuaryChargeTime && !isSameWeek) {
        console.log('[자동 충전] 성역 주간 충전 시작:', now.toLocaleString())

        setBaseTickets(prev => ({
          ...prev,
          sanctuary: 4  // 성역은 4회로 완전 충전
        }))

        setLastSanctuaryChargeTime(now)
      }
    }

    // 1분마다 체크
    const interval = setInterval(checkSanctuaryCharge, 60000)
    checkSanctuaryCharge() // 즉시 한번 실행

    return () => clearInterval(interval)
  }, [lastSanctuaryChargeTime])

  // 오드 에너지 자동 충전 (02:00 기준 3시간마다 +15)
  useEffect(() => {
    const checkOdEnergyCharge = () => {
      const now = new Date()
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()

      // 충전 시간 확인 (02:00 기준 3시간마다: 02, 05, 08, 11, 14, 17, 20, 23)
      const chargeHours = [2, 5, 8, 11, 14, 17, 20, 23]
      const isChargeTime = chargeHours.includes(currentHour) && currentMinute === 0

      // 이미 충전했는지 확인
      const lastChargeHour = odEnergy.lastChargeTime.getHours()
      const isSameHour = currentHour === lastChargeHour &&
                         now.getDate() === odEnergy.lastChargeTime.getDate()

      if (isChargeTime && !isSameHour) {
        console.log('[오드 에너지] 자동 충전:', now.toLocaleString())
        setOdEnergy(prev => ({
          ...prev,
          timeEnergy: Math.min(840, prev.timeEnergy + 15),
          lastChargeTime: now
        }))
      }
    }

    // 1분마다 체크
    const interval = setInterval(checkOdEnergyCharge, 60000)
    checkOdEnergyCharge() // 즉시 한번 실행

    return () => clearInterval(interval)
  }, [odEnergy.lastChargeTime])

  // 오드 에너지 타이머 업데이트 (1초마다)
  useEffect(() => {
    const updateOdEnergyTimer = () => {
      const now = new Date()
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      const currentSecond = now.getSeconds()

      // 충전 시간: 2, 5, 8, 11, 14, 17, 20, 23
      const chargeHours = [2, 5, 8, 11, 14, 17, 20, 23]

      // 다음 충전 시간 찾기
      let nextChargeHour = chargeHours.find(h => h > currentHour)

      if (nextChargeHour === undefined) {
        // 오늘의 모든 충전 시간이 지났으면 내일 2시
        nextChargeHour = 24 + 2 // 내일 2시
      }

      // 다음 충전까지 남은 시간 (초)
      const hoursUntil = nextChargeHour - currentHour
      const minutesUntil = 60 - currentMinute - 1
      const secondsUntil = 60 - currentSecond

      const totalSeconds = (hoursUntil - 1) * 3600 + minutesUntil * 60 + secondsUntil

      setOdEnergy(prev => ({
        ...prev,
        nextChargeIn: totalSeconds
      }))
    }

    updateOdEnergyTimer() // 즉시 한번 실행
    const interval = setInterval(updateOdEnergyTimer, 1000)

    return () => clearInterval(interval)
  }, [])

  // Google 로그인 후 닉네임이 없으면 모달 표시
  useEffect(() => {
    if (isGoogleAuth && !nickname && !isAuthLoading) {
      setShowNicknameModal(true)
    }
  }, [isGoogleAuth, nickname, isAuthLoading])

  // 닉네임 설정 후 대표 캐릭터 모달은 자동으로 표시하지 않음 (네비게이션바에서 수동 설정)

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

  // 디버그 로그 (콘솔 출력만)
  const addDebugLog = useCallback((type: 'load' | 'save' | 'error' | 'info', message: string, data?: any) => {
    console.log(`[DEBUG ${type.toUpperCase()}]`, message, data || '')
  }, [])

  // 캐릭터별 데이터 로드
  useEffect(() => {
    if (!selectedCharacterId || !isReady) return

    addDebugLog('load', `캐릭터 데이터 로드 시작: ${selectedCharacterId}`)

    const loadCharacterData = async () => {
      setIsLoadingCharacterData(true)
      try {
        const authHeaders = getAuthHeader()
        const res = await fetch(
          `/api/ledger/character-state?characterId=${selectedCharacterId}`,
          { headers: authHeaders }
        )

        if (!res.ok) {
          throw new Error('Failed to load character state')
        }

        const data = await res.json()
        addDebugLog('load', `데이터 로드 성공: ${selectedCharacterId}`, {
          baseTickets: data.baseTickets,
          bonusTickets: data.bonusTickets,
          odEnergy: data.odEnergy
        })

        // 티켓 데이터 복원
        if (data.baseTickets) setBaseTickets(data.baseTickets)
        if (data.bonusTickets) setTicketBonuses(data.bonusTickets)

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
        addDebugLog('error', `데이터 로드 실패: ${selectedCharacterId}`, { error: error.message })
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
  }, [selectedCharacterId, isReady, getAuthHeader, addDebugLog])

  // 캐릭터별 데이터 저장 (디바운스)
  useEffect(() => {
    if (!selectedCharacterId || !isReady || isLoadingCharacterData) return

    const saveCharacterData = async () => {
      try {
        addDebugLog('save', `데이터 저장 시작: ${selectedCharacterId}`, {
          baseTickets,
          bonusTickets: ticketBonuses,
          odEnergy: {
            timeEnergy: odEnergy.timeEnergy,
            ticketEnergy: odEnergy.ticketEnergy
          }
        })

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
            odEnergy: {
              timeEnergy: odEnergy.timeEnergy,
              ticketEnergy: odEnergy.ticketEnergy,
              lastChargeTime: odEnergy.lastChargeTime.toISOString()
            },
            lastChargeTime: lastChargeTime.toISOString(),
            lastSanctuaryChargeTime: lastSanctuaryChargeTime.toISOString()
          })
        })

        if (res.ok) {
          addDebugLog('save', `데이터 저장 성공: ${selectedCharacterId}`)
        } else {
          addDebugLog('error', `데이터 저장 실패: ${selectedCharacterId}`, { status: res.status })
        }
      } catch (error: any) {
        addDebugLog('error', `데이터 저장 에러: ${selectedCharacterId}`, { error: error.message })
      }
    }

    // 1초 디바운스 (500ms에서 증가)
    const timeoutId = setTimeout(saveCharacterData, 1000)
    return () => clearTimeout(timeoutId)
  }, [selectedCharacterId, isReady, isLoadingCharacterData, baseTickets, ticketBonuses, odEnergy, lastChargeTime, lastSanctuaryChargeTime, getAuthHeader, addDebugLog])

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
    date: today
  })

  // 아이템 관리
  const {
    items,
    filter,
    setFilter,
    addItem,
    updateItem,
    sellItem,
    deleteItem,
    totalSoldIncome
  } = useLedgerItems({
    getAuthHeader,
    isReady,
    characterId: selectedCharacterId
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

  // 대시보드 통계 로드
  const characterIds = characters.map(c => c.id).join(',')

  const loadDashboardStats = useCallback(async () => {
    if (!isReady || characters.length === 0) return

    let totalToday = 0
    let totalWeekly = 0
    let allUnsoldItems: any[] = []

    // 각 캐릭터별 통계 집계
    const authHeaders = getAuthHeader()
    for (const char of characters) {
      try {
        const res = await fetch(`/api/ledger/stats?characterId=${char.id}&type=summary`, {
          headers: authHeaders
        })
        if (res.ok) {
          const data = await res.json()
          totalToday += data.todayIncome || 0
          totalWeekly += data.weeklyIncome || 0
        }

        // 미판매 아이템 조회
        const itemsRes = await fetch(`/api/ledger/items?characterId=${char.id}&sold=false`, {
          headers: authHeaders
        })
        if (itemsRes.ok) {
          const itemsData = await itemsRes.json()
          allUnsoldItems = [...allUnsoldItems, ...itemsData]
        }
      } catch (e) {
        console.error('Load stats error:', e)
      }
    }

    // 등급별 미판매 아이템 집계
    const unsoldByGrade = {
      common: 0,
      rare: 0,
      heroic: 0,
      legendary: 0,
      ultimate: 0
    }

    allUnsoldItems.forEach(item => {
      const grade = item.item_grade as keyof typeof unsoldByGrade
      if (grade in unsoldByGrade) {
        unsoldByGrade[grade]++
      }
    })

    setDashboardStats({
      totalTodayIncome: totalToday,
      totalWeeklyIncome: totalWeekly,
      unsoldItemCount: allUnsoldItems.length,
      unsoldItemsByGrade: unsoldByGrade
    })
  }, [isReady, getAuthHeader, characterIds, characters])

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

        // 선택한 날짜의 통계 가져오기
        const res = await fetch(
          `/api/ledger/stats?characterId=${selectedCharacterId}&type=daily&date=${selectedDate}`,
          { headers: authHeaders }
        )

        if (res.ok) {
          const data = await res.json()
          setSelectedDateIncome({
            dailyIncome: data.dailyIncome || 0,
            weeklyIncome: data.weeklyIncome || 0
          })
        }
      } catch (error) {
        console.error('Failed to load selected date income:', error)
        setSelectedDateIncome({ dailyIncome: 0, weeklyIncome: 0 })
      }
    }

    loadSelectedDateIncome()
  }, [selectedDate, selectedCharacterId, isReady, getAuthHeader])

  // 던전 컨텐츠 키나 계산 (초월/원정/루드라 - localStorage에서, 일별 기록)
  useEffect(() => {
    if (!selectedCharacterId) {
      setDungeonKina(0)
      return
    }

    // 일별 기록에서 키나 계산
    const storageKey = `dungeonRecords_${selectedCharacterId}_${selectedDate}`
    const savedData = localStorage.getItem(storageKey)

    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        let totalKina = 0

        // 초월 기록 합산
        if (parsed.transcend && Array.isArray(parsed.transcend)) {
          totalKina += parsed.transcend.reduce((sum: number, r: any) => sum + (r.kina || 0), 0)
        }
        // 원정 기록 합산
        if (parsed.expedition && Array.isArray(parsed.expedition)) {
          totalKina += parsed.expedition.reduce((sum: number, r: any) => sum + (r.kina || 0), 0)
        }
        // 성역(루드라) 기록 합산
        if (parsed.sanctuary && Array.isArray(parsed.sanctuary)) {
          totalKina += parsed.sanctuary.reduce((sum: number, r: any) => sum + (r.kina || 0), 0)
        }

        setDungeonKina(totalKina)
      } catch (e) {
        console.error('Failed to parse dungeon records for kina:', e)
        setDungeonKina(0)
      }
    } else {
      setDungeonKina(0)
    }
  }, [selectedDate, selectedCharacterId])

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
  const handleToggleFavorite = async (itemId: string, itemName: string, itemGrade: string, itemCategory: string) => {
    const favoriteId = favorites.find(f => f.item_id === itemId)?.id
    if (favoriteId) {
      await removeFavorite(favoriteId)
    } else {
      await addFavorite(itemId, itemName, itemGrade, itemCategory)
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

  // 닉네임 설정 핸들러
  const handleSetNickname = async (newNickname: string) => {
    await setNickname(newNickname)
    setShowNicknameModal(false)
    // 닉네임 설정 후 대표 캐릭터 모달 표시
    if (!mainCharacter) {
      setShowMainCharacterModal(true)
    }
  }

  // 대표 캐릭터 설정 핸들러
  const handleSetMainCharacter = async (character: { server: string; name: string; className: string; level: number }) => {
    await setMainCharacter(character)
    setShowMainCharacterModal(false)
  }

  // 티켓 충전 핸들러
  const handleTicketCharge = (charges: Record<string, number>) => {
    setTicketBonuses(prev => {
      const newBonuses = { ...prev }
      Object.keys(charges).forEach(key => {
        if (charges[key] > 0) {
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
      addDebugLog('save', `초기설정 저장 시작: ${selectedCharacterId}`, {
        baseTickets: newBaseTickets,
        bonusTickets: newBonusTickets,
        odEnergy: newOdEnergy
      })

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

      addDebugLog('save', `초기설정 저장 성공: ${selectedCharacterId}`)

      // API 저장 성공 후 state 업데이트
      setOdEnergy(prev => ({
        ...prev,
        ...newOdEnergy
      }))
      setBaseTickets(newBaseTickets)
      setTicketBonuses(newBonusTickets)

    } catch (error: any) {
      addDebugLog('error', `초기설정 저장 실패: ${selectedCharacterId}`, { error: error.message })
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

  return (
    <div className={styles.container}>
      {/* 헤더 */}
      <header className={styles.header}>
        <h1 className={styles.title}>
          <Wallet size={24} style={{ marginRight: 8 }} />
          가계부
        </h1>
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

      {/* 대시보드 뷰 */}
      {activeTab === 'dashboard' && (
        <DashboardSummary
          characters={characters}
          totalTodayIncome={dashboardStats.totalTodayIncome}
          totalWeeklyIncome={dashboardStats.totalWeeklyIncome}
          unsoldItemCount={dashboardStats.unsoldItemCount}
          unsoldItemsByGrade={dashboardStats.unsoldItemsByGrade}
          onCharacterClick={setActiveTab}
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
                onDebugLog={addDebugLog}
              />

              {/* 초월 & 원정 & 성역 */}
              <DungeonContentSection
                characterId={selectedCharacterId}
                selectedDate={selectedDate}
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
                onTotalKinaChange={setDungeonKina}
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
              />

              {/* 주간 수입 그래프 */}
              <WeeklyChart
                stats={weeklyStats}
                isLoading={isStatsLoading}
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
                is_favorite: isFavorite(item.item_id || '')
              }))}
              favorites={favorites}
              onAddItem={async (itemData) => {
                await addItem(itemData)
              }}
              onUpdateItem={async (id, data) => {
                await updateItem(id, data as any)
              }}
              onSellItem={async (id, soldPrice) => {
                await sellItem(id, soldPrice)
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
        onClose={() => setShowDateModal(false)}
        onSelectDate={setSelectedDate}
      />

      {/* 닉네임 설정 모달 */}
      <NicknameModal
        isOpen={showNicknameModal}
        onClose={() => setShowNicknameModal(false)}
        onSubmit={handleSetNickname}
        currentNickname={nickname}
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
          todayIncome={selectedDateIncome.dailyIncome + dungeonKina}
          weeklyIncome={selectedDateIncome.weeklyIncome + dungeonKina}
          selectedDate={selectedDate}
          onDateClick={() => setShowDateModal(true)}
          onChargeClick={() => setShowChargePopup(true)}
        />
      )}

      {/* 디버그 패널 */}
      <DebugPanel
        baseTickets={baseTickets}
        bonusTickets={ticketBonuses}
        odEnergy={odEnergy}
        characterId={selectedCharacterId}
      />

      {/* 콘솔 디버그 패널 */}
      <ConsoleDebugPanel />
    </div>
  )
}
