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
import CompactKinaOverview from './components/CompactKinaOverview'
import FloatingDateButton from './components/FloatingDateButton'
import PremiumContentSection from './components/PremiumContentSection'
import ContentIncomeSection from './components/ContentIncomeSection'
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

      {/* 키나 수급 현황 (캐릭터 선택 시에만 표시) */}
      {activeTab !== 'dashboard' && selectedCharacterId && (
        <CompactKinaOverview
          todayContentIncome={getContentTotalIncome()}
          todayItemIncome={items.filter(i =>
            i.sold_price !== null &&
            i.updated_at?.startsWith(today)
          ).reduce((sum, i) => sum + (i.sold_price || 0), 0)}
          weeklyContentIncome={weeklyStats?.dailyData.reduce((sum, d) => sum + d.contentIncome, 0) || 0}
          weeklyItemIncome={weeklyStats?.dailyData.reduce((sum, d) => sum + d.itemIncome, 0) || 0}
        />
      )}

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
              {/* 컨텐츠별 수입 */}
              {/* 슈고페스타 & 어비스회랑 */}
              <PremiumContentSection characterId={selectedCharacterId} selectedDate={selectedDate} />

              {/* 일반 컨텐츠 */}
              <ContentIncomeSection
                contentTypes={contentTypes}
                dungeonTiers={dungeonTiers}
                records={records}
                onIncrementCompletion={incrementCompletion}
                onDecrementCompletion={decrementCompletion}
                onToggleDouble={toggleDouble}
                onChangeTier={changeDungeonTier}
                onChangeMaxCount={changeMaxCount}
              />

              {/* 일일 컨텐츠 */}
              <DailyContentSection characterId={selectedCharacterId} selectedDate={selectedDate} />

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
    </div>
  )
}
