export default function DaevanionCard({ daevanion }: { daevanion: any }) {
    if (!daevanion) return null

    const boardList = daevanion.boardList || []
    const totalBoards = 6 // AION typically has 6 Daevanion gods
    const activeBoards = boardList.length

    // Calculate total nodes (if available in data)
    const totalNodes = boardList.reduce((sum: number, board: any) => {
        return sum + (board.activatedNodes || board.nodeCount || 0)
    }, 0)

    // God icons/names (placeholder, can be customized)
    const godNames = ['Vaizel', 'Lumiel', 'Marchutan', 'Nezekan', 'Israphel', 'Siel']

    return (
        <div style={{
            background: '#111318',
            border: '1px solid #1F2433',
            borderRadius: '12px',
            padding: '1.25rem'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem'
            }}>
                <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: 'bold',
                    color: '#E5E7EB',
                    margin: 0
                }}>
                    주신 능력치
                </h3>
                <div style={{
                    padding: '0.25rem 0.75rem',
                    background: '#0B0D12',
                    border: '1px solid #1F2433',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    color: activeBoards >= 4 ? '#FACC15' : '#E5E7EB',
                    fontWeight: 'bold'
                }}>
                    {activeBoards}/{totalBoards}
                </div>
            </div>

            {/* God Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.5rem',
                marginBottom: '1rem'
            }}>
                {godNames.map((god, idx) => {
                    const isActive = idx < activeBoards
                    return (
                        <div
                            key={idx}
                            title={god}
                            style={{
                                aspectRatio: '1',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: isActive ? '#0B0D12' : '#0B0D12',
                                border: isActive
                                    ? '1px solid #FACC1540'
                                    : '1px solid #1F2433',
                                borderRadius: '8px',
                                transition: 'all 0.2s',
                                cursor: 'pointer'
                            }}
                            className="god-card-hover"
                        >
                            <div style={{
                                fontSize: '1.5rem',
                                marginBottom: '0.25rem',
                                filter: isActive ? 'grayscale(0)' : 'grayscale(1)',
                                opacity: isActive ? 1 : 0.3
                            }}>
                                ⭐
                            </div>
                            <div style={{
                                fontSize: '0.625rem',
                                color: isActive ? '#FACC15' : '#9CA3AF',
                                fontWeight: isActive ? 'bold' : 'normal'
                            }}>
                                {god.substring(0, 4)}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Summary Stats */}
            <div style={{
                padding: '0.75rem',
                background: '#0B0D12',
                borderRadius: '8px',
                border: '1px solid #1F2433',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span style={{
                    fontSize: '0.875rem',
                    color: '#9CA3AF'
                }}>
                    활성화된 노드
                </span>
                <span style={{
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    color: totalNodes > 0 ? '#FACC15' : '#E5E7EB'
                }}>
                    {totalNodes}
                </span>
            </div>

            <style jsx>{`
                .god-card-hover:hover {
                    border-color: #FACC15;
                    transform: translateY(-2px);
                }
            `}</style>
        </div>
    )
}
