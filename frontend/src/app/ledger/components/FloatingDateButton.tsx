'use client'

import styles from './FloatingDateButton.module.css'

interface FloatingDateButtonProps {
  selectedDate: string
  onClick: () => void
}

export default function FloatingDateButton({ selectedDate, onClick }: FloatingDateButtonProps) {
  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr)
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${month}/${day}`
  }

  return (
    <button className={styles.floatingButton} onClick={onClick} title="날짜 선택">
      <div className={styles.icon}>📅</div>
      <div className={styles.date}>{formatDateDisplay(selectedDate)}</div>
    </button>
  )
}
