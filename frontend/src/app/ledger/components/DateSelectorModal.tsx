'use client'

import { useState, useEffect } from 'react'
import styles from './DateSelectorModal.module.css'

interface DateSelectorModalProps {
  isOpen: boolean
  currentDate: string
  onClose: () => void
  onSelectDate: (date: string) => void
}

export default function DateSelectorModal({ isOpen, currentDate, onClose, onSelectDate }: DateSelectorModalProps) {
  const [selectedDate, setSelectedDate] = useState(currentDate)

  useEffect(() => {
    setSelectedDate(currentDate)
  }, [currentDate])

  if (!isOpen) return null

  const formatDateKorean = (dateStr: string) => {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const weekdays = ['일', '월', '화', '수', '목', '금', '토']
    const weekday = weekdays[date.getDay()]
    return `${year}년 ${month}월 ${day}일 (${weekday})`
  }

  const getQuickDate = (daysOffset: number) => {
    const date = new Date()
    date.setDate(date.getDate() + daysOffset)
    return date.toISOString().split('T')[0]
  }

  const handleQuickSelect = (daysOffset: number) => {
    const newDate = getQuickDate(daysOffset)
    setSelectedDate(newDate)
  }

  const handleConfirm = () => {
    onSelectDate(selectedDate)
    onClose()
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>📅 날짜 선택</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.currentDate}>
          <div className={styles.currentDateLabel}>선택된 날짜</div>
          <div className={styles.currentDateValue}>{formatDateKorean(selectedDate)}</div>
        </div>

        <div className={styles.dateInputWrapper}>
          <label htmlFor="date-modal-input" className={styles.dateLabel}>
            날짜 직접 선택
          </label>
          <input
            id="date-modal-input"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className={styles.dateInput}
          />
        </div>

        <div className={styles.quickSelect}>
          <button
            className={styles.quickButton}
            onClick={() => handleQuickSelect(0)}
          >
            오늘
          </button>
          <button
            className={styles.quickButton}
            onClick={() => handleQuickSelect(-1)}
          >
            어제
          </button>
          <button
            className={styles.quickButton}
            onClick={() => handleQuickSelect(-7)}
          >
            일주일 전
          </button>
          <button
            className={styles.quickButton}
            onClick={() => handleQuickSelect(-30)}
          >
            한달 전
          </button>
        </div>

        <div className={styles.actions}>
          <button className={styles.cancelButton} onClick={onClose}>
            취소
          </button>
          <button className={styles.confirmButton} onClick={handleConfirm}>
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
