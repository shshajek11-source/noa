'use client'
import { useState } from 'react'
import type { StatDetail } from '../../types/stats'

interface StatsDetailAccordionProps {
  stat: StatDetail
  onToggle: (statName: string) => void
}

export default function StatsDetailAccordion({ stat, onToggle }: StatsDetailAccordionProps) {
  const hasAnySources =
    stat.sources.equipment.length > 0 ||
    stat.sources.titles.length > 0 ||
    stat.sources.daevanion.length > 0 ||
    stat.sources.baseValue > 0

  if (!hasAnySources) return null

  const totalSourceValue =
    stat.sources.equipment.reduce((sum, s) => sum + s.value, 0) +
    stat.sources.titles.reduce((sum, s) => sum + s.value, 0) +
    stat.sources.daevanion.reduce((sum, s) => sum + s.value, 0)

  return (
    <div style={{
      background: '#0B0D12',
      border: '1px solid #1F2433',
      borderRadius: '8px',
      marginBottom: '0.75rem',
      overflow: 'hidden',
      transition: 'all 0.2s'
    }}>
      {/* Header - Clickable */}
      <button
        onClick={() => onToggle(stat.name)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.25rem',
          background: stat.isExpanded ? '#111318' : 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: 'background 0.2s',
          outline: 'none'
        }}
        onMouseEnter={(e) => {
          if (!stat.isExpanded) {
            e.currentTarget.style.background = '#111318'
          }
        }}
        onMouseLeave={(e) => {
          if (!stat.isExpanded) {
            e.currentTarget.style.background = 'transparent'
          }
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* 색상 인디케이터 */}
          <div style={{
            width: '4px',
            height: '24px',
            background: stat.color,
            borderRadius: '2px',
            boxShadow: `0 0 10px ${stat.color}40`
          }} />

          {/* 스탯 이름 */}
          <span style={{
            color: '#E5E7EB',
            fontSize: '1rem',
            fontWeight: '600'
          }}>
            {stat.name}
          </span>

          {/* 스탯 값 */}
          <span style={{
            color: stat.color,
            fontSize: '1.1rem',
            fontWeight: 'bold'
          }}>
            {stat.totalValue > 0 && '+'}
            {stat.totalValue.toLocaleString()}
            {stat.totalPercentage > 0 && (
              <span style={{ fontSize: '0.9rem', marginLeft: '0.5rem' }}>
                (+{stat.totalPercentage.toFixed(1)}%)
              </span>
            )}
          </span>
        </div>

        {/* 펼침 아이콘 */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          style={{
            transform: stat.isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            color: '#9CA3AF'
          }}
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Expanded Content */}
      {stat.isExpanded && (
        <div style={{
          padding: '0 1.25rem 1.25rem 1.25rem',
          borderTop: '1px solid #1F2433',
          background: '#0A0C10'
        }}>
          {/* 기본값 */}
          {stat.sources.baseValue > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{
                fontSize: '0.85rem',
                color: '#9CA3AF',
                marginBottom: '0.5rem',
                fontWeight: '600'
              }}>
                📊 기본값
              </div>
              <div style={{
                padding: '0.75rem',
                background: '#111318',
                borderRadius: '6px',
                borderLeft: '3px solid #6B7280',
                color: '#D1D5DB',
                fontSize: '0.9rem'
              }}>
                +{stat.sources.baseValue.toLocaleString()}
              </div>
            </div>
          )}

          {/* 장비 출처 */}
          {stat.sources.equipment.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{
                fontSize: '0.85rem',
                color: '#9CA3AF',
                marginBottom: '0.5rem',
                fontWeight: '600'
              }}>
                📦 장비 출처 (+{stat.sources.equipment.reduce((sum, s) => sum + s.value, 0).toLocaleString()})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {stat.sources.equipment.map((source, idx) => (
                  <div key={idx} style={{
                    padding: '0.75rem',
                    background: '#111318',
                    borderRadius: '6px',
                    borderLeft: `3px solid ${stat.color}`,
                    color: '#D1D5DB',
                    fontSize: '0.9rem',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span>{source.name}</span>
                    <span style={{ color: stat.color, fontWeight: '600' }}>
                      +{source.value.toLocaleString()}
                      {source.percentage && source.percentage > 0 && ` (+${source.percentage}%)`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 타이틀 출처 */}
          {stat.sources.titles.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{
                fontSize: '0.85rem',
                color: '#9CA3AF',
                marginBottom: '0.5rem',
                fontWeight: '600'
              }}>
                🏆 타이틀 출처 (+{stat.sources.titles.reduce((sum, s) => sum + s.value, 0).toLocaleString()})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {stat.sources.titles.map((source, idx) => (
                  <div key={idx} style={{
                    padding: '0.75rem',
                    background: '#111318',
                    borderRadius: '6px',
                    borderLeft: `3px solid ${stat.color}`,
                    color: '#D1D5DB',
                    fontSize: '0.9rem',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span>
                      {source.name}
                      {source.description && (
                        <span style={{ fontSize: '0.75rem', color: '#6B7280', marginLeft: '0.5rem' }}>
                          ({source.description})
                        </span>
                      )}
                    </span>
                    <span style={{ color: stat.color, fontWeight: '600' }}>
                      +{source.value.toLocaleString()}
                      {source.percentage && source.percentage > 0 && ` (+${source.percentage}%)`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 대바니온 출처 */}
          {stat.sources.daevanion.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{
                fontSize: '0.85rem',
                color: '#9CA3AF',
                marginBottom: '0.5rem',
                fontWeight: '600'
              }}>
                🔮 대바니온 출처 (+{stat.sources.daevanion.reduce((sum, s) => sum + s.value, 0).toLocaleString()})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {stat.sources.daevanion.map((source, idx) => (
                  <div key={idx} style={{
                    padding: '0.75rem',
                    background: '#111318',
                    borderRadius: '6px',
                    borderLeft: `3px solid ${stat.color}`,
                    color: '#D1D5DB',
                    fontSize: '0.9rem',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span>{source.name}</span>
                    <span style={{ color: stat.color, fontWeight: '600' }}>
                      +{source.value.toLocaleString()}
                      {source.percentage && source.percentage > 0 && ` (+${source.percentage}%)`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 총합 계산식 */}
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            background: '#111318',
            borderRadius: '6px',
            border: '1px solid #1F2433'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem' }}>
              💡 최종 계산
            </div>
            <div style={{ fontSize: '0.85rem', color: '#9CA3AF', fontFamily: 'monospace' }}>
              {stat.sources.baseValue > 0 && `${stat.sources.baseValue} (기본)`}
              {stat.sources.equipment.length > 0 && ` + ${stat.sources.equipment.reduce((sum, s) => sum + s.value, 0)} (장비)`}
              {stat.sources.titles.length > 0 && ` + ${stat.sources.titles.reduce((sum, s) => sum + s.value, 0)} (타이틀)`}
              {stat.sources.daevanion.length > 0 && ` + ${stat.sources.daevanion.reduce((sum, s) => sum + s.value, 0)} (대바니온)`}
              {' = '}
              <span style={{ color: stat.color, fontWeight: 'bold' }}>
                {stat.totalValue.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
