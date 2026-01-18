'use client'
import { useState, useMemo } from 'react'
import { aggregateStats, getStatPageCategory } from '../../lib/statsAggregator'
import type { StatPageCategory } from '../../types/stats'
import styles from './ProfileSection.module.css'
import StatsRadarChart from './StatsRadarChart'
import StatsDetailAccordion from './StatsDetailAccordion'

interface OcrStat {
  name: string
  value: string
  isPercentage?: boolean
}

interface StatsSummaryViewProps {
  stats: any
  equipment: any[]
  daevanion: any
  titles: any
  equippedTitleId?: number
  characterId?: string
  serverId?: string
  ocrStats?: OcrStat[]
}

type TabId = 'total' | 'equipment' | 'titles' | 'daevanion' | 'mainStats'

const TABS: { id: TabId, label: string, icon: string }[] = [
  { id: 'total', label: '전체', icon: '📊' },
  { id: 'equipment', label: '장비', icon: '⚔️' },
  { id: 'titles', label: '타이틀', icon: '🏅' },
  { id: 'daevanion', label: '대바니온', icon: '🔮' },
  { id: 'mainStats', label: '주요스탯', icon: '⭐' },
]

// 스탯 정렬 순서 정의
const STAT_SORT_ORDER: Record<string, number> = {
  // 기본 능력치
  '공격력': 1, '방어력': 2, '명중': 3, '회피': 4,
  '치명타': 5, '치명타 저항': 6, '생명력': 7, '정신력': 8,
  '전투 속도': 9, '이동 속도': 10,
  // 주요스탯
  '위력': 11, '민첩': 12, '지식': 13, '정확': 14, '의지': 15, '체력': 16,
}

// 탭에서 제외할 스탯
const EQUIPMENT_EXCLUDED_STATS = new Set(['위력', '민첩', '정확', '의지', '지식', '체력'])

export default function StatsSummaryView({ stats, equipment, daevanion, titles, equippedTitleId, ocrStats }: StatsSummaryViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>('total')
  const [expandedStats, setExpandedStats] = useState<Set<string>>(new Set())

  // 스탯 집계 (OCR 스탯이 있으면 오버라이드)
  const aggregatedStats = useMemo(() => {
    return aggregateStats(equipment, titles, daevanion, stats, equippedTitleId, ocrStats)
  }, [equipment, titles, daevanion, stats, equippedTitleId, ocrStats])

  // 주요스탯 데이터 추출 (기본 API 데이터에서)
  const mainStatsData = useMemo(() => {
    if (!stats?.statList) return []
    return stats.statList.filter((stat: any) => stat.name !== '아이템레벨')
  }, [stats])

  // 기본 능력치 추출 (aggregatedStats에서)
  const basicStats = useMemo(() => {
    const BASIC_NAMES = new Set(['공격력', '방어력', '명중', '회피', '치명타', '치명타 저항', '생명력', '정신력', '전투 속도', '이동 속도'])
    return aggregatedStats.filter(s => BASIC_NAMES.has(s.name)).sort((a, b) => {
      return (STAT_SORT_ORDER[a.name] || 99) - (STAT_SORT_ORDER[b.name] || 99)
    })
  }, [aggregatedStats])

  // 주요 스탯 추출 (aggregatedStats에서 - 위력, 민첩 등)
  const primaryStats = useMemo(() => {
    const PRIMARY_NAMES = new Set(['위력', '민첩', '지식', '정확', '의지', '체력'])
    return aggregatedStats.filter(s => PRIMARY_NAMES.has(s.name)).sort((a, b) => {
      return (STAT_SORT_ORDER[a.name] || 99) - (STAT_SORT_ORDER[b.name] || 99)
    })
  }, [aggregatedStats])

  // 드롭다운 토글
  const toggleExpand = (statName: string) => {
    const newExpanded = new Set(expandedStats)
    if (newExpanded.has(statName)) {
      newExpanded.delete(statName)
    } else {
      newExpanded.add(statName)
    }
    setExpandedStats(newExpanded)
  }

  // Unified Card Render Function
  const renderUnifiedCard = (stat: typeof aggregatedStats[0], keyPrefix: string = '') => {
    const isExpanded = expandedStats.has(keyPrefix + stat.name)
    const isPercentage = stat.totalPercentage > 0 && stat.totalValue === 0

    const displayValue = isPercentage
      ? `+${stat.totalPercentage.toFixed(1)}%`
      : stat.totalValue.toLocaleString()

    const subValue = (!isPercentage && stat.totalPercentage > 0)
      ? `+${stat.totalPercentage.toFixed(1)}%`
      : null

    return (
      <div key={keyPrefix + stat.name}>
        <div className={styles.unifiedStatCard} onClick={() => toggleExpand(keyPrefix + stat.name)}>
          {/* Top: Name & Indicator */}
          <div className={styles.elementsTop}>
            <div className={styles.colorIndicator} style={{ background: stat.color, boxShadow: `0 0 8px ${stat.color}` }} />
            <span className={styles.statName}>{stat.name}</span>
          </div>

          {/* Bottom: Value */}
          <div className={styles.elementsBottom}>
            <span className={`${styles.statValue} ${isExpanded ? styles.highlight : ''}`}>
              {displayValue}
            </span>
            {subValue && <span className={styles.statSubValue}>{subValue}</span>}
          </div>
        </div>

        {/* Detail View */}
        {isExpanded && (
          <div style={{ marginTop: '0.25rem' }}>
            <StatsDetailAccordion stat={{ ...stat, isExpanded: true }} onToggle={() => { }} />
          </div>
        )}
      </div>
    )
  }

  // '전체' 탭 렌더링
  const renderTotalTab = () => {
    return (
      <>
        {/* 1. Radar Chart */}
        <div className={styles.chartContainer}>
          <StatsRadarChart stats={aggregatedStats || []} />
        </div>

        {/* 2. Basic Stats Section */}
        <div className={styles.sectionHeader}>기본 능력치</div>
        <div className={styles.unifiedGrid}>
          {basicStats.map(stat => renderUnifiedCard(stat, 'total_basic_'))}
        </div>

        {/* 3. Main Stats Section */}
        <div className={styles.sectionHeader}>주요 스탯</div>
        <div className={styles.unifiedGrid}>
          {primaryStats.map(stat => renderUnifiedCard(stat, 'total_main_'))}
        </div>
      </>
    )
  }

  // Other tabs render logic (simplified to use unified cards)
  const renderOtherTab = (filterFn: (s: any) => boolean, keyPrefix: string) => {
    const validStats = aggregatedStats.filter(filterFn)
    if (validStats.length === 0) return <div className={styles.noData}>데이터가 없습니다.</div>

    return (
      <div className={styles.unifiedGrid}>
        {validStats.map(s => renderUnifiedCard(s, keyPrefix))}
      </div>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'total': return renderTotalTab()
      case 'equipment': return renderOtherTab(s => s.sources.equipment.length > 0 && !EQUIPMENT_EXCLUDED_STATS.has(s.name), 'equip_')
      case 'titles': return renderOtherTab(s => s.sources.titles.length > 0, 'title_')
      case 'daevanion': return renderOtherTab(s => s.sources.daevanion.length > 0, 'daevanion_')
      // MainStats tab duplicate logic but okay for user preference
      case 'mainStats': return renderOtherTab(s => new Set(['위력', '민첩', '지식', '정확', '의지', '체력']).has(s.name), 'main_')
      default: return null
    }
  }

  return (
    <div className={styles.statsContainer}>
      {/* New Tab Bar */}
      <div className={styles.modernTabBar}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`${styles.modernTab} ${activeTab === tab.id ? styles.modernTabActive : ''}`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className={styles.statsContent}>
        {renderContent()}
      </div>
    </div>
  )
}
