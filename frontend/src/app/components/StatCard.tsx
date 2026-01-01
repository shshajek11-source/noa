'use client'
import { useState } from 'react'

interface StatCardProps {
    statName: string
    value: number
    percentile?: number
    contribution?: number  // % contribution to combat score
    breakdown?: {
        equipment: number
        devanion: number
        transcendence: number
        titles: number
    }
}

const getPercentileColor = (percentile?: number): string => {
    if (!percentile) return '#6B7280'
    if (percentile <= 1) return '#FACC15'  // Top 1%
    if (percentile <= 5) return '#FBBF24'  // Top 5%
    if (percentile <= 10) return '#94A3B8'  // Top 10%
    return '#9CA3AF'
}

export default function StatCard({ statName, value, percentile, contribution, breakdown }: StatCardProps) {
    const [showModal, setShowModal] = useState(false)
    const percentileColor = getPercentileColor(percentile)

    return (
        <>
            <div
                onClick={() => breakdown && setShowModal(true)}
                style={{
                    padding: '1.5rem',
                    background: '#1A1D29',
                    border: percentile && percentile <= 5 ? `2px solid ${percentileColor}40` : '1px solid #2D3748',
                    borderRadius: '8px',
                    cursor: breakdown ? 'pointer' : 'default',
                    transition: 'all 0.2s',
                    position: 'relative'
                }}
                className={breakdown ? 'stat-card-hover' : ''}
            >
                {/* Stat Name */}
                <div style={{
                    fontSize: '0.875rem',
                    color: '#9CA3AF',
                    marginBottom: '0.5rem',
                    fontWeight: '500'
                }}>
                    {statName}
                </div>

                {/* Value */}
                <div style={{
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    color: percentile && percentile <= 5 ? percentileColor : '#E5E7EB',
                    marginBottom: '0.5rem'
                }}>
                    {value.toLocaleString()}
                </div>

                {/* Percentile */}
                {percentile !== undefined && (
                    <div style={{
                        fontSize: '0.75rem',
                        color: percentileColor,
                        fontWeight: '600',
                        marginBottom: '0.25rem'
                    }}>
                        상위 {percentile}%
                    </div>
                )}

                {/* Combat Score Contribution */}
                {contribution !== undefined && (
                    <div style={{
                        fontSize: '0.7rem',
                        color: '#6B7280'
                    }}>
                        전투력 기여도 +{contribution.toFixed(1)}%
                    </div>
                )}

                {/* Click indicator for breakdown */}
                {breakdown && (
                    <div style={{
                        position: 'absolute',
                        top: '0.5rem',
                        right: '0.5rem',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: '#2D3748',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        color: '#9CA3AF'
                    }}>
                        i
                    </div>
                )}
            </div>

            {/* Breakdown Modal */}
            {showModal && breakdown && (
                <div
                    onClick={() => setShowModal(false)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#1A1D29',
                            border: '2px solid #2D3748',
                            borderRadius: '12px',
                            padding: '2rem',
                            maxWidth: '500px',
                            width: '90%'
                        }}
                    >
                        <h3 style={{
                            color: '#E5E7EB',
                            fontSize: '1.5rem',
                            marginBottom: '1.5rem',
                            fontWeight: 'bold'
                        }}>
                            {statName} 상세
                        </h3>

                        <div style={{
                            marginBottom: '1.5rem'
                        }}>
                            <div style={{
                                fontSize: '3rem',
                                fontWeight: 'bold',
                                color: percentileColor,
                                marginBottom: '0.5rem'
                            }}>
                                {value.toLocaleString()}
                            </div>
                            {percentile !== undefined && (
                                <div style={{
                                    fontSize: '1rem',
                                    color: percentileColor,
                                    fontWeight: '600'
                                }}>
                                    서버 상위 {percentile}%
                                </div>
                            )}
                        </div>

                        <div style={{
                            borderTop: '1px solid #2D3748',
                            paddingTop: '1rem'
                        }}>
                            <h4 style={{
                                color: '#9CA3AF',
                                fontSize: '0.875rem',
                                marginBottom: '1rem',
                                fontWeight: '600'
                            }}>
                                스탯 출처
                            </h4>

                            {[
                                { label: '장비', value: breakdown.equipment },
                                { label: '데바니온', value: breakdown.devanion },
                                { label: '초월', value: breakdown.transcendence },
                                { label: '칭호', value: breakdown.titles }
                            ].map(source => (
                                <div
                                    key={source.label}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        padding: '0.75rem',
                                        marginBottom: '0.5rem',
                                        background: '#0B0D12',
                                        borderRadius: '6px'
                                    }}
                                >
                                    <span style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>
                                        {source.label}
                                    </span>
                                    <span style={{ color: '#E5E7EB', fontWeight: '600', fontSize: '0.875rem' }}>
                                        +{source.value.toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => setShowModal(false)}
                            style={{
                                marginTop: '1.5rem',
                                width: '100%',
                                padding: '0.75rem',
                                background: 'var(--primary)',
                                border: 'none',
                                borderRadius: '6px',
                                color: '#0B0D12',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontSize: '1rem'
                            }}
                        >
                            닫기
                        </button>
                    </div>
                </div>
            )}

            <style jsx>{`
        .stat-card-hover:hover {
          border-color: ${percentileColor};
          box-shadow: 0 0 20px ${percentileColor}40;
          transform: translateY(-2px);
        }
      `}</style>
        </>
    )
}
