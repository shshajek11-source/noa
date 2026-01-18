'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { usePartyList } from '@/hooks/usePartyList'
import { useMyParties } from '@/hooks/useMyParties'
import type { DungeonType, PartyStatus } from '@/types/party'
import PartyFilter from './components/PartyFilter'
import PartyList from './components/PartyList'
import PartyCard from './components/PartyCard'
import MyCharacters from './components/MyCharacters'
import PartyGuide from './components/PartyGuide'
import NotificationBell from './components/NotificationBell'

// 모달 지연 로딩 (파티 생성 버튼 클릭 시에만 로드)
const CreatePartyModal = dynamic(() => import('./components/CreatePartyModal'), { ssr: false })
import PartyDebugPanel from './components/PartyDebugPanel'
import styles from './page.module.css'

// 임시 비활성화 플래그 (메뉴에서만 숨김, 페이지는 접근 가능)
const DISABLED = false;

type TabType = 'all' | 'my'

export default function PartyPage() {
  // 페이지 비활성화
  if (DISABLED) {
    return (
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        textAlign: 'center',
        background: 'linear-gradient(180deg, #0B0D12 0%, #1a1d24 100%)'
      }}>
        <div style={{
          fontSize: '64px',
          marginBottom: '24px'
        }}>🔧</div>
        <h1 style={{
          fontSize: '1.8rem',
          fontWeight: 700,
          color: '#E5E7EB',
          marginBottom: '12px'
        }}>파티 찾기 페이지 준비 중</h1>
        <p style={{
          fontSize: '1rem',
          color: '#9CA3AF',
          marginBottom: '32px',
          lineHeight: 1.6
        }}>
          더 나은 서비스를 위해 페이지를 개선하고 있습니다.<br />
          빠른 시일 내에 다시 찾아뵙겠습니다.
        </p>
        <a href="/" style={{
          padding: '12px 24px',
          background: '#FACC15',
          color: '#0B0D12',
          borderRadius: '8px',
          fontWeight: 600,
          textDecoration: 'none'
        }}>메인으로 돌아가기</a>
      </div>
    );
  }
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [selectedType, setSelectedType] = useState<DungeonType | 'all'>('all')
  const [selectedStatus, setSelectedStatus] = useState<PartyStatus | 'all'>('recruiting')
  const [showCreateModal, setShowCreateModal] = useState(false)

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
            parties={parties}
            loading={loading}
            emptyMessage="모집 중인 파티가 없습니다."
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
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 파티 모집 모달 */}
      <CreatePartyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

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
    </div>
  )
}
