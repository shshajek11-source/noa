'use client'
import { useMemo } from 'react'
import type { StatDetail } from '../../types/stats'

interface StatsDetailAccordionProps {
  stat: StatDetail
  onToggle: (statName: string) => void
}

export default function StatsDetailAccordion({ stat, onToggle }: StatsDetailAccordionProps) {
  // useMemo로 계산 결과 캐싱 - stat.sources가 변경될 때만 재계산
  const calculatedSums = useMemo(() => {
    const equipmentSum = stat.sources.equipment.reduce((sum, s) => sum + s.value, 0)
    const titlesSum = stat.sources.titles.reduce((sum, s) => sum + s.value, 0)
    const daevanionSum = stat.sources.daevanion.reduce((sum, s) => sum + s.value, 0)
    const baseStatsSum = stat.sources.baseStats?.reduce((sum, s) => sum + s.value, 0) || 0
    const baseStatsPercentage = stat.sources.baseStats?.reduce((sum, s) => sum + (s.percentage || 0), 0) || 0

    return {
      equipmentSum,
      titlesSum,
      daevanionSum,
      baseStatsSum,
      baseStatsPercentage,
      totalSourceValue: equipmentSum + titlesSum + daevanionSum
    }
  }, [stat.sources])

  const hasAnySources =
    stat.sources.equipment.length > 0 ||
    stat.sources.titles.length > 0 ||
    stat.sources.daevanion.length > 0 ||
    stat.sources.baseValue > 0

  if (!hasAnySources) return null

  return (
    <div style={{
      background: '#0B0D12',
      border: '1px solid #1F2433',
      borderRadius: '8px',
      overflow: 'hidden',
    }}>
      {/* Header Removed - Content Only Mode for Unified View */}

      {/* Expanded Content Only */}
      <div style={{
        padding: '1.25rem',
        background: '#0A0C10'
      }}>
        {/* 기본 스탯 출처 (2차 파생) */}
        {stat.sources.baseStats && stat.sources.baseStats.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{
              fontSize: '0.85rem',
              color: '#9CA3AF',
              marginBottom: '0.5rem',
              fontWeight: '600'
            }}>
              📊 기본 스탯 출처 (+{calculatedSums.baseStatsSum.toLocaleString()}
              {calculatedSums.baseStatsPercentage > 0 &&
                `, +${calculatedSums.baseStatsPercentage.toFixed(1)}%`})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {stat.sources.baseStats.map((source, idx) => (
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
                    {source.value > 0 && `+${source.value.toLocaleString()}`}
                    {source.percentage && source.percentage > 0 && ` +${source.percentage}%`}
                  </span>
                </div>
              ))}
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
              📦 장비 출처 (+{calculatedSums.equipmentSum.toLocaleString()})
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
              🏆 타이틀 출처 (+{calculatedSums.titlesSum.toLocaleString()})
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
              🔮 대바니온 출처 (+{calculatedSums.daevanionSum.toLocaleString()})
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
            {stat.sources.baseStats && stat.sources.baseStats.length > 0 && `${calculatedSums.baseStatsSum} (기본)`}
            {stat.sources.equipment.length > 0 && ` + ${calculatedSums.equipmentSum} (장비)`}
            {stat.sources.titles.length > 0 && ` + ${calculatedSums.titlesSum} (타이틀)`}
            {stat.sources.daevanion.length > 0 && ` + ${calculatedSums.daevanionSum} (대바니온)`}
            {' = '}
            <span style={{ color: stat.color, fontWeight: 'bold' }}>
              {stat.totalValue.toLocaleString()}
            </span>
            {stat.totalPercentage > 0 && (
              <span style={{ color: stat.color, fontWeight: 'bold', marginLeft: '0.5rem' }}>
                (+{stat.totalPercentage.toFixed(1)}%)
              </span>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
