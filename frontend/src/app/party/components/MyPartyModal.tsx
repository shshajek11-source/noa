'use client'

import { useMyParties } from '@/hooks/useMyParties'
import MyPartyCompactList from './MyPartyCompactList'
import styles from './MyPartyModal.module.css'

interface MyPartyModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectParty: (partyId: string) => void
}

export default function MyPartyModal({ isOpen, onClose, onSelectParty }: MyPartyModalProps) {
  const {
    created: myCreatedParties,
    joined: myJoinedParties,
    pending: myPendingParties,
    counts: myCounts,
    loading: loadingMyParties,
    refresh
  } = useMyParties()

  if (!isOpen) return null

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleSelectParty = (partyId: string) => {
    onSelectParty(partyId)
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>👤 내 파티 현황 ({myCounts.total})</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.modalContent}>
          {loadingMyParties ? (
            <p className={styles.loading}>불러오는 중...</p>
          ) : myCounts.total === 0 ? (
            <div className={styles.emptyState}>
              <p>참여 중인 파티가 없습니다.</p>
              <p className={styles.emptyHint}>파티에 참여하거나 새로운 파티를 만들어보세요!</p>
            </div>
          ) : (
            <div className={styles.sections}>
              <MyPartyCompactList
                title="내가 만든 파티"
                icon="👑"
                parties={myCreatedParties}
                loading={false}
                emptyMessage="만든 파티가 없습니다."
                type="created"
                onSelect={handleSelectParty}
                onDelete={refresh}
              />
              <MyPartyCompactList
                title="참여 중인 파티"
                icon="🙋"
                parties={myJoinedParties}
                loading={false}
                emptyMessage="참여 중인 파티가 없습니다."
                type="joined"
                onSelect={handleSelectParty}
              />
              <MyPartyCompactList
                title="신청 대기 중"
                icon="⏳"
                parties={myPendingParties}
                loading={false}
                emptyMessage="신청 대기 중인 파티가 없습니다."
                type="pending"
                onSelect={handleSelectParty}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
