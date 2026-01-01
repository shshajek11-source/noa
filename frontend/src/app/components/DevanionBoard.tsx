'use client'

interface DevanionBoardProps {
    data?: {
        boards: {
            [godName: string]: {
                progress: string  // "완료", "진행중"
                activeNodes: number
                totalNodes: number
                effects: string[]
            }
        }
        totalInvestment?: number
        globalRank?: number
    }
}

const godColors: Record<string, string> = {
    '네자칸': '#EF4444',
    '지켈': '#FACC15',
    '바이젤': '#3B82F6',
    '트리니엘': '#10B981',
    '아리엘': '#8B5CF6',
    '아스펠': '#EC4899'
}

export default function DevanionBoard({ data }: DevanionBoardProps) {
    if (!data || !data.boards) {
        return (
            <div style={{
                padding: '2rem',
                background: '#1A1D29',
                borderRadius: '8px',
                textAlign: 'center',
                color: '#6B7280'
            }}>
                데바니온 데이터 수집 중...
            </div>
        )
    }

    const godNames = Object.keys(data.boards)

    return (
        <div style={{
            padding: '2rem',
            background: '#1A1D29',
            border: '1px solid #2D3748',
            borderRadius: '12px'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem'
            }}>
                <h3 style={{
                    color: '#E5E7EB',
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    margin: 0
                }}>
                    데바니온 성장
                </h3>

                {data.totalInvestment !== undefined && (
                    <div style={{
                        display: 'flex',
                        gap: '2rem',
                        alignItems: 'center'
                    }}>
                        <div>
                            <div style={{
                                fontSize: '0.75rem',
                                color: '#9CA3AF',
                                marginBottom: '0.25rem'
                            }}>
                                총 투자
                            </div>
                            <div style={{
                                fontSize: '1.25rem',
                                fontWeight: 'bold',
                                color: '#FBBF24'
                            }}>
                                {data.totalInvestment.toLocaleString()}
                            </div>
                        </div>
                        {data.globalRank && (
                            <div>
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: '#9CA3AF',
                                    marginBottom: '0.25rem'
                                }}>
                                    서버 순위
                                </div>
                                <div style={{
                                    fontSize: '1.25rem',
                                    fontWeight: 'bold',
                                    color: '#FACC15'
                                }}>
                                    #{data.globalRank}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* God Boards Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.5rem'
            }}>
                {godNames.map(godName => {
                    const board = data.boards[godName]
                    const color = godColors[godName] || '#6B7280'
                    const completionPercent = board.totalNodes > 0
                        ? ((board.activeNodes / board.totalNodes) * 100).toFixed(0)
                        : 0

                    return (
                        <div
                            key={godName}
                            style={{
                                padding: '1.5rem',
                                background: '#0B0D12',
                                border: `2px solid ${color}40`,
                                borderRadius: '12px',
                                transition: 'all 0.2s'
                            }}
                            className="devanion-card-hover"
                        >
                            {/* God Name & Progress Badge */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '1rem'
                            }}>
                                <h4 style={{
                                    color: color,
                                    fontSize: '1.25rem',
                                    fontWeight: 'bold',
                                    margin: 0
                                }}>
                                    {godName}
                                </h4>
                                <div style={{
                                    padding: '0.25rem 0.75rem',
                                    background: board.progress === '완료' ? `${color}40` : '#2D3748',
                                    border: `1px solid ${color}`,
                                    borderRadius: '12px',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    color: board.progress === '완료' ? color : '#9CA3AF'
                                }}>
                                    {board.progress}
                                </div>
                            </div>

                            {/* Nodes Progress */}
                            <div style={{
                                marginBottom: '1rem'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '0.875rem',
                                    color: '#9CA3AF',
                                    marginBottom: '0.5rem'
                                }}>
                                    <span>활성 노드</span>
                                    <span>{board.activeNodes} / {board.totalNodes}</span>
                                </div>
                                <div style={{
                                    width: '100%',
                                    height: '8px',
                                    background: '#1A1D29',
                                    borderRadius: '4px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        width: `${completionPercent}%`,
                                        height: '100%',
                                        background: color,
                                        transition: 'width 0.5s ease'
                                    }} />
                                </div>
                            </div>

                            {/* Effects */}
                            {board.effects && board.effects.length > 0 && (
                                <div>
                                    <div style={{
                                        fontSize: '0.75rem',
                                        color: '#9CA3AF',
                                        marginBottom: '0.5rem',
                                        fontWeight: '600'
                                    }}>
                                        보드 효과
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.5rem'
                                    }}>
                                        {board.effects.map((effect, idx) => (
                                            <div
                                                key={idx}
                                                style={{
                                                    padding: '0.5rem',
                                                    background: '#1A1D29',
                                                    borderLeft: `3px solid ${color}`,
                                                    borderRadius: '4px',
                                                    fontSize: '0.75rem',
                                                    color: '#E5E7EB'
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
                })}
            </div>

            <style jsx>{`
        .devanion-card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }
      `}</style>
        </div>
    )
}
