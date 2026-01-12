'use client'

import styles from './LedgerSubTabs.module.css'

export type SubTabType = 'content' | 'item'

interface LedgerSubTabsProps {
  activeTab: SubTabType
  onTabChange: (tab: SubTabType) => void
}

export default function LedgerSubTabs({ activeTab, onTabChange }: LedgerSubTabsProps) {
  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'content' ? styles.tabActive : ''}`}
          onClick={() => onTabChange('content')}
        >
          <span className={styles.icon}>📊</span>
          <span>컨텐츠</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'item' ? styles.tabActive : ''}`}
          onClick={() => onTabChange('item')}
        >
          <span className={styles.icon}>💎</span>
          <span>아이템</span>
        </button>
      </div>
    </div>
  )
}
