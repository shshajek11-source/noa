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
            padding: '1rem',
            height: '90px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.4rem',
                flexShrink: 0
            }}>
                <h3 style={{
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    color: '#E5E7EB',
                    margin: 0
                }}>
                    주신 능력치
                </h3>
                <div style={{
                    padding: '0.15rem 0.4rem',
                    background: '#0B0D12',
                    border: '1px solid #1F2433',
                    borderRadius: '12px',
                    fontSize: '0.7rem',
                    color: activeBoards >= 4 ? '#FACC15' : '#E5E7EB',
                    fontWeight: 'bold'
                }}>
                    {activeBoards}/{totalBoards}
                </div>
            </div>

            {/* God Grid - 1행으로 변경 */}
            <div style={{
                display: 'flex',
                gap: '0.3rem',
                flex: 1,
                alignItems: 'center'
            }}>
                {godNames.map((god, idx) => {
                    const isActive = idx < activeBoards
                    return (
                        <div
                            key={idx}
                            title={god}
                            style={{
                                width: `calc((100% - 1.5rem) / 6)`,
                                aspectRatio: '1',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#0B0D12',
                                border: isActive
                                    ? '1px solid #FACC1540'
                                    : '1px solid #1F2433',
                                borderRadius: '6px',
                                transition: 'all 0.2s',
                                cursor: 'pointer',
                                padding: '0.2rem'
                            }}
                            className="god-card-hover"
                        >
                            <div style={{
                                fontSize: '0.9rem',
                                filter: isActive ? 'grayscale(0)' : 'grayscale(1)',
                                opacity: isActive ? 1 : 0.3
                            }}>
                                ⭐
                            </div>
                        </div>
                    )
                })}
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
