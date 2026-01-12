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
  onUpdate: (id: string, data: Partial<EnhancedLedgerItem>) => Promise<void>
  onSell: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onToggleFavorite: (itemId: string, itemName: string, itemGrade: string, itemCategory: string) => Promise<void>
}

export default function EnhancedItemCard({ item, onUpdate, onSell, onDelete, onToggleFavorite }: EnhancedItemCardProps) {
  const [quantity, setQuantity] = useState(item.quantity)
  const [unitPrice, setUnitPrice] = useState(item.unit_price)
  const [isUpdating, setIsUpdating] = useState(false)

  const totalPrice = quantity * unitPrice

  const handleQuantityChange = async (newQuantity: number) => {
    if (newQuantity < 1 || item.is_sold) return

    setQuantity(newQuantity)
    setIsUpdating(true)
    try {
      await onUpdate(item.id, {
        quantity: newQuantity,
        total_price: newQuantity * unitPrice
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handlePriceChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (item.is_sold) return

    const newPrice = parseInt(e.target.value.replace(/,/g, '')) || 0
    setUnitPrice(newPrice)
  }

  const handlePriceBlur = async () => {
    if (item.is_sold || unitPrice === item.unit_price) return

    setIsUpdating(true)
    try {
      await onUpdate(item.id, {
        unit_price: unitPrice,
        total_price: quantity * unitPrice
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSell = async () => {
    if (item.is_sold) return
    setIsUpdating(true)
    try {
      await onSell(item.id)
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
    const gradeMap: Record<string, string> = {
      'common': styles.gradeCommon,
      'rare': styles.gradeRare,
      'heroic': styles.gradeHeroic,
      'legendary': styles.gradeLegendary,
      'ultimate': styles.gradeUltimate
    }
    return gradeMap[grade.toLowerCase()] || styles.gradeCommon
  }

  return (
    <div className={`${styles.card} ${item.is_sold ? styles.cardSold : ''}`}>
      {item.is_sold && (
        <div className={styles.soldBadge}>
          ✓ 판매완료
        </div>
      )}

      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.icon}>💎</div>
          <div className={styles.info}>
            <div className={styles.itemName}>{item.item_name}</div>
            <div className={styles.meta}>
              <span className={`${styles.grade} ${getGradeClass(item.item_grade)}`}>
                {item.item_grade}
              </span>
              <span className={styles.category}>{item.item_category}</span>
            </div>
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

      <div className={styles.divider} />

      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <div className={styles.controlLabel}>개수</div>
          <div className={styles.quantityControl}>
            <button
              className={styles.quantityBtn}
              onClick={() => handleQuantityChange(quantity - 1)}
              disabled={quantity <= 1 || item.is_sold || isUpdating}
            >
              −
            </button>
            <div className={styles.quantityValue}>{quantity}</div>
            <button
              className={styles.quantityBtn}
              onClick={() => handleQuantityChange(quantity + 1)}
              disabled={item.is_sold || isUpdating}
            >
              +
            </button>
          </div>
        </div>

        <div className={styles.controlGroup}>
          <div className={styles.controlLabel}>단가 (키나)</div>
          <input
            type="text"
            value={unitPrice.toLocaleString()}
            onChange={handlePriceChange}
            onBlur={handlePriceBlur}
            disabled={item.is_sold || isUpdating}
            className={styles.priceInput}
          />
        </div>
      </div>

      <div className={styles.total}>
        <span className={styles.totalLabel}>총액</span>
        <span className={styles.totalValue}>{totalPrice.toLocaleString()} 키나</span>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.sellBtn}
          onClick={handleSell}
          disabled={item.is_sold || isUpdating}
        >
          {item.is_sold ? '✓ 판매완료' : '✅ 판매완료 처리'}
        </button>
        <button
          className={styles.deleteBtn}
          onClick={handleDelete}
          disabled={isUpdating}
        >
          🗑️ 삭제
        </button>
      </div>
    </div>
  )
}
