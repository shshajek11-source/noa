'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import styles from './ItemRegisterModal.module.css'

interface SearchResultItem {
  id: string
  name: string
  grade: string
  category: string
  icon_url?: string
}

interface ItemRegisterModalProps {
  item: SearchResultItem
  onClose: () => void
  onRegister: (data: { quantity: number; unitPrice: number }) => Promise<void>
}

// 공식 API 등급 -> 한국어
const GRADE_LABELS: Record<string, string> = {
  'Epic': '영웅',
  'Unique': '유일',
  'Legend': '전승',
  'Rare': '희귀',
  'Common': '일반',
  // 레거시
  common: '일반',
  rare: '희귀',
  heroic: '영웅',
  legendary: '전설',
  ultimate: '궁극'
}

// 공식 API 등급 색상
const GRADE_COLORS: Record<string, string> = {
  'Epic': '#7E3DCF',
  'Unique': '#FFB84D',
  'Legend': '#FB9800',
  'Rare': '#60A5FA',
  'Common': '#9CA3AF'
}

const CATEGORY_LABELS: Record<string, string> = {
  equipment: '장비',
  material: '재료',
  wing: '날개',
  etc: '기타'
}

export default function ItemRegisterModal({
  item,
  onClose,
  onRegister
}: ItemRegisterModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [unitPrice, setUnitPrice] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const totalPrice = quantity * unitPrice

  const handleSubmit = async () => {
    if (quantity < 1) return

    setIsSubmitting(true)
    try {
      await onRegister({ quantity, unitPrice })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, '')
    const numValue = parseInt(value) || 0
    setUnitPrice(numValue)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>아이템 등록</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          {/* 아이템 정보 */}
          <div className={styles.itemInfo}>
            <div className={styles.itemIcon}>
              {item.icon_url ? (
                <img
                  src={item.icon_url}
                  alt={item.name}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : '💎'}
            </div>
            <div className={styles.itemDetails}>
              <div
                className={styles.itemName}
                style={{ color: GRADE_COLORS[item.grade] || '#E5E7EB' }}
              >
                {item.name}
              </div>
              <div className={styles.itemMeta}>
                <span
                  className={styles.grade}
                  style={{
                    backgroundColor: `${GRADE_COLORS[item.grade] || '#9CA3AF'}20`,
                    color: GRADE_COLORS[item.grade] || '#9CA3AF'
                  }}
                >
                  {GRADE_LABELS[item.grade] || item.grade}
                </span>
                <span className={styles.category}>
                  {item.category}
                </span>
              </div>
            </div>
          </div>

          {/* 입력 필드 */}
          <div className={styles.fields}>
            <div className={styles.field}>
              <label className={styles.label}>개수</label>
              <div className={styles.quantityControl}>
                <button
                  className={styles.quantityBtn}
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  −
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className={styles.quantityInput}
                  min={1}
                />
                <button
                  className={styles.quantityBtn}
                  onClick={() => setQuantity(quantity + 1)}
                >
                  +
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>판매 단가 (키나)</label>
              <input
                type="text"
                value={unitPrice.toLocaleString()}
                onChange={handlePriceChange}
                className={styles.priceInput}
                placeholder="0"
              />
            </div>
          </div>

          {/* 총액 표시 */}
          <div className={styles.totalSection}>
            <span className={styles.totalLabel}>총 판매 금액</span>
            <span className={styles.totalValue}>{totalPrice.toLocaleString()} 키나</span>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>
            취소
          </button>
          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={isSubmitting || quantity < 1}
          >
            {isSubmitting ? '등록 중...' : '등록'}
          </button>
        </div>
      </div>
    </div>
  )
}
