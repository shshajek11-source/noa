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
import FloatingDateButton from './components/FloatingDateButton'
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
import DateSelectorModal from './components/DateSelectorModal'
import NicknameModal from '@/components/NicknameModal'
import MainCharacterModal from '@/components/MainCharacterModal'
import { useAuth } from '@/context/AuthContext'
import styles from './ledger.module.css'

export default function LedgerPage() {
  // 인증 (Google 또는 device_id)
  const { nickname, setNickname, mainCharacter, setMainCharacter, isAuthenticated: isGoogleAuth, user } = useAuth()
  const { getAuthHeader, isLoading: isAuthLoading, isAuthenticated, deviceId } = useDeviceId()
  const isReady = !isAuthLoading && (isAuthenticated || !!deviceId)

  // 상태
  const [activeTab, setActiveTab] = useState('dashboard')
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('content')
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
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

  // 티켓 기본 횟수 (자동 충전)
  const [baseTickets, setBaseTickets] = useState<Record<string, number>>({
    transcend: 14,
    expedition: 21,
    daily_dungeon: 6,
    awakening: 6,
    nightmare: 6,
    dimension: 6,
    subjugation: 6,
    sanctuary: 6
  })

  // 티켓 보너스 횟수 (수동 충전)
  const [ticketBonuses, setTicketBonuses] = useState<Record<string, number>>({
    transcend: 0,
    expedition: 0,
    daily_dungeon: 0,
    awakening: 0,
    nightmare: 0,
    dimension: 0,
    subjugation: 0,
    sanctuary: 0
  })

  // 마지막 충전 시간
  const [lastChargeTime, setLastChargeTime] = useState<Date>(new Date())

  // 3시간마다 자동 충전 (0, 3, 6, 9, 12, 15, 18, 21시)
  useEffect(() => {
    const checkAutoCharge = () => {
      const now = new Date()
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()

      // 충전 시간인지 확인 (3시간 단위 정각)
      const isChargeTime = currentHour % 3 === 0 && currentMinute === 0

      // 이미 충전했는지 확인 (같은 시간에 중복 충전 방지)
      const lastChargeHour = lastChargeTime.getHours()
      const isSameHour = currentHour === lastChargeHour &&
                         now.getDate() === lastChargeTime.getDate()

      if (isChargeTime && !isSameHour) {
        console.log('[자동 충전] 티켓 자동 충전 시작:', now.toLocaleString())

        setBaseTickets(prev => {
          const maxTickets: Record<string, number> = {
            transcend: 14,
            expedition: 21,
            daily_dungeon: 6,
            awakening: 6,
            nightmare: 6,
            dimension: 6,
            subjugation: 6,
            sanctuary: 6
          }

          const newTickets = { ...prev }
          Object.keys(newTickets).forEach(key => {
            newTickets[key] = Math.min(maxTickets[key], newTickets[key] + 1)
          })

          return newTickets
        })

        setLastChargeTime(now)
      }
    }

    // 1분마다 체크
    const interval = setInterval(checkAutoCharge, 60000)
    checkAutoCharge() // 즉시 한번 실행

    return () => clearInterval(interval)
  }, [lastChargeTime])

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

      {/* 플로팅 날짜 버튼 */}
      <FloatingDateButton
        selectedDate={selectedDate}
        onClick={() => setShowDateModal(true)}
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
              />

              {/* 초월 & 원정 */}
              <DungeonContentSection
                characterId={selectedCharacterId}
                baseTickets={{
                  transcend: baseTickets.transcend,
                  expedition: baseTickets.expedition
                }}
                bonusTickets={{
                  transcend: ticketBonuses.transcend,
                  expedition: ticketBonuses.expedition
                }}
                onBaseTicketsChange={(updates) => {
                  setBaseTickets(prev => ({ ...prev, ...updates }))
                }}
                onBonusTicketsChange={(updates) => {
                  setTicketBonuses(prev => ({ ...prev, ...updates }))
                }}
              />

              {/* 일일 컨텐츠 */}
              <DailyContentSection
                characterId={selectedCharacterId}
                selectedDate={selectedDate}
                baseTickets={{
                  daily_dungeon: baseTickets.daily_dungeon,
                  awakening: baseTickets.awakening,
                  nightmare: baseTickets.nightmare,
                  dimension: baseTickets.dimension,
                  subjugation: baseTickets.subjugation,
                  sanctuary: baseTickets.sanctuary
                }}
                bonusTickets={{
                  daily_dungeon: ticketBonuses.daily_dungeon,
                  awakening: ticketBonuses.awakening,
                  nightmare: ticketBonuses.nightmare,
                  dimension: ticketBonuses.dimension,
                  subjugation: ticketBonuses.subjugation,
                  sanctuary: ticketBonuses.sanctuary
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
                unit_price: 0,
                total_price: 0,
                is_sold: item.sold_price !== null,
                is_favorite: isFavorite(item.item_id || '')
              }))}
              favorites={favorites}
              onAddItem={() => setShowAddItemModal(true)}
              onUpdateItem={async (id, data) => {
                await updateItem(id, data as any)
              }}
              onSellItem={async (id) => {
                const item = items.find(i => i.id === id)
                if (item) {
                  await sellItem(id, item.sold_price || 0)
                }
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

      {/* 날짜 선택 모달 */}
      <DateSelectorModal
        isOpen={showDateModal}
        currentDate={selectedDate}
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
          daily_dungeon: { base: baseTickets.daily_dungeon, bonus: ticketBonuses.daily_dungeon },
          awakening: { base: baseTickets.awakening, bonus: ticketBonuses.awakening },
          nightmare: { base: baseTickets.nightmare, bonus: ticketBonuses.nightmare },
          dimension: { base: baseTickets.dimension, bonus: ticketBonuses.dimension },
          subjugation: { base: baseTickets.subjugation, bonus: ticketBonuses.subjugation },
          sanctuary: { base: baseTickets.sanctuary, bonus: ticketBonuses.sanctuary }
        }}
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
    </div>
  )
}
