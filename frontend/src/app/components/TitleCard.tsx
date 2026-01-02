export default function TitleCard({ titles }: { titles: any }) {
    if (!titles) return null

    const totalCount = titles.totalCount || 0
    const ownedCount = titles.ownedCount || 0
    const progress = totalCount > 0 ? (ownedCount / totalCount) * 100 : 0

    // Only use accent color for high progress (75%+)
    const isHighProgress = progress >= 75

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
                    칭호
                </h3>
                <div style={{
                    padding: '0.25rem 0.75rem',
                    background: '#0B0D12',
                    border: '1px solid #1F2433',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    color: isHighProgress ? '#FACC15' : '#E5E7EB',
                    fontWeight: 'bold'
                }}>
                    {ownedCount}/{totalCount}
                </div>
            </div>

            {/* Active Title (if available) */}
            {titles.titleList && titles.titleList.length > 0 && (
                <div style={{
                    padding: '0.75rem',
                    background: '#0B0D12',
                    border: '1px solid #1F2433',
                    borderRadius: '8px',
                    marginBottom: '1rem'
                }}>
                    <div style={{
                        fontSize: '0.75rem',
                        color: '#9CA3AF',
                        marginBottom: '0.25rem'
                    }}>
                        Active Title
                    </div>
                    <div style={{
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        color: '#E5E7EB'
                    }}>
                        {titles.titleList[0].titleName || 'No Active Title'}
                    </div>
                </div>
            )}

            {/* Progress Bar */}
            <div>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem',
                    fontSize: '0.75rem'
                }}>
                    <span style={{ color: '#9CA3AF' }}>수집 진행도</span>
                    <span style={{
                        color: isHighProgress ? '#FACC15' : '#E5E7EB',
                        fontWeight: 'bold'
                    }}>
                        {progress.toFixed(1)}%
                    </span>
                </div>
                <div style={{
                    width: '100%',
                    height: '8px',
                    background: '#0B0D12',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    border: '1px solid #1F2433'
                }}>
                    <div style={{
                        height: '100%',
                        width: `${progress}%`,
                        background: isHighProgress
                            ? 'linear-gradient(90deg, #FACC15 0%, #FBBF24 100%)'
                            : '#9CA3AF',
                        transition: 'width 0.3s ease'
                    }} />
                </div>
            </div>
        </div>
    )
}
