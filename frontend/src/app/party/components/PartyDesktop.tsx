'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { usePartyList } from '@/hooks/usePartyList'
import { useMyParties } from '@/hooks/useMyParties'
import type { DungeonType, PartyStatus } from '@/types/party'
import PartyFilter from './PartyFilter'
import PartyList from './PartyList'
import PartyCard from './PartyCard'
import MyCharacters from './MyCharacters'
import PartyGuide from './PartyGuide'
import NotificationBell from './NotificationBell'
import PartyDebugPanel from './PartyDebugPanel'
import styles from '../page.module.css'

// 모달 지연 로딩
const CreatePartyModal = dynamic(() => import('./CreatePartyModal'), { ssr: false })
const PartyDetailModal = dynamic(() => import('./PartyDetailModal'), { ssr: false })

type TabType = 'all' | 'my'

// --- DUMMY DATA FOR TESTING LAYOUT ---
const DUMMY_MEMBERS: any[] = [
    { slot_id: '1', user_id: 'u1', character_name: '테스트1', character_class: '검성', character_server_id: 1, status: 'approved', character_combat_power: 320000, character_breakthrough: 15, character_item_level: 350, race: 'Elyos' },
    { slot_id: '2', user_id: 'u2', character_name: '테스트2', character_class: '치유성', character_server_id: 1, status: 'approved', character_combat_power: 310000, character_breakthrough: 12, character_item_level: 345, race: 'Elyos' },
    { slot_id: '3', user_id: 'u3', character_name: '테스트3', character_class: '호법성', character_server_id: 1, status: 'approved', character_combat_power: 330000, character_breakthrough: 18, character_item_level: 355, race: 'Elyos' },
    { slot_id: '4', user_id: 'u4', character_name: '테스트4', character_class: '궁성', character_server_id: 1, status: 'approved', character_combat_power: 315000, character_breakthrough: 14, character_item_level: 348, race: 'Elyos' },
];

const DUMMY_PARTIES: any[] = Array.from({ length: 9 }).map((_, i) => ({
    id: `dummy-${i}`,
    user_id: 'u1',
    title: `[테스트] 3열 그리드 레이아웃 확인용 (${i + 1})`,
    dungeon_type: i % 2 === 0 ? 'expedition' : 'transcend',
    dungeon_name: '테스트 던전',
    dungeon_tier: 1,
    status: 'recruiting',
    max_members: 4,
    current_members: 4,
    is_immediate: i < 3, // 첫 3개는 즉시, 나머지는 예약
    scheduled_date: '2025-02-01',
    scheduled_time_start: '20:00',
    character_name: '파티장',
    character_class: '검성',
    character_server_id: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    members: DUMMY_MEMBERS,
    slots: [
        { id: '1', slot_number: 0, status: 'filled' },
        { id: '2', slot_number: 1, status: 'filled' },
        { id: '3', slot_number: 2, status: 'filled' },
        { id: '4', slot_number: 3, status: 'filled' },
    ]
}));
// -------------------------------------

export default function PartyDesktop() {
    const [activeTab, setActiveTab] = useState<TabType>('all')
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

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>파티찾기</h1>
                <div className={styles.headerActions}>
                    <Link href="/party/my" className={styles.myPartyLink}>
                        👤 내파티
                        {myCounts.total > 0 && (
                            <span className={styles.myPartyCount}>참여중 {myCounts.total}개</span>
                        )}
                    </Link>
                    <NotificationBell />
                </div>
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
                    내 파티 ({myCounts.total})
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
                        <button
                            className={styles.createButton}
                            onClick={() => setShowCreateModal(true)}
                        >
                            + 파티 모집하기
                        </button>
                    </div>

                    <PartyList
                        parties={[...parties, ...DUMMY_PARTIES] as any[]}
                        loading={loading}
                        emptyMessage="모집 중인 파티가 없습니다."
                        onSelect={setSelectedPartyId}
                    />
                </>
            ) : (
                <div className={styles.myParties}>
                    {/* 내가 만든 파티 */}
                    <div className={styles.mySection}>
                        <h3 className={styles.mySectionTitle}>👑 내가 만든 파티 ({myCreatedParties.length})</h3>
                        {loadingMyParties ? (
                            <p className={styles.loading}>불러오는 중...</p>
                        ) : myCreatedParties.length === 0 ? (
                            <p className={styles.empty}>만든 파티가 없습니다.</p>
                        ) : (
                            <div className={styles.myGrid}>
                                {myCreatedParties.map(party => (
                                    <PartyCard
                                        key={party.id}
                                        party={party}
                                        showPendingBadge={true}
                                        onSelect={setSelectedPartyId}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 참여 중인 파티 */}
                    <div className={styles.mySection}>
                        <h3 className={styles.mySectionTitle}>🙋 참여 중인 파티 ({myJoinedParties.length})</h3>
                        {loadingMyParties ? (
                            <p className={styles.loading}>불러오는 중...</p>
                        ) : myJoinedParties.length === 0 ? (
                            <p className={styles.empty}>참여 중인 파티가 없습니다.</p>
                        ) : (
                            <div className={styles.myGrid}>
                                {myJoinedParties.map(party => (
                                    <PartyCard
                                        key={party.id}
                                        party={party}
                                        showMyRole={true}
                                        myMember={party.my_member}
                                        onSelect={setSelectedPartyId}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 신청 대기 중 */}
                    <div className={styles.mySection}>
                        <h3 className={styles.mySectionTitle}>⏳ 신청 대기 중 ({myPendingParties.length})</h3>
                        {loadingMyParties ? (
                            <p className={styles.loading}>불러오는 중...</p>
                        ) : myPendingParties.length === 0 ? (
                            <p className={styles.empty}>신청 대기 중인 파티가 없습니다.</p>
                        ) : (
                            <div className={styles.myGrid}>
                                {myPendingParties.map(party => (
                                    <PartyCard
                                        key={party.id}
                                        party={party}
                                        myApplication={party.my_application}
                                        onSelect={setSelectedPartyId}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
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
                }}
            />

            {/* 파티 상세 모달 */}
            {selectedPartyId && (
                <PartyDetailModal
                    partyId={selectedPartyId}
                    isOpen={true}
                    onClose={() => setSelectedPartyId(null)}
                />
            )}

            {/* 디버그 패널 */}
            <PartyDebugPanel
                sections={[
                    {
                        title: '파티 목록 (parties)',
                        data: {
                            count: parties.length,
                            parties: parties.map(p => ({
                                id: p.id,
                                title: p.title,
                                dungeon: p.dungeon_name,
                                status: p.status,
                                members: `${p.current_members}/${p.max_members}`
                            }))
                        }
                    },
                    {
                        title: '필터 파라미터',
                        data: {
                            selectedType,
                            selectedStatus,
                            pagination
                        }
                    },
                    {
                        title: '내 파티 (My Parties)',
                        data: {
                            created: myCreatedParties.length,
                            joined: myJoinedParties.length,
                            pending: myPendingParties.length,
                            total: myCounts.total
                        }
                    },
                    {
                        title: '로딩 상태',
                        data: {
                            loading,
                            loadingMyParties
                        }
                    }
                ]}
            />
        </div >
    )
}
