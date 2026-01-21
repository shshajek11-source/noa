'use client'

import { useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { usePartyList } from '@/hooks/usePartyList'
import { useMyParties } from '@/hooks/useMyParties'
import type { DungeonType, PartyStatus } from '@/types/party'
import NotificationBell from './NotificationBell'
import PartyCard from './PartyCard'
import MyCharacters from './MyCharacters'
import styles from './PartyMobile.module.css'

// 모달은 동일하게 사용
const CreatePartyModal = dynamic(() => import('./CreatePartyModal'), { ssr: false })
const PartyDetailModal = dynamic(() => import('./PartyDetailModal'), { ssr: false })

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
    const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null)

    const { parties, loading, pagination, updateParams, refresh } = usePartyList({
        status: selectedStatus,
        dungeon_type: selectedType === 'all' ? undefined : selectedType
    })

    const {
        created: myCreatedParties,
        joined: myJoinedParties,
        pending: myPendingParties,
        counts: myCounts,
        loading: loadingMyParties
    } = useMyParties()

    const handleTypeChange = (type: DungeonType | 'all') => {
        setSelectedType(type)
        updateParams({ dungeon_type: type === 'all' ? undefined : type })
    }

    const handleStatusChange = (status: PartyStatus | 'all') => {
        setSelectedStatus(status)
        updateParams({ status: status === 'all' ? undefined : status })
    }

    return (
        <div className={styles.mobileContainer}>
            {/* 1. 헤더 */}
            <header className={styles.header}>
                <h1 className={styles.title}>파티찾기</h1>
                <div className={styles.actions}>
                    <Link href="/party/my" className={styles.myPartyLink}>
                        내파티 ({myCounts.total})
                    </Link>
                    <NotificationBell />
                </div>
            </header>

            {/* 2. 내 캐릭터 (상단 배치) */}
            <section style={{ marginBottom: '16px' }}>
                <MyCharacters />
            </section>

            {/* 3. 탭 & 필터 */}
            <div className={styles.filterSection}>
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === 'all' ? styles.active : ''}`}
                        onClick={() => setActiveTab('all')}
                    >
                        전체 목록
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'my' ? styles.active : ''}`}
                        onClick={() => setActiveTab('my')}
                    >
                        내 파티 관리
                    </button>
                </div>

                {activeTab === 'all' && (
                    <>
                        <div className={styles.filters}>
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

                        <div className={styles.statusFilter}>
                            <button
                                className={`${styles.statusChip} ${selectedStatus === 'recruiting' ? styles.active : ''}`}
                                onClick={() => handleStatusChange('recruiting')}
                            >
                                모집중만 보기
                            </button>
                            <button
                                className={`${styles.statusChip} ${selectedStatus === 'all' ? styles.active : ''}`}
                                onClick={() => handleStatusChange('all')}
                            >
                                마감 포함
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* 4. 파티 리스트 */}
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
                                    onSelect={setSelectedPartyId}
                                />
                            ))
                        )}
                    </>
                ) : (
                    <div className={styles.myParties}>
                        {/* 내 파티 섹션들 (간소화) */}
                        {myCreatedParties.length > 0 && (
                            <>
                                <h3 style={{ color: '#fff', fontSize: '1rem', margin: '10px 0' }}>👑 내가 만든 파티</h3>
                                {myCreatedParties.map(p => (
                                    <PartyCard key={p.id} party={p} onSelect={setSelectedPartyId} showPendingBadge />
                                ))}
                            </>
                        )}

                        {myJoinedParties.length > 0 && (
                            <>
                                <h3 style={{ color: '#fff', fontSize: '1rem', margin: '20px 0 10px' }}>🙋 참여 중인 파티</h3>
                                {myJoinedParties.map(p => (
                                    <PartyCard key={p.id} party={p} onSelect={setSelectedPartyId} showMyRole myMember={p.my_member} />
                                ))}
                            </>
                        )}

                        {myPendingParties.length > 0 && (
                            <>
                                <h3 style={{ color: '#fff', fontSize: '1rem', margin: '20px 0 10px' }}>⏳ 신청 대기 중</h3>
                                {myPendingParties.map(p => (
                                    <PartyCard key={p.id} party={p} onSelect={setSelectedPartyId} myApplication={p.my_application} />
                                ))}
                            </>
                        )}

                        {myCounts.total === 0 && (
                            <div className={styles.empty}>참여/신청한 파티가 없습니다.</div>
                        )}
                    </div>
                )}
            </main>

            {/* 5. 플로팅 버튼 */}
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
                }}
            />

            {selectedPartyId && (
                <PartyDetailModal
                    partyId={selectedPartyId}
                    isOpen={true}
                    onClose={() => setSelectedPartyId(null)}
                />
            )}
        </div>
    )
}
