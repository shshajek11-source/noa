'use client'
import { useState } from 'react'
import type { StatDetail } from '../../types/stats'

interface StatTooltipProps {
  stat: StatDetail
  children: React.ReactNode
}

export default function StatTooltip({ stat, children }: StatTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.bottom
    })
    setShowTooltip(true)
  }

  const handleMouseLeave = () => {
    setShowTooltip(false)
  }

  const hasAnySources =
    (stat.sources.baseStats && stat.sources.baseStats.length > 0) ||
    stat.sources.equipment.length > 0 ||
    stat.sources.titles.length > 0 ||
    stat.sources.daevanion.length > 0

  return (
    <>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ position: 'relative', width: '100%', height: '100%' }}
      >
        {children}
      </div>

      {showTooltip && hasAnySources && (
        <div
          style={{
            position: 'fixed',
            left: `${position.x}px`,
            top: `${position.y + 10}px`,
            transform: 'translate(-50%, 0%)',
            background: 'rgba(0, 0, 0, 0.95)',
            border: `1px solid ${stat.color}`,
            borderRadius: '8px',
            padding: '0.75rem',
            minWidth: '250px',
            maxWidth: '350px',
            zIndex: 9999,
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* 헤더 */}
          <div style={{
            fontSize: '0.85rem',
            fontWeight: 'bold',
            color: stat.color,
            marginBottom: '0.5rem',
            paddingBottom: '0.5rem',
            borderBottom: `1px solid ${stat.color}40`
          }}>
            {stat.name}
          </div>

          {/* 기본 스탯 출처 */}
          {stat.sources.baseStats && stat.sources.baseStats.length > 0 && (
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginBottom: '0.25rem' }}>
                📊 기본 스탯
              </div>
              {stat.sources.baseStats.map((source, idx) => (
                <div key={idx} style={{
                  fontSize: '0.75rem',
                  color: '#E5E7EB',
                  padding: '0.25rem 0.5rem',
                  background: '#1F2937',
                  borderRadius: '4px',
                  marginBottom: '0.25rem',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span>{source.name}</span>
                  <span style={{ color: stat.color }}>
                    {source.value > 0 && `+${source.value.toLocaleString()}`}
                    {(source.percentage ?? 0) > 0 && ` +${source.percentage}%`}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 장비 출처 */}
          {stat.sources.equipment.length > 0 && (
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginBottom: '0.25rem' }}>
                📦 장비
              </div>
              {stat.sources.equipment.map((source, idx) => {
                const displayValue = source.value > 0 ? `+${source.value.toLocaleString()}` : ''
                return (
                  <div key={idx} style={{
                    fontSize: '0.75rem',
                    color: '#E5E7EB',
                    padding: '0.25rem 0.5rem',
                    background: '#1F2937',
                    borderRadius: '4px',
                    marginBottom: '0.25rem',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span>{source.name}</span>
                    <span style={{ color: stat.color }}>
                      {displayValue}
                      {(source.percentage ?? 0) > 0 && ` +${source.percentage}%`}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* 타이틀 출처 */}
          {stat.sources.titles.length > 0 && (
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginBottom: '0.25rem' }}>
                🏆 타이틀
              </div>
              {stat.sources.titles.map((source, idx) => (
                <div key={idx} style={{
                  fontSize: '0.75rem',
                  color: '#E5E7EB',
                  padding: '0.25rem 0.5rem',
                  background: '#1F2937',
                  borderRadius: '4px',
                  marginBottom: '0.25rem',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span>{source.name}</span>
                  <span style={{ color: stat.color }}>
                    {source.value > 0 && `+${source.value.toLocaleString()}`}
                    {(source.percentage ?? 0) > 0 && ` +${source.percentage}%`}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 대바니온 출처 */}
          {stat.sources.daevanion.length > 0 && (
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginBottom: '0.25rem' }}>
                🔮 대바니온
              </div>
              {stat.sources.daevanion.map((source, idx) => (
                <div key={idx} style={{
                  fontSize: '0.75rem',
                  color: '#E5E7EB',
                  padding: '0.25rem 0.5rem',
                  background: '#1F2937',
                  borderRadius: '4px',
                  marginBottom: '0.25rem',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span>{source.name}</span>
                  <span style={{ color: stat.color }}>
                    {source.value > 0 && `+${source.value.toLocaleString()}`}
                    {(source.percentage ?? 0) > 0 && ` +${source.percentage}%`}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 총합 */}
          <div style={{
            fontSize: '0.75rem',
            color: '#9CA3AF',
            paddingTop: '0.5rem',
            borderTop: '1px solid #374151',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>총합</span>
            <span style={{ color: stat.color, fontWeight: 'bold' }}>
              {stat.totalValue > 0 && `+${stat.totalValue.toLocaleString()}`}
              {stat.totalPercentage > 0 && ` (+${stat.totalPercentage.toFixed(1)}%)`}
            </span>
          </div>

          {/* 화살표 */}
          <div style={{
            position: 'absolute',
            top: '-6px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderBottom: `6px solid ${stat.color}`
          }} />
        </div>
      )}
    </>
  )
}
