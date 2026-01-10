'use client'
import { useState, useMemo } from 'react'
import { aggregateStats } from '../../lib/statsAggregator'
import styles from './ProfileSection.module.css'

interface StatsSummaryViewProps {
  stats: any
  equipment: any[]
  daevanion: any
  titles: any
  equippedTitleId?: number
  characterId?: string
  serverId?: string
}

// 탭 정의
type TabId = 'total' | 'equipment' | 'titles' | 'daevanion' | 'mainStats'

const TABS: { id: TabId, label: string, icon: string }[] = [
  { id: 'total', label: '전체', icon: '📊' },
  { id: 'equipment', label: '장비', icon: '⚔️' },
  { id: 'titles', label: '타이틀', icon: '🏅' },
  { id: 'daevanion', label: '대바니온', icon: '🔮' },
  { id: 'mainStats', label: '주요스탯', icon: '⭐' },
]

// 장비 탭에서 제외할 스탯
const EQUIPMENT_EXCLUDED_STATS = new Set([
  '위력', '민첩', '정확', '의지', '지식', '체력'
])

// 퍼센트만 표시할 스탯들
const PERCENTAGE_ONLY_STATS = new Set([
  '전투 속도', '이동 속도', '피해 증폭', '피해 내성',
  '치명타 피해 증폭', '치명타 피해 내성', '다단 히트 적중', '다단 히트 저항',
  '완벽', '완벽 저항', '재생', '재생 관통', '철벽', '철벽 관통',
  '재사용 시간', '재사용 시간 감소', '공격력 증가', '방어력 증가',
  '생명력 증가', '정신력 증가'
])

const INITIAL_VISIBLE_COUNT = 28

export default function StatsSummaryView({ stats, equipment, daevanion, titles, equippedTitleId }: StatsSummaryViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>('total')
  const [expandedStats, setExpandedStats] = useState<Set<string>>(new Set())
  const [statsPage, setStatsPage] = useState(0)

  // 스탯 집계
  const aggregatedStats = useMemo(() => {
    return aggregateStats(equipment, titles, daevanion, stats, equippedTitleId)
  }, [equipment, titles, daevanion, stats, equippedTitleId])

  // 주요스탯 데이터 - statList 전체 (아이템레벨 제외)
  const mainStatsData = useMemo(() => {
    if (!stats?.statList) return []
    return stats.statList.filter((stat: any) => stat.name !== '아이템레벨')
  }, [stats])

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

  // 값 포맷팅 - 고정값과 퍼센트 분리 표시
  const formatValue = (value: number, percentage: number, statName: string) => {
    // 퍼센트 전용 스탯은 합산해서 표시
    if (PERCENTAGE_ONLY_STATS.has(statName)) {
      const total = value + percentage
      return total !== 0 ? `+${total.toFixed(1)}%` : '0'
    }

    // 고정값과 퍼센트 둘 다 표시
    const parts: string[] = []
    if (value !== 0) parts.push(value.toLocaleString())
    if (percentage !== 0) parts.push(`+${percentage.toFixed(1)}%`)
    return parts.length > 0 ? parts.join(' ') : '0'
  }

  // 스탯을 고정값/퍼센트 분리된 리스트로 변환
  const separateStats = (statsWithSources: typeof aggregatedStats) => {
    const result: Array<{
      name: string
      displayName: string
      value: number
      isPercentage: boolean
      color: string
      sources: typeof aggregatedStats[0]['sources']
    }> = []

    statsWithSources.forEach(stat => {
      // 고정값이 있으면 추가
      if (stat.totalValue > 0) {
        result.push({
          name: stat.name,
          displayName: stat.name,
          value: stat.totalValue,
          isPercentage: false,
          color: stat.color,
          sources: stat.sources
        })
      }
      // 퍼센트가 있으면 별도 카드로 추가
      if (stat.totalPercentage > 0) {
        result.push({
          name: `${stat.name}_pct`,
          displayName: `${stat.name} %`,
          value: stat.totalPercentage,
          isPercentage: true,
          color: '#F59E0B', // 퍼센트는 주황색
          sources: stat.sources
        })
      }
    })

    return result
  }

  // 전체 탭 렌더링
  const renderTotalTab = () => {
    const statsWithSources = aggregatedStats.filter(s =>
      (s.sources.equipment && s.sources.equipment.length > 0) ||
      (s.sources.titles && s.sources.titles.length > 0) ||
      (s.sources.daevanion && s.sources.daevanion.length > 0) ||
      (s.sources.baseStats && s.sources.baseStats.length > 0)
    )

    // 고정값과 퍼센트 분리
    const separatedStats = separateStats(statsWithSources)

    const totalPages = Math.ceil(separatedStats.length / INITIAL_VISIBLE_COUNT)
    const startIdx = statsPage * INITIAL_VISIBLE_COUNT
    const visibleStats = separatedStats.slice(startIdx, startIdx + INITIAL_VISIBLE_COUNT)
    const hasMultiplePages = totalPages > 1

    return (
      <>
        <div className={styles.statsGrid2Col}>
          {visibleStats.map(stat => {
            const isExpanded = expandedStats.has(stat.name)
            const equipTotal = stat.sources.equipment?.reduce((sum, s) =>
              sum + (stat.isPercentage ? (s.percentage || 0) : s.value), 0) || 0
            const titleTotal = stat.sources.titles?.reduce((sum, s) =>
              sum + (stat.isPercentage ? (s.percentage || 0) : s.value), 0) || 0
            const daevanionTotal = stat.sources.daevanion?.reduce((sum, s) =>
              sum + (stat.isPercentage ? (s.percentage || 0) : s.value), 0) || 0
            const baseTotal = stat.sources.baseStats?.reduce((sum, s) =>
              sum + (stat.isPercentage ? (s.percentage || 0) : s.value), 0) || 0

            return (
              <div key={stat.name} className={styles.statCardExpand}>
                <div
                  className={styles.statCardHeader}
                  onClick={() => toggleExpand(stat.name)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.statCardName}>
                    <span
                      className={styles.statColorDot}
                      style={{ background: stat.color }}
                    />
                    {stat.displayName}
                  </div>
                  <div className={styles.statCardValue} style={{ color: stat.isPercentage ? '#F59E0B' : '#E5E7EB' }}>
                    {stat.isPercentage ? `+${stat.value.toFixed(1)}%` : stat.value.toLocaleString()}
                    <span className={styles.dropdownArrow}>{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>
                {isExpanded && (
                  <div className={styles.statCardDetails}>
                    {equipTotal > 0 && (
                      <div className={styles.statSourceRow}>
                        <span className={styles.sourceLabel}>⚔️ 장비</span>
                        <span className={styles.sourceValue}>
                          {stat.isPercentage ? `+${equipTotal.toFixed(1)}%` : `+${equipTotal.toLocaleString()}`}
                        </span>
                      </div>
                    )}
                    {titleTotal > 0 && (
                      <div className={styles.statSourceRow}>
                        <span className={styles.sourceLabel}>🏅 타이틀</span>
                        <span className={styles.sourceValue}>
                          {stat.isPercentage ? `+${titleTotal.toFixed(1)}%` : `+${titleTotal.toLocaleString()}`}
                        </span>
                      </div>
                    )}
                    {daevanionTotal > 0 && (
                      <div className={styles.statSourceRow}>
                        <span className={styles.sourceLabel}>🔮 대바니온</span>
                        <span className={styles.sourceValue}>
                          {stat.isPercentage ? `+${daevanionTotal.toFixed(1)}%` : `+${daevanionTotal.toLocaleString()}`}
                        </span>
                      </div>
                    )}
                    {baseTotal > 0 && (
                      <div className={styles.statSourceRow}>
                        <span className={styles.sourceLabel}>⭐ 주요스탯</span>
                        <span className={styles.sourceValue}>
                          {stat.isPercentage ? `+${baseTotal.toFixed(1)}%` : `+${baseTotal.toLocaleString()}`}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {hasMultiplePages && (
          <div className={styles.statsPagination}>
            <button
              className={styles.pageButton}
              onClick={() => setStatsPage(p => p - 1)}
              disabled={statsPage === 0}
            >
              ◀ 이전
            </button>
            <span className={styles.pageIndicator}>{statsPage + 1} / {totalPages}</span>
            <button
              className={styles.pageButton}
              onClick={() => setStatsPage(p => p + 1)}
              disabled={statsPage >= totalPages - 1}
            >
              다음 ▶
            </button>
          </div>
        )}
      </>
    )
  }

  // 장비 탭 렌더링
  const renderEquipmentTab = () => {
    const equipmentStats = aggregatedStats.filter(s =>
      s.sources.equipment &&
      s.sources.equipment.length > 0 &&
      !EQUIPMENT_EXCLUDED_STATS.has(s.name)
    )

    if (equipmentStats.length === 0) {
      return <div className={styles.noData}>장비에서 추출된 스탯이 없습니다.</div>
    }

    return (
      <div className={styles.statsGrid2Col}>
        {equipmentStats.map(stat => {
          const isExpanded = expandedStats.has(`equip_${stat.name}`)
          const total = stat.sources.equipment.reduce((sum, s) => sum + s.value, 0)
          const totalPct = stat.sources.equipment.reduce((sum, s) => sum + (s.percentage || 0), 0)

          return (
            <div key={stat.name} className={styles.statCardExpand}>
              <div
                className={styles.statCardHeader}
                onClick={() => toggleExpand(`equip_${stat.name}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.statCardName}>
                  <span className={styles.statColorDot} style={{ background: stat.color }} />
                  {stat.name}
                </div>
                <div className={styles.statCardValue}>
                  {formatValue(total, totalPct, stat.name)}
                  <span className={styles.dropdownArrow}>{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>
              {isExpanded && (
                <div className={styles.statCardDetails}>
                  {stat.sources.equipment.map((source, i) => (
                    <div key={i} className={styles.statSourceRow}>
                      <span className={styles.sourceLabel}>{source.name}</span>
                      <span className={styles.sourceValue}>
                        {source.value > 0 ? `+${source.value}` : ''}
                        {source.percentage ? `+${source.percentage}%` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // 타이틀 탭 렌더링
  const renderTitlesTab = () => {
    const titleStats = aggregatedStats.filter(s =>
      s.sources.titles && s.sources.titles.length > 0
    )

    if (titleStats.length === 0) {
      return <div className={styles.noData}>타이틀에서 추출된 스탯이 없습니다.</div>
    }

    return (
      <div className={styles.statsGrid2Col}>
        {titleStats.map(stat => {
          const isExpanded = expandedStats.has(`title_${stat.name}`)
          const total = stat.sources.titles.reduce((sum, s) => sum + s.value, 0)
          const totalPct = stat.sources.titles.reduce((sum, s) => sum + (s.percentage || 0), 0)

          return (
            <div key={stat.name} className={styles.statCardExpand}>
              <div
                className={styles.statCardHeader}
                onClick={() => toggleExpand(`title_${stat.name}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className={styles.statCardName}>
                  <span className={styles.statColorDot} style={{ background: stat.color }} />
                  {stat.name}
                </div>
                <div className={styles.statCardValue}>
                  {formatValue(total, totalPct, stat.name)}
                  <span className={styles.dropdownArrow}>{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>
              {isExpanded && (
                <div className={styles.statCardDetails}>
                  {stat.sources.titles.map((source, i) => (
                    <div key={i} className={styles.statSourceRow}>
                      <span className={styles.sourceLabel}>{source.name}</span>
                      <span className={styles.sourceValue}>
                        {source.value > 0 ? `+${source.value}` : ''}
                        {source.percentage ? `+${source.percentage}%` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // 대바니온 탭 렌더링
  const renderDaevanionTab = () => {
    const daevanionStats = aggregatedStats.filter(s =>
      s.sources.daevanion && s.sources.daevanion.length > 0
    )

    if (daevanionStats.length === 0) {
      return <div className={styles.noData}>대바니온에서 추출된 스탯이 없습니다.</div>
    }

    return (
      <div className={styles.statsGrid3Col}>
        {daevanionStats.map(stat => {
          const total = stat.sources.daevanion.reduce((sum, s) => sum + s.value, 0)
          const totalPct = stat.sources.daevanion.reduce((sum, s) => sum + (s.percentage || 0), 0)

          return (
            <div key={stat.name} className={styles.statCard}>
              <div className={styles.statCardName}>
                <span className={styles.statColorDot} style={{ background: stat.color }} />
                {stat.name}
              </div>
              <div className={styles.statCardValue}>
                {formatValue(total, totalPct, stat.name)}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // 주요스탯 탭 렌더링
  const renderMainStatsTab = () => {
    if (mainStatsData.length === 0) {
      return <div className={styles.noData}>주요스탯 데이터가 없습니다.</div>
    }

    return (
      <div className={styles.mainStatsGrid}>
        {mainStatsData.map((stat: any, index: number) => (
          <div key={index} className={styles.mainStatCard}>
            <div className={styles.mainStatHeader}>
              <span className={styles.mainStatName}>{stat.name}</span>
              <span className={styles.mainStatValue}>{stat.value}</span>
            </div>
            <div className={styles.mainStatSecondary}>
              {stat.statSecondList?.map((secondStat: string, i: number) => (
                <div key={i} className={styles.secondaryStat}>
                  {secondStat}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // 탭 컨텐츠 렌더링
  const renderTabContent = () => {
    switch (activeTab) {
      case 'total': return renderTotalTab()
      case 'equipment': return renderEquipmentTab()
      case 'titles': return renderTitlesTab()
      case 'daevanion': return renderDaevanionTab()
      case 'mainStats': return renderMainStatsTab()
      default: return null
    }
  }

  return (
    <div className={styles.statsContainer}>
      {/* 헤더 */}
      <div className={styles.statsHeader}>
        <span>📊 능력치 통합뷰</span>
      </div>

      {/* 탭 바 */}
      <div className={styles.statsTabBar}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`${styles.statsTab} ${activeTab === tab.id ? styles.statsTabActive : ''}`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      <div className={styles.statsContent}>
        {renderTabContent()}
      </div>
    </div>
  )
}
