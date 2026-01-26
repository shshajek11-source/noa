'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Search } from 'lucide-react'
import EnhancedItemCard, { EnhancedLedgerItem } from './EnhancedItemCard'
import FavoriteItemsPanel, { FavoriteItem } from './FavoriteItemsPanel'

// 모달 지연 로딩 (아이템 등록 버튼 클릭 시에만 로드)
const ItemRegisterModal = dynamic(() => import('./ItemRegisterModal'), { ssr: false })
import styles from './ItemManagementTab.module.css'

// 등급 색상 (즐겨찾기와 동일하게 통일)
const GRADE_COLORS: Record<string, string> = {
  // 공식 API 등급
  'Epic': '#A78BFA',
  'Unique': '#FBBF24',
  'Legend': '#F472B6',
  'Rare': '#60A5FA',
  'Common': '#9CA3AF',
  // 로컬 등급
  'heroic': '#A78BFA',
  'legendary': '#FBBF24',
  'ultimate': '#F472B6',
  'rare': '#60A5FA',
  'common': '#9CA3AF'
}

// 공식 API 등급 -> 로컬 등급 변환 (이미 로컬 형식이면 그대로 유지)
const GRADE_TO_LOCAL: Record<string, string> = {
  // 공식 API 등급
  'Epic': 'heroic',
  'Unique': 'legendary',
  'Legend': 'ultimate',
  'Rare': 'rare',
  'Common': 'common',
  // 로컬 등급 (자기 자신으로 매핑)
  'heroic': 'heroic',
  'legendary': 'legendary',
  'ultimate': 'ultimate',
  'rare': 'rare',
  'common': 'common'
}

// 카테고리 이름 -> 로컬 카테고리 타입 변환
function getCategoryType(categoryName: string): string {
  const equipmentCategories = [
    '장검', '대검', '단검', '활', '법서', '보주', '전곤', '법봉', '가더',
    '투구', '견갑', '상의', '하의', '장갑', '신발', '망토',
    '목걸이', '귀걸이', '반지', '팔찌'
  ]
  const materialCategories = [
    '마석/영석', '신석', '날개깃', '돌파재료', '채집재료', '제작재료', '물질변환재료'
  ]
  const wingCategories = ['날개', '날개깃']

  if (equipmentCategories.includes(categoryName)) return 'equipment'
  if (materialCategories.includes(categoryName)) return 'material'
  if (wingCategories.includes(categoryName)) return 'wing'
  return 'etc'
}

// 카테고리명 -> slotPos 매핑
function getSlotPosFromCategory(categoryName: string): number {
  const map: Record<string, number> = {
    // 무기
    '장검': 1, '대검': 1, '단검': 1, '활': 1, '법서': 1, '보주': 1, '전곤': 1, '법봉': 1, '가더': 2,
    // 방어구
    '투구': 3, '견갑': 8, '상의': 4, '하의': 5, '장갑': 6, '신발': 7, '망토': 21,
    // 장신구
    '목걸이': 9, '귀걸이': 10, '반지': 11, '팔찌': 12,
    // 재료/소모품
    '마석/영석': 100, '신석': 101, '날개깃': 102, '돌파재료': 103,
    '채집재료': 104, '제작재료': 105, '물질변환재료': 106
  }
  return map[categoryName] || 0
}

// 슬롯/카테고리 옵션
const SLOT_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: '1', label: '무기' },
  { value: '2', label: '보조무기' },
  { value: '3', label: '머리' },
  { value: '4', label: '상의' },
  { value: '5', label: '하의' },
  { value: '6', label: '장갑' },
  { value: '7', label: '신발' },
  { value: '8', label: '어깨' },
  { value: '9', label: '목걸이' },
  { value: '10', label: '귀걸이' },
  { value: '11', label: '반지' },
  { value: '12', label: '팔찌' },
  { value: '21', label: '망토' },
  { value: '100', label: '마석/영석' },
  { value: '101', label: '신석' },
  { value: '102', label: '날개깃' },
  { value: '103', label: '돌파재료' },
  { value: '104', label: '채집재료' },
  { value: '105', label: '제작재료' },
  { value: '106', label: '물변재료' }
]

// 검색 결과 아이템 타입
interface SearchResultItem {
  id: string
  name: string
  grade: string
  category: string
  slotPos?: number
  icon_url?: string
}

// 아이템 스탯 API 응답 타입
interface ItemStatItem {
  itemId: string
  itemName: string
  slotPos: number
  slotName: string
  grade: string
  icon: string
  usageCount: number
  usagePercent: number
}

interface ItemManagementTabProps {
  items: EnhancedLedgerItem[]
  favorites: FavoriteItem[]
  selectedDate: string  // 선택된 날짜
  onAddItem: (item: any) => Promise<void>
  onUpdateItem: (id: string, data: Partial<EnhancedLedgerItem>) => Promise<void>
  onSellItem: (id: string, soldPrice: number) => Promise<void>
  onUnsellItem: (id: string) => Promise<void>
  onDeleteItem: (id: string) => Promise<void>
  onToggleFavorite: (itemId: string, itemName: string, itemGrade: string, itemCategory: string, iconUrl?: string) => Promise<void>
  onSelectFavorite: (favorite: FavoriteItem) => void
  onRemoveFavorite: (id: string) => Promise<void>
}

export default function ItemManagementTab({
  items,
  favorites,
  selectedDate,
  onAddItem,
  onUpdateItem,
  onSellItem,
  onUnsellItem,
  onDeleteItem,
  onToggleFavorite,
  onSelectFavorite,
  onRemoveFavorite
}: ItemManagementTabProps) {
  // 아이템 목록 (로컬 데이터)
  const [allItems, setAllItems] = useState<SearchResultItem[]>([])
  const [isLoadingItems, setIsLoadingItems] = useState(true)

  // 검색 상태
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [recentSearches, setRecentSearches] = useState<SearchResultItem[]>([])

  // 검색 컨테이너 ref (외부 클릭 감지용)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // 검색 debounce용 타이머 ref
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)

  // 최근 검색 로드 (localStorage)
  useEffect(() => {
    const saved = localStorage.getItem('recentItemSearches')
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load recent searches:', e)
      }
    }
  }, [])

  // 검색 리스트 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSearchResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      // debounce 타이머 정리
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current)
      }
    }
  }, [])

  // 최근 검색에 추가
  const addToRecentSearches = (item: SearchResultItem) => {
    setRecentSearches(prev => {
      // 중복 제거 후 맨 앞에 추가
      const filtered = prev.filter(i => i.id !== item.id)
      const updated = [item, ...filtered].slice(0, 10) // 최대 10개
      localStorage.setItem('recentItemSearches', JSON.stringify(updated))
      return updated
    })
  }

  // 필터 상태
  const [slotFilter, setSlotFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'unsold' | 'sold'>('all')

  // 아이템 등록 모달
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [selectedSearchItem, setSelectedSearchItem] = useState<SearchResultItem | null>(null)

  // 선택 상태 (일괄 처리용)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  // 아이템 목록 로드 (공식 API에서)
  useEffect(() => {
    const loadAllItems = async () => {
      setIsLoadingItems(true)
      try {
        // 공식 API에서 아이템 목록 가져오기 (장비 + 재료)
        const categories = [
          // 무기
          'Sword', 'Greatsword', 'Dagger', 'Bow', 'Magicbook', 'Orb', 'Mace', 'Staff', 'Guarder',
          // 방어구
          'Helmet', 'Shoulder', 'Torso', 'Pants', 'Gloves', 'Boots', 'Cape',
          // 장신구
          'Necklace', 'Earring', 'Ring', 'Bracelet',
          // 재료/소모품
          'MagicStone', 'GodStone', 'Wing', 'Material',
          'GatherResource', 'CraftResource', 'ConversionResource'
        ]

        // 병렬로 카테고리별 아이템 로드
        const promises = categories.map(cat =>
          fetch(`/api/item/official?action=search&category=${cat}&size=200`)
            .then(res => res.ok ? res.json() : { contents: [] })
            .catch(() => ({ contents: [] }))
        )

        const results = await Promise.all(promises)
        const allOfficialItems = results.flatMap(r => r.contents || [])

        const items = allOfficialItems.map((item: any) => ({
          id: String(item.id),
          name: item.name,
          grade: item.grade || 'Common',
          category: item.categoryName || '기타',
          slotPos: getSlotPosFromCategory(item.categoryName),
          icon_url: item.image
        }))

        // 중복 제거
        const uniqueItems = Array.from(new Map(items.map((i: any) => [i.id, i])).values())
        setAllItems(uniqueItems as SearchResultItem[])
        console.log('[아이템 로드]', uniqueItems.length, '개 아이템 로드됨 (공식 API)')
      } catch (e) {
        console.error('Load items error:', e)
      } finally {
        setIsLoadingItems(false)
      }
    }

    loadAllItems()
  }, [])


  // 아이템 검색 (로컬 필터링)
  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    const query = searchQuery.toLowerCase()
    const baseItems = slotFilter === 'all'
      ? allItems
      : allItems.filter(item => item.slotPos === parseInt(slotFilter))

    const filtered = baseItems.filter(item =>
      item.name.toLowerCase().includes(query)
    )
    setSearchResults(filtered)
    setShowSearchResults(true)
  }, [searchQuery, allItems, slotFilter])

  // 검색 결과 아이템 클릭
  const handleSearchItemClick = (item: SearchResultItem) => {
    console.log('[DEBUG] handleSearchItemClick called:', item)
    addToRecentSearches(item) // 최근 검색에 추가
    setSelectedSearchItem(item)
    setShowRegisterModal(true)
    setShowSearchResults(false)
    setSearchQuery('')
    console.log('[DEBUG] showRegisterModal set to true')
  }

  // 아이템 등록
  const handleRegisterItem = async (data: { quantity: number; unitPrice: number }) => {
    console.log('[ItemManagementTab] handleRegisterItem called', { selectedSearchItem, data })

    if (!selectedSearchItem) {
      console.log('[ItemManagementTab] No selected item')
      return
    }

    // 공식 API 등급/카테고리를 로컬 형식으로 변환
    const localGrade = GRADE_TO_LOCAL[selectedSearchItem.grade] || 'common'
    const localCategory = getCategoryType(selectedSearchItem.category)

    const totalPrice = data.quantity * data.unitPrice
    const itemData = {
      item_id: selectedSearchItem.id,
      item_name: selectedSearchItem.name,
      item_grade: localGrade,
      item_category: localCategory,
      quantity: data.quantity,
      unit_price: data.unitPrice,
      total_price: totalPrice,
      icon_url: selectedSearchItem.icon_url,
      sold_price: totalPrice,  // 등록 시 바로 판매 완료 처리
      sold_date: undefined     // API에서 현재 날짜로 설정
    }
    console.log('[ItemManagementTab] Calling onAddItem with:', itemData)

    try {
      await onAddItem(itemData)
      console.log('[ItemManagementTab] onAddItem completed')
    } catch (e) {
      console.error('[ItemManagementTab] onAddItem error:', e)
    }

    setShowRegisterModal(false)
    setSelectedSearchItem(null)
  }

  // 검색 결과 아이템 즐겨찾기
  const handleSearchItemFavorite = async (item: SearchResultItem) => {
    // 공식 API 등급/카테고리를 로컬 형식으로 변환
    const localGrade = GRADE_TO_LOCAL[item.grade] || 'common'
    const localCategory = getCategoryType(item.category)
    await onToggleFavorite(item.id, item.name, localGrade, localCategory, item.icon_url)
  }

  // 필터링된 아이템 (등록된 아이템 목록)
  const filteredItems = items.filter(item => {
    const matchesStatus =
      statusFilter === 'all' ? true :
      statusFilter === 'unsold' ? !item.is_sold :
      statusFilter === 'sold' ? item.is_sold : true
    return matchesStatus
  })

  // 슬롯 필터가 적용된 검색 가능한 아이템 목록
  const filteredSearchItems = slotFilter === 'all'
    ? allItems
    : allItems.filter(item => item.slotPos === parseInt(slotFilter))

  // 선택 토글
  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // 전체 선택/해제
  const toggleSelectAll = () => {
    const unsoldItems = filteredItems.filter(i => !i.is_sold)
    if (selectedItems.size === unsoldItems.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(unsoldItems.map(i => i.id)))
    }
  }

  // 선택된 아이템 판매완료 처리
  const handleSellSelected = async () => {
    const ids = Array.from(selectedItems)
    for (const id of ids) {
      const item = items.find(i => i.id === id)
      if (item && !item.is_sold) {
        await onSellItem(id, item.total_price)
      }
    }
    setSelectedItems(new Set())
  }

  // 전체 판매완료 처리
  const handleSellAll = async () => {
    const unsoldItems = filteredItems.filter(i => !i.is_sold)
    for (const item of unsoldItems) {
      await onSellItem(item.id, item.total_price)
    }
    setSelectedItems(new Set())
  }

  // 통계 계산
  const soldItems = items.filter(i => i.is_sold)
  const unsoldItems = items.filter(i => !i.is_sold)
  const totalSold = soldItems.reduce((sum, i) => sum + i.total_price, 0)
  const totalUnsold = unsoldItems.reduce((sum, i) => sum + i.total_price, 0)

  const unsoldCount = filteredItems.filter(i => !i.is_sold).length

  // 한국 시간 기준 게임 날짜 계산 (새벽 5시 기준)
  const getKoreanGameDate = () => {
    const now = new Date()
    const koreaOffset = 9 * 60
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000)
    const koreaTime = new Date(utcTime + (koreaOffset * 60000))

    if (koreaTime.getHours() < 5) {
      koreaTime.setDate(koreaTime.getDate() - 1)
    }

    const year = koreaTime.getFullYear()
    const month = String(koreaTime.getMonth() + 1).padStart(2, '0')
    const day = String(koreaTime.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // 날짜 포맷 함수
  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr)
    const dateOnly = dateStr.split('T')[0]

    // 한국 시간 기준 오늘/어제 계산
    const todayStr = getKoreanGameDate()
    const yesterdayDate = new Date(todayStr)
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0]

    const month = date.getMonth() + 1
    const day = date.getDate()
    const dateText = `${month}/${day}`

    if (dateOnly === todayStr) return `${dateText} (오늘)`
    if (dateOnly === yesterdayStr) return `${dateText} (어제)`

    return `${month}월 ${day}일`
  }

  // 날짜별 그룹화 함수
  const groupByDate = (itemList: typeof items, dateField: 'obtained_date' | 'sold_date') => {
    const groups: Record<string, typeof items> = {}

    itemList.forEach(item => {
      const dateValue = dateField === 'sold_date' ? item.sold_date : item.obtained_date
      const dateKey = dateValue ? dateValue.split('T')[0] : 'unknown'

      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(item)
    })

    // 날짜 내림차순 정렬 (최신순)
    const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a))
    return sortedKeys.map(key => ({
      date: key,
      label: key === 'unknown' ? '날짜 미정' : formatDateLabel(key),
      items: groups[key],
      totalPrice: groups[key].reduce((sum, i) => sum + i.total_price, 0)
    }))
  }

  // 미판매 아이템 날짜별 그룹화 (등록일 기준)
  const unsoldByDate = groupByDate(
    filteredItems.filter(i => !i.is_sold),
    'obtained_date'
  )

  // 판매완료 아이템 날짜별 그룹화 (판매일 기준)
  const soldByDate = groupByDate(
    filteredItems.filter(i => i.is_sold),
    'sold_date'
  )

  // 선택한 날짜의 판매 수입 계산
  const selectedDateSoldIncome = soldItems
    .filter(i => i.sold_date?.split('T')[0] === selectedDate)
    .reduce((sum, i) => sum + i.total_price, 0)

  return (
    <div>
      <div className={styles.container}>
        {/* 왼쪽 패널: 아이템 리스트 */}
        <div className={styles.leftPanel}>
          {/* 상단: 슬롯 드롭다운 + 검색 */}
          <div className={styles.header}>
            <div className={styles.headerTop}>
              <select
                value={slotFilter}
                onChange={(e) => setSlotFilter(e.target.value)}
                className={styles.categorySelect}
              >
                {SLOT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'unsold' | 'sold')}
                className={styles.statusSelect}
              >
                <option value="all">전체</option>
                <option value="unsold">판매대기</option>
                <option value="sold">판매완료</option>
              </select>
            </div>

            {/* 검색바 */}
            <div className={styles.searchContainer} ref={searchContainerRef}>
              <input
                type="text"
                placeholder={isLoadingItems ? "아이템 로딩 중..." : "아이템 이름 검색..."}
                value={searchQuery}
                onChange={(e) => {
                  const value = e.target.value
                  setSearchQuery(value)

                  // 기존 타이머 취소
                  if (searchDebounceRef.current) {
                    clearTimeout(searchDebounceRef.current)
                  }

                  // 150ms debounce 적용
                  searchDebounceRef.current = setTimeout(() => {
                    if (value.trim()) {
                      const query = value.toLowerCase()
                      const baseItems = slotFilter === 'all'
                        ? allItems
                        : allItems.filter(item => item.slotPos === parseInt(slotFilter))
                      const filtered = baseItems.filter(item =>
                        item.name.toLowerCase().includes(query)
                      )
                      setSearchResults(filtered)
                      setShowSearchResults(true)
                    } else {
                      setSearchResults([])
                      setShowSearchResults(false)
                    }
                  }, 150)
                }}
                onFocus={() => {
                  // 포커스 시 검색 결과 또는 최근 검색 표시
                  if (searchQuery.trim()) {
                    // 검색어가 있으면 해당 검색어로 필터링된 결과 표시
                    const query = searchQuery.toLowerCase()
                    const filtered = allItems.filter(item =>
                      item.name.toLowerCase().includes(query)
                    )
                    if (filtered.length > 0) {
                      setSearchResults(filtered)
                      setShowSearchResults(true)
                    }
                  } else if (recentSearches.length > 0) {
                    // 검색어가 없으면 최근 검색 표시
                    setSearchResults(recentSearches)
                    setShowSearchResults(true)
                  }
                }}
                className={styles.searchInput}
                disabled={isLoadingItems}
              />
              <button
                className={styles.searchButton}
                onClick={handleSearch}
                disabled={isLoadingItems}
              >
                <Search size={18} />
              </button>

              {/* 검색 결과 리스트 */}
              {showSearchResults && searchResults.length > 0 && (
              <div className={styles.searchResults}>
                {/* 최근 검색 헤더 */}
                {!searchQuery.trim() && recentSearches.length > 0 && (
                  <div className={styles.recentSearchHeader}>
                    <span>최근 검색</span>
                    <button
                      className={styles.clearRecentBtn}
                      onClick={(e) => {
                        e.stopPropagation()
                        setRecentSearches([])
                        localStorage.removeItem('recentItemSearches')
                        setShowSearchResults(false)
                      }}
                    >
                      전체 삭제
                    </button>
                  </div>
                )}
                {searchResults.slice(0, 15).map((item) => (
                  <div
                    key={item.id}
                    className={styles.searchResultItem}
                    onClick={() => handleSearchItemClick(item)}
                  >
                    <div className={styles.searchResultInfo}>
                      {item.icon_url ? (
                        <img
                          src={item.icon_url}
                          alt={item.name}
                          className={styles.searchResultIcon}
                          style={{ borderColor: GRADE_COLORS[item.grade] || '#9CA3AF' }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : (
                        <span className={styles.searchResultIconPlaceholder}>💎</span>
                      )}
                      <span className={styles.searchResultCategory}>{item.category}</span>
                      <span
                        className={styles.searchResultName}
                        style={{ color: GRADE_COLORS[item.grade] || '#E5E7EB' }}
                      >
                        {item.name}
                      </span>
                    </div>
                    <button
                      className={styles.searchFavoriteBtn}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSearchItemFavorite(item)
                      }}
                      title="즐겨찾기"
                    >
                      {favorites.some(f => f.item_id === item.id) ? '⭐' : '☆'}
                    </button>
                  </div>
                ))}
              </div>
              )}

              {showSearchResults && searchResults.length === 0 && !isLoadingItems && (
                <div className={styles.searchNoResults}>검색 결과가 없습니다</div>
              )}
            </div>
          </div>


          {/* 날짜별 아이템 목록 */}
          <div className={styles.dateGroupContainer}>
            {filteredItems.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📦</div>
                <div className={styles.emptyText}>등록된 아이템이 없습니다</div>
                <div className={styles.emptyHint}>아이템을 검색하여 등록하세요</div>
              </div>
            ) : (
              <>
                {/* 판매대기 아이템 섹션 */}
                {(statusFilter === 'all' || statusFilter === 'unsold') && unsoldByDate.length > 0 && (
                  <div className={styles.statusSection}>
                    <div className={styles.statusHeader}>
                      <span className={styles.statusIcon}>📦</span>
                      <span className={styles.statusTitle}>판매대기 아이템</span>
                      <span className={styles.statusTotal}>{totalUnsold.toLocaleString()} 키나</span>
                    </div>

                    {unsoldByDate.map(group => (
                      <div key={group.date} className={styles.dateSection}>
                        <div className={styles.dateHeader}>
                          <span className={styles.dateIcon}>📅</span>
                          <span className={styles.dateLabel}>{group.label}</span>
                          <span className={styles.dateCount}>{group.items.length}개</span>
                          <span className={styles.datePrice}>{group.totalPrice.toLocaleString()} 키나</span>
                        </div>
                        <div className={styles.itemGrid}>
                          {group.items.map((item) => (
                            <EnhancedItemCard
                              key={item.id}
                              item={item}
                              isSelected={selectedItems.has(item.id)}
                              onSelect={() => toggleSelectItem(item.id)}
                              onUpdate={onUpdateItem}
                              onSell={onSellItem}
                              onUnsell={onUnsellItem}
                              onDelete={onDeleteItem}
                              onToggleFavorite={onToggleFavorite}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 판매완료 아이템 섹션 */}
                {(statusFilter === 'all' || statusFilter === 'sold') && soldByDate.length > 0 && (
                  <div className={styles.statusSection}>
                    <div className={`${styles.statusHeader} ${styles.soldHeader}`}>
                      <span className={styles.statusIcon}>✅</span>
                      <span className={styles.statusTitle}>판매완료</span>
                      <span className={styles.statusTotal}>+{totalSold.toLocaleString()} 키나</span>
                    </div>

                    {soldByDate.map(group => (
                      <div key={group.date} className={`${styles.dateSection} ${styles.soldSection}`}>
                        <div className={styles.dateHeader}>
                          <span className={styles.dateIcon}>💰</span>
                          <span className={styles.dateLabel}>{group.label} 판매</span>
                          <span className={styles.dateCount}>{group.items.length}개</span>
                          <span className={styles.datePriceSold}>+{group.totalPrice.toLocaleString()} 키나</span>
                        </div>
                        <div className={styles.itemGrid}>
                          {group.items.map((item) => (
                            <EnhancedItemCard
                              key={item.id}
                              item={item}
                              isSelected={selectedItems.has(item.id)}
                              onSelect={() => toggleSelectItem(item.id)}
                              onUpdate={onUpdateItem}
                              onSell={onSellItem}
                              onUnsell={onUnsellItem}
                              onDelete={onDeleteItem}
                              onToggleFavorite={onToggleFavorite}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* 오른쪽 패널: 즐겨찾기 */}
        <div className={styles.rightPanel}>
          <FavoriteItemsPanel
            favorites={favorites}
            onSelectFavorite={(favorite) => {
              // 즐겨찾기 아이템을 SearchResultItem 형식으로 변환하여 모달 표시
              const searchItem: SearchResultItem = {
                id: favorite.item_id,
                name: favorite.item_name,
                grade: favorite.item_grade,
                category: favorite.item_category,
                icon_url: favorite.icon_url
              }
              setSelectedSearchItem(searchItem)
              setShowRegisterModal(true)
            }}
            onRemoveFavorite={onRemoveFavorite}
          />
        </div>
      </div>

      {/* 하단: 판매 통계 */}
      <div className={styles.summary}>
        <div className={styles.summaryTitle}>💰 아이템 판매 통계</div>
        <div className={styles.summaryGrid}>
          <div className={styles.summaryItem}>
            <div className={styles.summaryLabel}>선택일 수입</div>
            <div className={`${styles.summaryValue} ${styles.todayIncome}`}>+{selectedDateSoldIncome.toLocaleString()} 키나</div>
          </div>
          <div className={styles.summaryItem}>
            <div className={styles.summaryLabel}>총 판매 수입</div>
            <div className={styles.summaryValue}>+{totalSold.toLocaleString()} 키나</div>
          </div>
          <div className={styles.summaryItem}>
            <div className={styles.summaryLabel}>판매대기</div>
            <div className={styles.summaryValue}>{unsoldItems.length}개 / {totalUnsold.toLocaleString()} 키나</div>
          </div>
        </div>
      </div>

      {/* 아이템 등록 모달 */}
      {showRegisterModal && selectedSearchItem && (
        <ItemRegisterModal
          item={selectedSearchItem}
          onClose={() => {
            setShowRegisterModal(false)
            setSelectedSearchItem(null)
          }}
          onRegister={handleRegisterItem}
        />
      )}

    </div>
  )
}
