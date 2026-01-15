'use client'

import { useState } from 'react'
import styles from './EnhancedItemCard.module.css'

export interface EnhancedLedgerItem {
  id: string
  item_id: string
  item_name: string
  item_grade: string
  item_category: string
  quantity: number
  unit_price: number
  total_price: number
  is_sold: boolean
  sold_date?: string
  is_favorite?: boolean
}

interface EnhancedItemCardProps {
  item: EnhancedLedgerItem
  isSelected?: boolean
  onSelect?: () => void
  onUpdate: (id: string, data: Partial<EnhancedLedgerItem>) => Promise<void>
  onSell: (id: string, soldPrice: number) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onToggleFavorite: (itemId: string, itemName: string, itemGrade: string, itemCategory: string) => Promise<void>
}

const GRADE_LABELS: Record<string, string> = {
  // 로컬 형식
  common: '일반',
  rare: '희귀',
  heroic: '영웅',
  legendary: '전설',
  ultimate: '궁극',
  // 공식 API 형식 (레거시 데이터 호환)
  Common: '일반',
  Rare: '희귀',
  Epic: '영웅',
  Unique: '전설',
  Legend: '전승'
}

const GRADE_COLORS: Record<string, string> = {
  // 로컬 형식
  common: '#9CA3AF',
  rare: '#60A5FA',
  heroic: '#7E3DCF',
  legendary: '#FBBF24',
  ultimate: '#FB9800',
  // 공식 API 형식 (레거시 데이터 호환)
  Common: '#9CA3AF',
  Rare: '#60A5FA',
  Epic: '#7E3DCF',
  Unique: '#FBBF24',
  Legend: '#FB9800'
}

export default function EnhancedItemCard({
  item,
  isSelected = false,
  onSelect,
  onUpdate,
  onSell,
  onDelete,
  onToggleFavorite
}: EnhancedItemCardProps) {
  const [isUpdating, setIsUpdating] = useState(false)

  const handleSell = async () => {
    if (item.is_sold) return
    setIsUpdating(true)
    try {
      await onSell(item.id, item.total_price)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (confirm(`"${item.item_name}"을(를) 삭제하시겠습니까?`)) {
      setIsUpdating(true)
      try {
        await onDelete(item.id)
      } finally {
        setIsUpdating(false)
      }
    }
  }

  const handleToggleFavorite = async () => {
    setIsUpdating(true)
    try {
      await onToggleFavorite(item.item_id, item.item_name, item.item_grade, item.item_category)
    } finally {
      setIsUpdating(false)
    }
  }

  const getGradeClass = (grade: string) => {
    // 등급 문자열을 소문자로 변환하여 매핑
    const normalizedGrade = grade.toLowerCase()
    const gradeMap: Record<string, string> = {
      'common': styles.gradeCommon,
      'rare': styles.gradeRare,
      'heroic': styles.gradeHeroic,
      'epic': styles.gradeHeroic,      // 공식 API Epic = 영웅
      'legendary': styles.gradeLegendary,
      'unique': styles.gradeLegendary,  // 공식 API Unique = 전설
      'ultimate': styles.gradeUltimate,
      'legend': styles.gradeUltimate    // 공식 API Legend = 전승
    }
    return gradeMap[normalizedGrade] || styles.gradeCommon
  }

  const getGradeColor = (grade: string) => {
    return GRADE_COLORS[grade] || GRADE_COLORS[grade.toLowerCase()] || '#9CA3AF'
  }

  return (
    <div className={`${styles.card} ${item.is_sold ? styles.cardSold : ''} ${isSelected ? styles.cardSelected : ''}`}>
      {/* 선택 체크박스 (미판매만) */}
      {!item.is_sold && onSelect && (
        <div className={styles.selectCheckbox} onClick={onSelect}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}}
            className={styles.checkbox}
          />
        </div>
      )}

      {item.is_sold && (
        <div className={styles.soldBadge}>✓ 판매완료</div>
      )}

      {/* 헤더: 아이템 정보 */}
      <div className={styles.header}>
        <div className={styles.itemIcon}>💎</div>
        <div className={styles.itemInfo}>
          <div
            className={styles.itemName}
            title={item.item_name}
            style={{ color: getGradeColor(item.item_grade) }}
          >
            {item.item_name}
          </div>
          <div className={styles.itemMeta}>
            <span
              className={`${styles.grade} ${getGradeClass(item.item_grade)}`}
              style={{ color: getGradeColor(item.item_grade) }}
            >
              {GRADE_LABELS[item.item_grade] || item.item_grade}
            </span>
          </div>
        </div>
        <button
          className={`${styles.favoriteBtn} ${item.is_favorite ? styles.favoriteActive : ''}`}
          onClick={handleToggleFavorite}
          disabled={isUpdating}
          title={item.is_favorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
        >
          {item.is_favorite ? '⭐' : '☆'}
        </button>
      </div>

      {/* 수량 및 가격 */}
      <div className={styles.priceInfo}>
        <div className={styles.priceRow}>
          <span className={styles.priceLabel}>수량</span>
          <span className={styles.priceValue}>{item.quantity}개</span>
        </div>
        <div className={styles.priceRow}>
          <span className={styles.priceLabel}>단가</span>
          <span className={styles.priceValue}>{item.unit_price.toLocaleString()}</span>
        </div>
        <div className={`${styles.priceRow} ${styles.totalRow}`}>
          <span className={styles.priceLabel}>총액</span>
          <span className={styles.totalValue}>{item.total_price.toLocaleString()} 키나</span>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className={styles.actions}>
        {!item.is_sold && (
          <button
            className={styles.sellBtn}
            onClick={handleSell}
            disabled={isUpdating}
          >
            💰 판매완료
          </button>
        )}
        <button
          className={styles.deleteBtn}
          onClick={handleDelete}
          disabled={isUpdating}
        >
          🗑️
        </button>
      </div>
    </div>
  )
}
