'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { usePartyList } from '@/hooks/usePartyList'
import { useMyParties } from '@/hooks/useMyParties'
import type { DungeonType, PartyStatus, PartyPost, PartySlot, PartyMember } from '@/types/party'
import PartyFilter from './PartyFilter'
import PartyList from './PartyList'
import MyCharacters from './MyCharacters'
import PartyGuide from './PartyGuide'
import NotificationBell from './NotificationBell'
import MyPartyCompactList from './MyPartyCompactList'
import styles from '../page.module.css'

// 모달 지연 로딩
const CreatePartyModal = dynamic(() => import('./CreatePartyModal'), { ssr: false })
const PartyDetailModal = dynamic(() => import('./PartyDetailModal'), { ssr: false })
const MyPartyModal = dynamic(() => import('./MyPartyModal'), { ssr: false })
const PartyApplyConfirmModal = dynamic(() => import('./PartyApplyConfirmModal'), { ssr: false })

// 파티 타입 (슬롯, 멤버 포함)
type PartyWithDetails = PartyPost & {
    slots?: PartySlot[]
    members?: PartyMember[]
    current_members?: number
}

type TabType = 'all' | 'my'

export default function PartyDesktop() {
    const [activeTab, setActiveTab] = useState<TabType>('all')
    const [selectedType, setSelectedType] = useState<DungeonType | 'all'>('all')
    const [selectedStatus, setSelectedStatus] = useState<PartyStatus | 'all'>('recruiting')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showMyPartyModal, setShowMyPartyModal] = useState(false)
    const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null)

    // 신청 확인 모달용 상태
    const [confirmParty, setConfirmParty] = useState<PartyWithDetails | null>(null)

    const { parties, loading, pagination, updateParams, refresh } = usePartyList({
        status: selectedStatus,
        dungeon_type: selectedType === 'all' ? undefined : selectedType
    })

    const {
        created: myCreatedParties,
        joined: myJoinedParties,
        pending: myPendingParties,
        counts: myCounts,
        loading: loadingMyParties,
        refresh: refreshMyParties
    } = useMyParties()

    const handleTypeChange = (type: DungeonType | 'all') => {
        setSelectedType(type)
        updateParams({
            dungeon_type: type === 'all' ? undefined : type
        })
    }

    const handleStatusChange = (status: PartyStatus | 'all') => {
        setSelectedStatus(status)
        updateParams({
            status: status === 'all' ? undefined : status
        })
    }

    // 내가 관련된 파티 ID 목록 (만든 파티 + 참여 중 + 신청 대기)
    const myCreatedPartyIds = myCreatedParties.map(p => p.id)
    const myJoinedPartyIds = myJoinedParties.map(p => p.id)
    const myPendingPartyIds = myPendingParties.map(p => p.id)
    const myRelatedPartyIds = [...myCreatedPartyIds, ...myJoinedPartyIds, ...myPendingPartyIds]

    // 모든 파티 탭에서 파티 카드 클릭 시
    const handlePartyCardClick = (partyId: string) => {
        // 본인이 관련된 파티면 상세 모달 표시 (만든 파티, 참여 중, 신청 대기)
        if (myRelatedPartyIds.includes(partyId)) {
            setSelectedPartyId(partyId)
            return
        }
        // 다른 사람 파티면 신청 확인 모달 표시
        const party = parties.find(p => p.id === partyId)
        if (party) {
            setConfirmParty(party as PartyWithDetails)
        }
    }


    // 내 파티 탭에서 클릭 시 - 파티 상세 모달 표시
    const handleMyPartyCardClick = (partyId: string) => {
        setSelectedPartyId(partyId)
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>파티찾기</h1>
            </div>

            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'all' ? styles.active : ''}`}
                    onClick={() => setActiveTab('all')}
                >
                    모든 파티
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'my' ? styles.active : ''}`}
                    onClick={() => setActiveTab('my')}
                >
                    내 파티 현황 ({myCounts.total})
                </button>
            </div>

            {activeTab === 'all' ? (
                <>
                    <MyCharacters />
                    <PartyGuide />

                    <div className={styles.filterRow}>
                        <PartyFilter
                            selectedType={selectedType}
                            selectedStatus={selectedStatus}
                            onTypeChange={handleTypeChange}
                            onStatusChange={handleStatusChange}
                        />
                        <div className={styles.actionButtons}>
                            <button
                                className={styles.createButton}
                                onClick={() => setShowCreateModal(true)}
                            >
                                + 파티 모집하기
                            </button>
                            <button
                                className={styles.myPartyButton}
                                onClick={() => setShowMyPartyModal(true)}
                            >
                                👤 내 파티 현황
                                {myCounts.total > 0 && (
                                    <span className={styles.myPartyCount}>{myCounts.total}</span>
                                )}
                            </button>
                            <NotificationBell />
                        </div>
                    </div>

                    <PartyList
                        parties={parties}
                        loading={loading}
                        emptyMessage="모집 중인 파티가 없습니다."
                        onSelect={handlePartyCardClick}
                    />
                </>
            ) : (
                <div className={styles.myParties}>
                    <MyPartyCompactList
                        title="내가 만든 파티"
                        icon="👑"
                        parties={myCreatedParties}
                        loading={loadingMyParties}
                        emptyMessage="만든 파티가 없습니다."
                        type="created"
                        onSelect={handleMyPartyCardClick}
                    />
                    <MyPartyCompactList
                        title="참여 중인 파티"
                        icon="🙋"
                        parties={myJoinedParties}
                        loading={loadingMyParties}
                        emptyMessage="참여 중인 파티가 없습니다."
                        type="joined"
                        onSelect={handleMyPartyCardClick}
                    />
                    <MyPartyCompactList
                        title="신청 대기 중"
                        icon="⏳"
                        parties={myPendingParties}
                        loading={loadingMyParties}
                        emptyMessage="신청 대기 중인 파티가 없습니다."
                        type="pending"
                        onSelect={handleMyPartyCardClick}
                    />
                    {myCounts.total === 0 && !loadingMyParties && (
                        <p className={styles.empty}>참여/신청한 파티가 없습니다.</p>
                    )}
                </div>
            )
            }

            {/* 파티 모집 모달 */}
            <CreatePartyModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreated={(partyId) => {
                    setShowCreateModal(false)
                    setSelectedPartyId(partyId)
                    refresh()
                    refreshMyParties()
                }}
            />

            {/* 파티 상세 모달 */}
            {selectedPartyId && (
                <PartyDetailModal
                    partyId={selectedPartyId}
                    isOpen={true}
                    onClose={() => setSelectedPartyId(null)}
                    onDeleted={() => {
                        refresh()
                        refreshMyParties()
                    }}
                />
            )}

            {/* 내 파티 모달 */}
            <MyPartyModal
                isOpen={showMyPartyModal}
                onClose={() => setShowMyPartyModal(false)}
                onSelectParty={(partyId) => {
                    setShowMyPartyModal(false)
                    setSelectedPartyId(partyId)
                }}
            />

            {/* 파티 신청 확인 모달 */}
            {confirmParty && (
                <PartyApplyConfirmModal
                    party={confirmParty}
                    isOpen={true}
                    onClose={() => setConfirmParty(null)}
                    onApplied={() => {
                        setConfirmParty(null)
                        refresh()
                        refreshMyParties()
                    }}
                />
            )}

        </div >
    )
}
