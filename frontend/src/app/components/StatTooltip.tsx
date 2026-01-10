'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { StatDetail } from '../../types/stats'

interface StatTooltipProps {
  stat: StatDetail
  children: React.ReactNode
}

// 소스 아이템 렌더링
function SourceItem({ source, color }: { source: any, color: string }) {
  const displayValue = source.value > 0 ? `+${source.value.toLocaleString()}` : ''
  const displayPercent = (source.percentage ?? 0) > 0 ? `+${source.percentage}%` : ''

  return (
    <div style={{
      fontSize: '0.75rem',
      color: '#E5E7EB',
      padding: '2px 6px',
      background: '#1F2937',
      borderRadius: '3px',
      display: 'flex',
      justifyContent: 'space-between',
      gap: '8px',
      lineHeight: 1.4
    }}>
      <span style={{
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        flex: 1,
        minWidth: 0
      }}>
        {source.name}
      </span>
      <span style={{ color, flexShrink: 0, fontWeight: 600 }}>
        {displayValue}{displayPercent && ` ${displayPercent}`}
      </span>
    </div>
  )
}

// % 증가 출처 아이템 (기본 스탯에 함께 표시)
function PercentSourceItem({ source, color }: { source: any, color: string }) {
  return (
    <div style={{
      fontSize: '0.75rem',
      color: '#E5E7EB',
      padding: '2px 6px',
      background: '#064E3B',
      borderRadius: '3px',
      display: 'flex',
      justifyContent: 'space-between',
      gap: '8px',
      lineHeight: 1.4
    }}>
      <span style={{
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        flex: 1,
        minWidth: 0
      }}>
        {source.sourceName}
      </span>
      <span style={{ color: '#6EE7B7', flexShrink: 0, fontWeight: 600 }}>
        +{source.percentage.toFixed(1)}%
      </span>
    </div>
  )
}

export default function StatTooltip({ stat, children }: StatTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const screenWidth = window.innerWidth
    let x = rect.left + rect.width / 2

    const tooltipWidth = 560
    if (x - tooltipWidth / 2 < 10) {
      x = tooltipWidth / 2 + 10
    } else if (x + tooltipWidth / 2 > screenWidth - 10) {
      x = screenWidth - tooltipWidth / 2 - 10
    }

    setPosition({ x, y: rect.bottom })
    setShowTooltip(true)
  }

  const handleMouseLeave = () => {
    setShowTooltip(false)
  }

  const hasAnySources =
    (stat.sources.baseStats && stat.sources.baseStats.length > 0) ||
    (stat.sources.equipment && stat.sources.equipment.length > 0) ||
    (stat.sources.titles && stat.sources.titles.length > 0) ||
    (stat.sources.daevanion && stat.sources.daevanion.length > 0)

  const hasValue = stat.totalValue > 0 || stat.totalPercentage > 0
  const hasPercentSources = stat.sources.percentageSources && stat.sources.percentageSources.length > 0
  const totalPercent = hasPercentSources
    ? stat.sources.percentageSources!.reduce((sum, s) => sum + s.percentage, 0)
    : 0

  // 기본 스탯 + % 증가 출처를 합쳐서 표시
  const baseAndPercentSources = [
    ...(stat.sources.baseStats || []).map(s => ({ type: 'base', data: s })),
    ...(stat.sources.percentageSources || []).map(s => ({ type: 'percent', data: s }))
  ]

  const tooltipContent = showTooltip && (hasAnySources || hasValue) && (
    <div
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y + 8}px`,
        transform: 'translate(-50%, 0%)',
        background: 'rgba(0, 0, 0, 0.95)',
        border: `1px solid ${stat.color}`,
        borderRadius: '6px',
        padding: '10px',
        width: '560px',
        maxWidth: '95vw',
        zIndex: 9999,
        pointerEvents: 'none',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
      }}
    >
      {/* 헤더: 스탯명 + 총합 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
        paddingBottom: '6px',
        borderBottom: `1px solid ${stat.color}40`
      }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: stat.color }}>
          {stat.name}
        </span>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {hasPercentSources && (
            <span style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: 600 }}>
              증가 +{totalPercent.toFixed(1)}%
            </span>
          )}
          <span style={{ fontSize: '0.85rem', color: stat.color, fontWeight: 'bold' }}>
            {stat.totalValue > 0 && `+${stat.totalValue.toLocaleString()}`}
            {stat.totalPercentage > 0 && ` (+${stat.totalPercentage.toFixed(1)}%)`}
          </span>
        </div>
      </div>

      {/* 3열 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>

        {/* 기본 스탯 + % 증가 출처 (합쳐서 표시) */}
        {baseAndPercentSources.length > 0 && (
          <div>
            <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginBottom: '4px' }}>
              기본 스탯 ({baseAndPercentSources.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {baseAndPercentSources.map((item, idx) => (
                item.type === 'base'
                  ? <SourceItem key={idx} source={item.data} color={stat.color} />
                  : <PercentSourceItem key={idx} source={item.data} color={stat.color} />
              ))}
            </div>
          </div>
        )}

        {/* 대바니온 */}
        {stat.sources.daevanion && stat.sources.daevanion.length > 0 && (
          <div>
            <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginBottom: '4px' }}>
              대바니온 ({stat.sources.daevanion.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {stat.sources.daevanion.map((source, idx) => (
                <SourceItem key={idx} source={source} color={stat.color} />
              ))}
            </div>
          </div>
        )}

        {/* 타이틀 */}
        {stat.sources.titles && stat.sources.titles.length > 0 && (
          <div>
            <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginBottom: '4px' }}>
              타이틀 ({stat.sources.titles.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {stat.sources.titles.map((source, idx) => (
                <SourceItem key={idx} source={source} color={stat.color} />
              ))}
            </div>
          </div>
        )}

        {/* 장비 */}
        {stat.sources.equipment && stat.sources.equipment.length > 0 && (
          <div style={{
            gridColumn: stat.sources.equipment.length > 5 ? 'span 2' : 'span 1'
          }}>
            <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginBottom: '4px' }}>
              장비 ({stat.sources.equipment.length})
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: stat.sources.equipment.length > 5 ? 'repeat(2, 1fr)' : '1fr',
              gap: '3px'
            }}>
              {stat.sources.equipment.map((source, idx) => (
                <SourceItem key={idx} source={source} color={stat.color} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 화살표 */}
      <div style={{
        position: 'absolute',
        top: '-5px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 0,
        height: 0,
        borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent',
        borderBottom: `5px solid ${stat.color}`
      }} />
    </div>
  )

  return (
    <>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ position: 'relative', width: '100%', height: '100%' }}
      >
        {children}
      </div>

      {mounted && tooltipContent && createPortal(tooltipContent, document.body)}
    </>
  )
}
