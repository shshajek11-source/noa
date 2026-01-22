'use client'
import { useState, useMemo } from 'react'
import { aggregateStats, getStatCategory } from '../../lib/statsAggregator'
import type { StatCategory } from '../../types/stats'
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

type TabId = 'total' | 'detail'

const TABS: { id: TabId, label: string }[] = [
  { id: 'total', label: '전체' },
  { id: 'detail', label: '능력치 상세' },
]

// 섹션 정의
interface SectionConfig {
  id: string
  label: string
  icon: string
  color: string
  bgColor: string
  categories: StatCategory[]
}

const SECTIONS: SectionConfig[] = [
  {
    id: 'attack',
    label: '공격 계열',
    icon: '⚔️',
    color: '#EF4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    categories: ['attack']
  },
  {
    id: 'defense',
    label: '방어 계열',
    icon: '🛡️',
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    categories: ['defense']
  },
  {
    id: 'utility',
    label: '유틸리티',
    icon: '⚡',
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    categories: ['utility']
  }
]

export default function StatsSummaryView({ stats, equipment, daevanion, titles, equippedTitleId, ocrStats }: StatsSummaryViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>('total')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['attack', 'defense', 'utility']))
  const [expandedStats, setExpandedStats] = useState<Set<string>>(new Set())

  // 스탯 집계
  const aggregatedStats = useMemo(() => {
    return aggregateStats(equipment, titles, daevanion, stats, equippedTitleId, ocrStats)
  }, [equipment, titles, daevanion, stats, equippedTitleId, ocrStats])

  // 카테고리별 스탯 분류
  const statsByCategory = useMemo(() => {
    const result: Record<string, typeof aggregatedStats> = {
      attack: [],
      defense: [],
      utility: []
    }

    aggregatedStats.forEach(stat => {
      const category = stat.category || getStatCategory(stat.name)
      if (result[category]) {
        result[category].push(stat)
      } else {
        result.utility.push(stat) // 기본값은 유틸리티
      }
    })

    return result
  }, [aggregatedStats])

  // 섹션 토글
  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  // 스탯 상세 토글
  const toggleStatDetail = (statName: string) => {
    const newExpanded = new Set(expandedStats)
    if (newExpanded.has(statName)) {
      newExpanded.delete(statName)
    } else {
      newExpanded.add(statName)
    }
    setExpandedStats(newExpanded)
  }

  // '전체' 탭 - 레이더 차트 + 주요 능력치 요약
  const renderTotalTab = () => {
    // 주요 기본 능력치
    const basicStatNames = ['공격력', '방어력', '명중', '회피', '치명타', '치명타 저항', '생명력', '정신력']
    const basicStats = aggregatedStats.filter(s => basicStatNames.includes(s.name))

    return (
      <>
        {/* 레이더 차트 */}
        <div className={styles.chartContainer}>
          <StatsRadarChart stats={aggregatedStats || []} />
        </div>

        {/* 주요 능력치 요약 */}
        <div className={styles.statsSummarySection}>
          <div className={styles.summaryHeader}>주요 능력치</div>
          <div className={styles.summaryGrid}>
            {basicStats.map(stat => {
              const isPercentage = stat.totalPercentage > 0 && stat.totalValue === 0
              const displayValue = isPercentage
                ? `+${stat.totalPercentage.toFixed(1)}%`
                : stat.totalValue.toLocaleString()

              return (
                <div key={stat.name} className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>{stat.name}</span>
                  <span className={styles.summaryValue} style={{ color: stat.color }}>
                    {displayValue}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </>
    )
  }

  // '능력치 상세' 탭 - 섹션별 펼치기/접기
  const renderDetailTab = () => {
    return (
      <div className={styles.detailSections}>
        {SECTIONS.map(section => {
          const sectionStats = statsByCategory[section.categories[0]] || []
          const isExpanded = expandedSections.has(section.id)
          const statCount = sectionStats.length

          if (statCount === 0) return null

          return (
            <div key={section.id} className={styles.detailSection}>
              {/* 섹션 헤더 (클릭하면 펼침/접힘) */}
              <div
                className={styles.detailSectionHeader}
                onClick={() => toggleSection(section.id)}
                style={{
                  borderLeftColor: section.color,
                  background: section.bgColor
                }}
              >
                <span className={styles.detailSectionIcon}>{section.icon}</span>
                <span className={styles.detailSectionLabel}>{section.label}</span>
                <span className={styles.detailSectionCount}>{statCount}개</span>
                <span className={styles.detailSectionArrow}>
                  {isExpanded ? '▼' : '▶'}
                </span>
              </div>

              {/* 섹션 내용 (스탯 목록) */}
              {isExpanded && (
                <div className={styles.detailSectionContent}>
                  {sectionStats.map(stat => {
                    const isStatExpanded = expandedStats.has(stat.name)
                    const isPercentage = stat.totalPercentage > 0 && stat.totalValue === 0
                    const displayValue = isPercentage
                      ? `+${stat.totalPercentage.toFixed(1)}%`
                      : stat.totalValue.toLocaleString()
                    const subValue = (!isPercentage && stat.totalPercentage > 0)
                      ? `+${stat.totalPercentage.toFixed(1)}%`
                      : null

                    return (
                      <div key={stat.name} className={styles.detailStatItem}>
                        <div
                          className={styles.detailStatRow}
                          onClick={() => toggleStatDetail(stat.name)}
                        >
                          <div className={styles.detailStatLeft}>
                            <div
                              className={styles.detailStatIndicator}
                              style={{ background: stat.color }}
                            />
                            <span className={styles.detailStatName}>{stat.name}</span>
                          </div>
                          <div className={styles.detailStatRight}>
                            <span className={styles.detailStatValue}>
                              {displayValue}
                            </span>
                            {subValue && (
                              <span className={styles.detailStatSubValue}>{subValue}</span>
                            )}
                            <span className={styles.detailStatArrow}>
                              {isStatExpanded ? '▼' : '▶'}
                            </span>
                          </div>
                        </div>

                        {/* 스탯 상세 (출처별 내역) */}
                        {isStatExpanded && (
                          <div className={styles.detailStatAccordion}>
                            <StatsDetailAccordion stat={{ ...stat, isExpanded: true }} onToggle={() => {}} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'total': return renderTotalTab()
      case 'detail': return renderDetailTab()
      default: return null
    }
  }

  return (
    <div className={styles.statsContainer}>
      {/* 탭 바 (2개만) */}
      <div className={styles.modernTabBar}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`${styles.modernTab} ${activeTab === tab.id ? styles.modernTabActive : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 콘텐츠 */}
      <div className={styles.statsContent}>
        {renderContent()}
      </div>
    </div>
  )
}
