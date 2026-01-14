'use client'

import { useState } from 'react'
import styles from './TicketChargePopup.module.css'

interface TicketType {
  id: string
  name: string
  icon: string
  maxBase: number
}

const TICKET_TYPES: TicketType[] = [
  { id: 'transcend', name: '초월', icon: '🔥', maxBase: 14 },
  { id: 'expedition', name: '원정', icon: '⚔️', maxBase: 21 },
  { id: 'daily_dungeon', name: '일일던전', icon: '🏰', maxBase: 6 },
  { id: 'awakening', name: '각성전', icon: '⭐', maxBase: 6 },
  { id: 'nightmare', name: '악몽', icon: '👻', maxBase: 6 },
  { id: 'dimension', name: '차원침공', icon: '🌀', maxBase: 6 },
  { id: 'subjugation', name: '토벌전', icon: '⚡', maxBase: 6 },
  { id: 'sanctuary', name: '성역', icon: '🛡️', maxBase: 6 }
]

interface TicketChargePopupProps {
  isOpen: boolean
  onClose: () => void
  onCharge: (charges: Record<string, number>) => void
  currentTickets?: Record<string, { base: number; bonus: number }>
}

export default function TicketChargePopup({
  isOpen,
  onClose,
  onCharge,
  currentTickets = {}
}: TicketChargePopupProps) {
  const [charges, setCharges] = useState<Record<string, number>>({})

  if (!isOpen) return null

  const handleIncrement = (ticketId: string) => {
    setCharges(prev => ({
      ...prev,
      [ticketId]: (prev[ticketId] || 0) + 1
    }))
  }

  const handleDecrement = (ticketId: string) => {
    setCharges(prev => {
      const current = prev[ticketId] || 0
      if (current <= 0) return prev
      return {
        ...prev,
        [ticketId]: current - 1
      }
    })
  }

  const handleConfirm = () => {
    // 충전할 티켓이 있는지 확인
    const hasCharges = Object.values(charges).some(count => count > 0)

    if (!hasCharges) {
      alert('충전할 티켓을 선택해주세요.')
      return
    }

    // 충전 내역 요약
    const chargeList = TICKET_TYPES
      .filter(ticket => charges[ticket.id] > 0)
      .map(ticket => `${ticket.icon} ${ticket.name}: +${charges[ticket.id]}`)
      .join('\n')

    const confirmed = window.confirm(
      `다음 이용권을 충전하시겠습니까?\n\n${chargeList}\n\n※ 충전 후에는 취소할 수 없습니다.`
    )

    if (confirmed) {
      onCharge(charges)
      setCharges({})
      onClose()
    }
  }

  const handleCancel = () => {
    setCharges({})
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={handleCancel}>
      <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
        {/* 말풍선 꼬리 */}
        <div className={styles.tail} />

        {/* 헤더 */}
        <div className={styles.header}>
          <h3 className={styles.title}>⚡ 컨텐츠 이용권 충전</h3>
          <button className={styles.closeBtn} onClick={handleCancel}>
            ✕
          </button>
        </div>

        {/* 티켓 리스트 */}
        <div className={styles.ticketList}>
          {TICKET_TYPES.map(ticket => {
            const current = currentTickets[ticket.id]
            const chargeCount = charges[ticket.id] || 0

            return (
              <div key={ticket.id} className={styles.ticketRow}>
                {/* 티켓 이름 */}
                <div className={styles.ticketName}>
                  <span className={styles.ticketIcon}>{ticket.icon}</span>
                  <span>{ticket.name}</span>
                </div>

                {/* 현재 상태 */}
                <div className={styles.ticketStatus}>
                  <span className={styles.current}>
                    {current?.base || 0}/{ticket.maxBase}
                  </span>
                  {(current?.bonus || 0) > 0 && (
                    <span className={styles.bonus}>(+{current.bonus})</span>
                  )}
                </div>

                {/* 충전 컨트롤 */}
                <div className={styles.controls}>
                  <button
                    className={styles.decrementBtn}
                    onClick={() => handleDecrement(ticket.id)}
                    disabled={chargeCount === 0}
                  >
                    −
                  </button>
                  <span className={styles.chargeCount}>{chargeCount}</span>
                  <button
                    className={styles.incrementBtn}
                    onClick={() => handleIncrement(ticket.id)}
                  >
                    +
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* 푸터 */}
        <div className={styles.footer}>
          <button className={styles.confirmBtn} onClick={handleConfirm}>
            충전하기
          </button>
          <button className={styles.cancelBtn} onClick={handleCancel}>
            취소
          </button>
        </div>
      </div>
    </div>
  )
}
