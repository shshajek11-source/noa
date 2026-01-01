'use client'

interface TitleSystemProps {
    data?: {
        totalTitles: number
        collectedTitles: number
        attackTitles: string  // "94/104"
        defenseTitles: string
        miscTitles: string
        activeEffects: string[]
    }
}

export default function TitleSystem({ data }: TitleSystemProps) {
    if (!data) {
        return (
            <div style={{
                padding: '2rem',
                background: '#1A1D29',
                borderRadius: '8px',
                textAlign: 'center',
                color: '#6B7280'
            }}>
                타이틀 데이터 수집 중...
            </div>
        )
    }

    const completionPercentage = ((data.collectedTitles / data.totalTitles) * 100).toFixed(1)

    return (
        <div style={{
            padding: '2rem',
            background: '#1A1D29',
            border: '1px solid #2D3748',
            borderRadius: '12px'
        }}>
            <h3 style={{
                color: '#E5E7EB',
                fontSize: '1.5rem',
                marginBottom: '1.5rem',
                fontWeight: 'bold'
            }}>
                타이틀 시스템
            </h3>

            {/* Overall Progress */}
            <div style={{
                marginBottom: '2rem',
                padding: '1.5rem',
                background: '#0B0D12',
                borderRadius: '8px',
                border: '2px solid #2D3748'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem'
                }}>
                    <div>
                        <div style={{
                            fontSize: '0.875rem',
                            color: '#9CA3AF',
                            marginBottom: '0.5rem'
                        }}>
                            전체 수집 현황
                        </div>
                        <div style={{
                            fontSize: '2.5rem',
                            fontWeight: 'bold',
                            color: '#FACC15'
                        }}>
                            {data.collectedTitles} / {data.totalTitles}
                        </div>
                    </div>
                    <div style={{
                        fontSize: '3rem',
                        fontWeight: 'bold',
                        color: '#FBBF24'
                    }}>
                        {completionPercentage}%
                    </div>
                </div>

                {/* Progress Bar */}
                <div style={{
                    width: '100%',
                    height: '12px',
                    background: '#1A1D29',
                    borderRadius: '6px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        width: `${completionPercentage}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #FACC15, #FBBF24)',
                        transition: 'width 0.5s ease'
                    }} />
                </div>
            </div>

            {/* Category Breakdown */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                marginBottom: '2rem'
            }}>
                {[
                    { label: '공격 계열', value: data.attackTitles, color: '#EF4444' },
                    { label: '방어 계열', value: data.defenseTitles, color: '#3B82F6' },
                    { label: '기타 계열', value: data.miscTitles, color: '#94A3B8' }
                ].map(category => (
                    <div
                        key={category.label}
                        style={{
                            padding: '1.5rem',
                            background: '#0B0D12',
                            border: `2px solid ${category.color}40`,
                            borderRadius: '8px',
                            textAlign: 'center'
                        }}
                    >
                        <div style={{
                            fontSize: '0.875rem',
                            color: '#9CA3AF',
                            marginBottom: '0.75rem'
                        }}>
                            {category.label}
                        </div>
                        <div style={{
                            fontSize: '1.75rem',
                            fontWeight: 'bold',
                            color: category.color
                        }}>
                            {category.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* Active Effects */}
            {data.activeEffects && data.activeEffects.length > 0 && (
                <div>
                    <h4 style={{
                        color: '#9CA3AF',
                        fontSize: '1rem',
                        marginBottom: '1rem',
                        fontWeight: '600'
                    }}>
                        활성화 효과
                    </h4>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                    }}>
                        {data.activeEffects.map((effect, idx) => (
                            <div
                                key={idx}
                                style={{
                                    padding: '1rem',
                                    background: '#0B0D12',
                                    borderLeft: '4px solid #FACC15',
                                    borderRadius: '6px',
                                    color: '#E5E7EB',
                                    fontSize: '0.875rem'
                                }}
                            >
                                {effect}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
