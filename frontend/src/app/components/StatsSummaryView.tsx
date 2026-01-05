'use client'
import { useState, useMemo } from 'react'
import { aggregateStats } from '../../lib/statsAggregator'
import StatsDetailAccordion from './StatsDetailAccordion'
import type { StatDetail, StatCategory } from '../../types/stats'

interface StatsSummaryViewProps {
  stats: any
  equipment: any[]
  daevanion: any
  titles: any
}

const CATEGORY_TABS: { id: StatCategory, label: string, icon: string }[] = [
  { id: 'all', label: '전체', icon: '📊' },
  { id: 'attack', label: '공격', icon: '⚔️' },
  { id: 'defense', label: '방어', icon: '🛡️' },
  { id: 'critical', label: '치명', icon: '⚡' },
  { id: 'utility', label: '유틸', icon: '✨' },
]

export default function StatsSummaryView({ stats, equipment, daevanion, titles }: StatsSummaryViewProps) {
  const [activeCategory, setActiveCategory] = useState<StatCategory>('all')
  const [expandedStats, setExpandedStats] = useState<Set<string>>(new Set())

  // 스탯 집계
  const aggregatedStats = useMemo(() => {
    return aggregateStats(equipment, titles, daevanion, stats)
  }, [equipment, titles, daevanion, stats])

  // 카테고리별 필터링
  const filteredStats = useMemo(() => {
    if (activeCategory === 'all') {
      return aggregatedStats
    }
    return aggregatedStats.filter(stat => stat.category === activeCategory)
  }, [aggregatedStats, activeCategory])

  // 스탯 펼침/접힘 토글
  const handleToggle = (statName: string) => {
    setExpandedStats(prev => {
      const newSet = new Set(prev)
      if (newSet.has(statName)) {
        newSet.delete(statName)
      } else {
        newSet.add(statName)
      }
      return newSet
    })
  }

  // expandedStats 상태를 StatDetail 객체에 반영
  const statsWithExpanded: StatDetail[] = useMemo(() => {
    return filteredStats.map(stat => ({
      ...stat,
      isExpanded: expandedStats.has(stat.name)
    }))
  }, [filteredStats, expandedStats])

  return (
    <div style={{
      background: '#111318',
      border: '1px solid #1F2433',
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      height: '600px',
      overflow: 'hidden'
    }}>
      {/* 헤더 */}
      <div style={{
        padding: '1rem 1.25rem',
        borderBottom: '1px solid #1F2433',
        background: '#0B0D12',
        color: '#E5E7EB',
        fontSize: '1rem',
        fontWeight: 'bold',
        flexShrink: 0
      }}>
        📊 능력치 통합 뷰
      </div>

      {/* 카테고리 탭 */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        padding: '0.75rem 1rem',
        borderBottom: '1px solid #1F2433',
        background: '#0A0C10',
        flexShrink: 0,
        overflowX: 'auto'
      }}>
        {CATEGORY_TABS.map(tab => {
          const isActive = activeCategory === tab.id
          const count = tab.id === 'all'
            ? aggregatedStats.length
            : aggregatedStats.filter(s => s.category === tab.id).length

          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              style={{
                padding: '0.5rem 1rem',
                background: isActive
                  ? 'linear-gradient(180deg, #2563EB 0%, #1D4ED8 100%)'
                  : '#111318',
                color: isActive ? '#FFFFFF' : '#9CA3AF',
                border: isActive ? '1px solid #3B82F6' : '1px solid #1F2433',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: isActive ? '600' : 'normal',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = '#1F2433'
                  e.currentTarget.style.borderColor = '#374151'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = '#111318'
                  e.currentTarget.style.borderColor = '#1F2433'
                }
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span style={{
                fontSize: '0.75rem',
                background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                padding: '0.125rem 0.375rem',
                borderRadius: '4px'
              }}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* 스탯 리스트 */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem'
      }}>
        {statsWithExpanded.length === 0 ? (
          <div style={{
            padding: '3rem 1rem',
            textAlign: 'center',
            color: '#6B7280',
            fontSize: '0.9rem'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
            <div>해당 카테고리에 능력치가 없습니다</div>
          </div>
        ) : (
          statsWithExpanded.map(stat => (
            <StatsDetailAccordion
              key={stat.name}
              stat={stat}
              onToggle={handleToggle}
            />
          ))
        )}
      </div>

      {/* 푸터 (통계 요약) */}
      <div style={{
        padding: '0.75rem 1.25rem',
        borderTop: '1px solid #1F2433',
        background: '#0A0C10',
        color: '#9CA3AF',
        fontSize: '0.8rem',
        flexShrink: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          총 {activeCategory === 'all' ? '전체' : CATEGORY_TABS.find(t => t.id === activeCategory)?.label} 능력치: {filteredStats.length}개
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <div style={{ width: '8px', height: '8px', background: '#EF4444', borderRadius: '2px' }} />
            <span style={{ fontSize: '0.7rem' }}>높음</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <div style={{ width: '8px', height: '8px', background: '#FBBF24', borderRadius: '2px' }} />
            <span style={{ fontSize: '0.7rem' }}>보통</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <div style={{ width: '8px', height: '8px', background: '#10B981', borderRadius: '2px' }} />
            <span style={{ fontSize: '0.7rem' }}>낮음</span>
          </div>
        </div>
      </div>
    </div>
  )
}
