'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { usePartyList } from '@/hooks/usePartyList'
import { useMyParties } from '@/hooks/useMyParties'
import type { DungeonType, PartyStatus, PartyPost, PartySlot, PartyMember } from '@/types/party'
import NotificationBell from './NotificationBell'
import PartyCard from './PartyCard'
import MyCharacters from './MyCharacters'
import MyPartyCompactList from './MyPartyCompactList'
import styles from './PartyMobile.module.css'

// 모달은 동일하게 사용
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

const DUNGEON_TYPES: { value: DungeonType; label: string }[] = [
    { value: 'transcend', label: '초월' },
    { value: 'expedition', label: '원정' },
    { value: 'sanctuary', label: '성역' },
    { value: 'subjugation', label: '토벌전' },
    { value: 'pvp', label: 'PVP' }
]

export default function PartyMobile() {
    const [activeTab, setActiveTab] = useState<'all' | 'my'>('all')
    const [selectedType, setSelectedType] = useState<DungeonType | 'all'>('all')
    const [selectedStatus, setSelectedStatus] = useState<PartyStatus | 'all'>('recruiting')

    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showMyPartyModal, setShowMyPartyModal] = useState(false)
    const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null)
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
        updateParams({ dungeon_type: type === 'all' ? undefined : type })
    }

    const handleStatusChange = (status: PartyStatus | 'all') => {
        setSelectedStatus(status)
        updateParams({ status: status === 'all' ? undefined : status })
    }

    // 내가 만든 파티 ID 목록
    const myCreatedPartyIds = myCreatedParties.map(p => p.id)

    // 전체 파티 목록에서 카드 클릭 시
    const handlePartyCardClick = (partyId: string) => {
        // 본인이 만든 파티면 상세 모달 표시
        if (myCreatedPartyIds.includes(partyId)) {
            setSelectedPartyId(partyId)
            return
        }
        // 다른 사람 파티면 신청 확인 모달 표시
        const party = parties.find(p => p.id === partyId)
        if (party) {
            setConfirmParty(party as PartyWithDetails)
        }
    }

    // 내 파티 탭에서 카드 클릭 시 - 파티 상세 모달 표시
    const handleMyPartyCardClick = (partyId: string) => {
        setSelectedPartyId(partyId)
    }

    return (
        <div className={styles.mobileContainer}>
            {/* 1. 헤더 (Sticky 아님 - 광고 호환) */}
            <header className={styles.header}>
                <div className={styles.headerTop}>
                    <h1 className={styles.title}>PARTY</h1>
                    <div className={styles.actions}>
                        <NotificationBell />
                    </div>
                </div>
            </header>

            {/* 2. 내 캐릭터 (상단 배치, 일반 스크롤) */}
            <section className={styles.characterSection}>
                <MyCharacters isMobile={true} />
            </section>

            {/* 3. 메인 탭 */}
            <div className={styles.mainTabs}>
                <button
                    className={`${styles.mainTab} ${activeTab === 'all' ? styles.active : ''}`}
                    onClick={() => setActiveTab('all')}
                >
                    <span className={styles.tabLabel}>전체 모집</span>
                    <span className={styles.tabCount}>{parties.length}</span>
                </button>
                <button
                    className={`${styles.mainTab} ${activeTab === 'my' ? styles.active : ''}`}
                    onClick={() => setActiveTab('my')}
                >
                    <span className={styles.tabLabel}>내 파티</span>
                    <span className={styles.tabCount}>{myCounts.total}</span>
                </button>
            </div>

            {/* 4. 필터 및 상태 영역 */}
            {activeTab === 'all' && (
                <div className={styles.filterArea}>
                    <div className={styles.dungeonFilters}>
                        <button
                            className={`${styles.filterChip} ${selectedType === 'all' ? styles.active : ''}`}
                            onClick={() => handleTypeChange('all')}
                        >
                            전체
                        </button>
                        {DUNGEON_TYPES.map(type => (
                            <button
                                key={type.value}
                                className={`${styles.filterChip} ${selectedType === type.value ? styles.active : ''}`}
                                onClick={() => handleTypeChange(type.value)}
                            >
                                {type.label}
                            </button>
                        ))}
                    </div>

                    <div className={styles.statusRow}>
                        <div className={styles.statusChips}>
                            <button
                                className={`${styles.statusChip} ${selectedStatus === 'recruiting' ? styles.active : ''}`}
                                onClick={() => handleStatusChange('recruiting')}
                            >
                                모집중
                            </button>
                            <button
                                className={`${styles.statusChip} ${selectedStatus === 'all' ? styles.active : ''}`}
                                onClick={() => handleStatusChange('all')}
                            >
                                전체보기
                            </button>
                        </div>
                        <button
                            className={styles.refreshButton}
                            onClick={() => refresh()}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                                <path d="M21 3v5h-5" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* 5. 파티 리스트 */}
            <main className={styles.partyList}>
                {activeTab === 'all' ? (
                    <>
                        {loading ? (
                            <div className={styles.empty}>로딩 중...</div>
                        ) : parties.length === 0 ? (
                            <div className={styles.empty}>모집 중인 파티가 없습니다.</div>
                        ) : (
                            parties.map(party => (
                                <PartyCard
                                    key={party.id}
                                    party={party}
                                    onSelect={handlePartyCardClick}
                                />
                            ))
                        )}
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
                            <div className={styles.empty}>참여/신청한 파티가 없습니다.</div>
                        )}
                    </div>
                )}
            </main>

            {/* 6. 플로팅 버튼 */}
            {activeTab === 'all' && (
                <button className={styles.fab} onClick={() => setShowCreateModal(true)}>
                    +
                </button>
            )}

            {/* 모달 */}
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

            <MyPartyModal
                isOpen={showMyPartyModal}
                onClose={() => setShowMyPartyModal(false)}
                onSelectParty={(partyId) => {
                    setShowMyPartyModal(false)
                    setSelectedPartyId(partyId)
                }}
            />

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

            {/* 광고 공간 확보를 위한 하단 여백 */}
            <div className={styles.bottomSpacer} />
        </div>
    )
}
