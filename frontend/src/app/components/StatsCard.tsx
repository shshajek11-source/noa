export default function StatsCard({ stats }: { stats: any }) {
    if (!stats) return null

    // Extract key stats from statList
    const statList = stats.statList || []

    const getStatValue = (name: string) => {
        const stat = statList.find((s: any) => s.name === name || s.statName === name)
        return stat ? stat.value || stat.statValue : 'N/A'
    }

    const keyStats = [
        { label: '공격력', value: getStatValue('공격력'), icon: '⚔️' },
        { label: '방어력', value: getStatValue('방어력'), icon: '🛡️' },
        { label: 'HP', value: getStatValue('HP'), icon: '❤️' },
        { label: 'MP', value: getStatValue('MP'), icon: '💙' },
        { label: '치명타', value: getStatValue('치명타'), icon: '💥' },
        { label: '명중', value: getStatValue('명중'), icon: '🎯' }
    ]

    return (
        <div style={{
            background: '#111318',
            border: '1px solid #1F2433',
            borderRadius: '12px',
            padding: '1.25rem'
        }}>
            {/* Header */}
            <h3 style={{
                fontSize: '1.125rem',
                fontWeight: 'bold',
                color: '#E5E7EB',
                marginBottom: '1rem'
            }}>
                능력치
            </h3>

            {/* Stats Grid */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
            }}>
                {keyStats.map((stat, idx) => (
                    <div
                        key={idx}
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.625rem',
                            background: '#0B0D12',
                            borderRadius: '6px',
                            border: '1px solid #1F2433',
                            transition: 'all 0.2s'
                        }}
                        className="stat-row-hover"
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <span style={{ fontSize: '1rem' }}>{stat.icon}</span>
                            <span style={{
                                fontSize: '0.875rem',
                                color: '#9CA3AF'
                            }}>
                                {stat.label}
                            </span>
                        </div>
                        <span style={{
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            color: '#E5E7EB'
                        }}>
                            {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                        </span>
                    </div>
                ))}
            </div>

            <style jsx>{`
                .stat-row-hover:hover {
                    border-color: #FACC15;
                    transform: translateX(2px);
                }
            `}</style>
        </div>
    )
}
