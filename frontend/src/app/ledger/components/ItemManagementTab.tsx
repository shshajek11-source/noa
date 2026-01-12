'use client'

import { useState } from 'react'
import EnhancedItemCard, { EnhancedLedgerItem } from './EnhancedItemCard'
import FavoriteItemsPanel, { FavoriteItem } from './FavoriteItemsPanel'
import styles from './ItemManagementTab.module.css'

interface ItemManagementTabProps {
  items: EnhancedLedgerItem[]
  favorites: FavoriteItem[]
  onAddItem: () => void
  onUpdateItem: (id: string, data: Partial<EnhancedLedgerItem>) => Promise<void>
  onSellItem: (id: string) => Promise<void>
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
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'unsold' | 'sold'>('all')

  // 필터링된 아이템
  const filteredItems = items.filter(item => {
    // 검색 필터
    const matchesSearch = item.item_name.toLowerCase().includes(searchQuery.toLowerCase())

    // 상태 필터
    const matchesStatus =
      filterStatus === 'all' ? true :
      filterStatus === 'unsold' ? !item.is_sold :
      filterStatus === 'sold' ? item.is_sold : true

    return matchesSearch && matchesStatus
  })

  // 통계 계산
  const soldItems = items.filter(i => i.is_sold)
  const unsoldItems = items.filter(i => !i.is_sold)
  const totalSold = soldItems.reduce((sum, i) => sum + i.total_price, 0)
  const totalUnsold = unsoldItems.reduce((sum, i) => sum + i.total_price, 0)

  return (
    <div>
      <div className={styles.container}>
        {/* 왼쪽 패널: 아이템 리스트 */}
        <div className={styles.leftPanel}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <button className={styles.addButton} onClick={onAddItem}>
                <span>+</span>
                <span>아이템 추가</span>
              </button>
              <input
                type="text"
                placeholder="아이템 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'unsold' | 'sold')}
              className={styles.filterSelect}
            >
              <option value="all">전체</option>
              <option value="unsold">미판매</option>
              <option value="sold">판매완료</option>
            </select>
          </div>

          <div className={styles.itemList}>
            {filteredItems.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📦</div>
                <div className={styles.emptyText}>
                  {searchQuery || filterStatus !== 'all'
                    ? '검색 결과가 없습니다'
                    : '등록된 아이템이 없습니다'}
                </div>
                <div className={styles.emptyHint}>
                  "아이템 추가" 버튼을 클릭하여 아이템을 추가하세요
                </div>
              </div>
            ) : (
              filteredItems.map((item) => (
                <EnhancedItemCard
                  key={item.id}
                  item={item}
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

      {/* 하단: 판매 합계 */}
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
    </div>
  )
}
