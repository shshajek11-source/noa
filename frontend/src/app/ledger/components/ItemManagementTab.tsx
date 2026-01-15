'use client'

import { useState, useCallback, useEffect } from 'react'
import { Search } from 'lucide-react'
import EnhancedItemCard, { EnhancedLedgerItem } from './EnhancedItemCard'
import FavoriteItemsPanel, { FavoriteItem } from './FavoriteItemsPanel'
import ItemRegisterModal from './ItemRegisterModal'
import styles from './ItemManagementTab.module.css'

// 공식 API 등급 색상
const GRADE_COLORS: Record<string, string> = {
  'Epic': '#7E3DCF',
  'Unique': '#FFB84D',
  'Legend': '#FB9800',
  'Rare': '#60A5FA',
  'Common': '#9CA3AF'
}

// 공식 API 등급 -> 로컬 등급 변환
const GRADE_TO_LOCAL: Record<string, string> = {
  'Epic': 'heroic',
  'Unique': 'legendary',
  'Legend': 'ultimate',
  'Rare': 'rare',
  'Common': 'common'
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
  onAddItem: (item: any) => Promise<void>
  onUpdateItem: (id: string, data: Partial<EnhancedLedgerItem>) => Promise<void>
  onSellItem: (id: string, soldPrice: number) => Promise<void>
  onDeleteItem: (id: string) => Promise<void>
  onToggleFavorite: (itemId: string, itemName: string, itemGrade: string, itemCategory: string) => Promise<void>
  onSelectFavorite: (favorite: FavoriteItem) => void
  onRemoveFavorite: (id: string) => Promise<void>
}

export default function ItemManagementTab({
  items,
  favorites,
  onAddItem,
  onUpdateItem,
  onSellItem,
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
    setSelectedSearchItem(item)
    setShowRegisterModal(true)
    setShowSearchResults(false)
    setSearchQuery('')
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

    const itemData = {
      item_id: selectedSearchItem.id,
      item_name: selectedSearchItem.name,
      item_grade: localGrade,
      item_category: localCategory,
      quantity: data.quantity,
      unit_price: data.unitPrice,
      total_price: data.quantity * data.unitPrice
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
    await onToggleFavorite(item.id, item.name, localGrade, localCategory)
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
                <option value="unsold">미판매</option>
                <option value="sold">판매완료</option>
              </select>
            </div>

            {/* 검색바 */}
            <div className={styles.searchContainer}>
              <input
                type="text"
                placeholder={isLoadingItems ? "아이템 로딩 중..." : "아이템 이름 검색..."}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  // 입력할 때마다 실시간 검색
                  if (e.target.value.trim()) {
                    const query = e.target.value.toLowerCase()
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
                }}
                onFocus={() => {
                  // 포커스 시 슬롯 필터에 맞는 전체 목록 표시
                  if (!searchQuery.trim()) {
                    const baseItems = slotFilter === 'all'
                      ? allItems.slice(0, 20)
                      : allItems.filter(item => item.slotPos === parseInt(slotFilter)).slice(0, 20)
                    setSearchResults(baseItems)
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
            </div>

            {/* 검색 결과 리스트 */}
            {showSearchResults && searchResults.length > 0 && (
              <div className={styles.searchResults}>
                {searchResults.slice(0, 15).map((item) => (
                  <div key={item.id} className={styles.searchResultItem}>
                    <div
                      className={styles.searchResultInfo}
                      onClick={() => handleSearchItemClick(item)}
                    >
                      {item.icon_url ? (
                        <img
                          src={item.icon_url}
                          alt={item.name}
                          className={styles.searchResultIcon}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : (
                        <span className={styles.searchResultIconPlaceholder}>💎</span>
                      )}
                      <span
                        className={styles.gradeTag}
                        style={{
                          backgroundColor: `${GRADE_COLORS[item.grade] || '#9CA3AF'}20`,
                          color: GRADE_COLORS[item.grade] || '#9CA3AF'
                        }}
                      >
                        {item.grade}
                      </span>
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

          {/* 일괄 처리 버튼 */}
          {unsoldCount > 0 && (
            <div className={styles.bulkActions}>
              <button className={styles.bulkBtn} onClick={toggleSelectAll}>
                {selectedItems.size === unsoldCount ? '선택 해제' : '전체 선택'}
              </button>
              {selectedItems.size > 0 && (
                <button className={styles.bulkSellBtn} onClick={handleSellSelected}>
                  선택 완료 ({selectedItems.size}개)
                </button>
              )}
              <button className={styles.bulkSellAllBtn} onClick={handleSellAll}>
                전체 완료
              </button>
            </div>
          )}

          {/* 4열 그리드 아이템 목록 */}
          <div className={styles.itemGrid}>
            {filteredItems.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📦</div>
                <div className={styles.emptyText}>등록된 아이템이 없습니다</div>
                <div className={styles.emptyHint}>아이템을 검색하여 등록하세요</div>
              </div>
            ) : (
              filteredItems.map((item) => (
                <EnhancedItemCard
                  key={item.id}
                  item={item}
                  isSelected={selectedItems.has(item.id)}
                  onSelect={() => toggleSelectItem(item.id)}
                  onUpdate={onUpdateItem}
                  onSell={onSellItem}
                  onDelete={onDeleteItem}
                  onToggleFavorite={onToggleFavorite}
                />
              ))
            )}
          </div>
        </div>

        {/* 오른쪽 패널: 즐겨찾기 */}
        <div className={styles.rightPanel}>
          <FavoriteItemsPanel
            favorites={favorites}
            onSelectFavorite={onSelectFavorite}
            onRemoveFavorite={onRemoveFavorite}
          />
        </div>
      </div>

      {/* 하단: 판매 통계 */}
      <div className={styles.summary}>
        <div className={styles.summaryTitle}>💰 아이템 판매 통계</div>
        <div className={styles.summaryGrid}>
          <div className={styles.summaryItem}>
            <div className={styles.summaryLabel}>판매 완료</div>
            <div className={styles.summaryValue}>{totalSold.toLocaleString()} 키나</div>
          </div>
          <div className={styles.summaryItem}>
            <div className={styles.summaryLabel}>미판매 아이템</div>
            <div className={styles.summaryValue}>{unsoldItems.length}개</div>
          </div>
          <div className={styles.summaryItem}>
            <div className={styles.summaryLabel}>미판매 총액</div>
            <div className={styles.summaryValue}>{totalUnsold.toLocaleString()} 키나</div>
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
