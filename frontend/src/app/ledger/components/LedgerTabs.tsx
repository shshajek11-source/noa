'use client'

import { Plus, LayoutDashboard, X } from 'lucide-react'
import { LedgerCharacter } from '@/types/ledger'
import styles from '../ledger.module.css'

interface LedgerTabsProps {
  characters: LedgerCharacter[]
  activeTab: string
  onTabChange: (tabId: string) => void
  onAddCharacter: () => void
  onDeleteCharacter: (id: string) => void
}

export default function LedgerTabs({
  characters,
  activeTab,
  onTabChange,
  onAddCharacter,
  onDeleteCharacter
}: LedgerTabsProps) {

  const handleDelete = (e: React.MouseEvent, charId: string, charName: string) => {
    e.stopPropagation()
    if (confirm(`"${charName}" 캐릭터를 삭제하시겠습니까?`)) {
      onDeleteCharacter(charId)
    }
  }

  return (
    <div className={styles.tabs}>
      {/* 총합 대시보드 탭 */}
      <button
        className={`${styles.tab} ${activeTab === 'dashboard' ? styles.tabActive : ''}`}
        onClick={() => onTabChange('dashboard')}
      >
        <LayoutDashboard size={18} />
        총합
      </button>

      {/* 캐릭터 탭들 */}
      {characters.map((char) => {
        // 프로필 이미지 URL 처리
        let profileImg = char.profile_image || ''
        if (profileImg && profileImg.startsWith('/')) {
          profileImg = `https://profileimg.plaync.com${profileImg}`
        }
        // 종족 표시 (영어 → 한국어 변환)
        const race = char.race || char.race_name || ''
        const raceKorean = race.toLowerCase() === 'asmodian' ? '마족' :
                          race.toLowerCase() === 'elyos' ? '천족' : race

        return (
        <button
          key={char.id}
          className={`${styles.tab} ${styles.tabCharacter} ${activeTab === char.id ? styles.tabActive : ''}`}
          onClick={() => onTabChange(char.id)}
        >
          {profileImg ? (
            <img
              src={profileImg}
              alt={char.name}
              className={styles.tabAvatar}
            />
          ) : (
            <div className={styles.tabAvatar} style={{
              background: '#27282e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              color: '#a5a8b4'
            }}>
              {char.name[0]}
            </div>
          )}
          <div className={styles.tabInfo}>
            <span className={styles.tabName}>{char.name}</span>
            <span className={styles.tabMeta}>
              {char.server_name}
              {char.class_name && ` · ${char.class_name}`}
              {raceKorean && ` · ${raceKorean}`}
              {char.item_level && ` · IL${char.item_level}`}
            </span>
          </div>
          <span
            className={styles.tabDelete}
            onClick={(e) => handleDelete(e, char.id, char.name)}
            title="캐릭터 삭제"
          >
            <X size={14} />
          </span>
        </button>
        )
      })}

      {/* 캐릭터 추가 버튼 */}
      <button
        className={`${styles.tab} ${styles.tabAdd}`}
        onClick={onAddCharacter}
      >
        <Plus size={18} />
        캐릭터 추가
      </button>
    </div>
  )
}
