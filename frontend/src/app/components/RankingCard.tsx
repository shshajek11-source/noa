'use client'

interface RankingItem {
    name: string
    rank: number
    value?: string | number
    extra?: string // Tier or Win Rate
}

interface RankingCardProps {
    rankings: {
        rankingList: any[]
    }
    isEmbedded?: boolean
}

export default function RankingCard({ rankings, isEmbedded = false }: RankingCardProps) {
    // Debug: Check the actual data structure
    // console.log('Ranking Data:', rankings)

    const list = rankings?.rankingList || []

    // Helper to find ranking by keywords
    const getRanking = (keywords: string[]): RankingItem | null => {
        const found = list.find(item => {
            // Check rankingContentsName as well
            const name = (item.rankingContentsName || item.categoryName || item.name || '').replace(/\s+/g, '')
            return keywords.some(k => name.includes(k))
        })

        if (!found) return null

        const rank = found.rank || found.myRanking || 0

        // Point / Score
        let value = found.point || found.score || found.value
        if (typeof value === 'number') value = value.toLocaleString()

        // Construct extra info (Tier or Win Rate)
        let extra = ''
        if (found.gradeName || found.tier || found.grade) {
            extra = found.gradeName || found.tier || found.grade
        } else if (found.winCount !== undefined && found.playCount) {
            const rate = ((found.winCount / found.playCount) * 100).toFixed(1)
            extra = `${rate}%`
        }

        return {
            // Prefer API name if available
            name: found.rankingContentsName || found.categoryName || found.name || keywords[0],
            rank,
            value,
            extra
        }
    }

    // Define the 7 requested rankings
    const rankingDefinitions = [
        { key: 'abyss', keywords: ['어비스', 'Abyss'], label: '어비스 포인트', iconColor: '#EF4444' },
        { key: 'transcendence', keywords: ['초월', 'Transcen'], label: '초월', iconColor: '#8B5CF6' },
        { key: 'nightmare', keywords: ['악몽', 'Nightmare'], label: '악몽', iconColor: '#6366F1' },
        { key: 'solitude', keywords: ['고독', 'Solitude'], label: '고독의 투기장', iconColor: '#F59E0B' },
        { key: 'cooperation', keywords: ['협력', 'Cooperation'], label: '협력의 투기장', iconColor: '#10B981' },
        { key: 'conquest', keywords: ['토벌', 'Conquest'], label: '토벌전', iconColor: '#EF4444' },
        { key: 'awakening', keywords: ['각성', 'Awaken'], label: '각성전', iconColor: '#3B82F6' },
    ]

    const dataToShow = rankingDefinitions.map(def => {
        const info = getRanking(def.keywords)
        return {
            ...def,
            info // can be null
        }
    })

    const abyssRanking = dataToShow.find(item => item.key === 'abyss')
    const otherRankings = dataToShow.filter(item => item.key !== 'abyss')

    return (
        <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '1.25rem',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
        }}>
            {/* 타이틀 */}
            <h3 style={{
                fontSize: '0.95rem',
                fontWeight: 'bold',
                color: 'var(--text-main)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
            }}>
                <span style={{ color: '#FACC15' }}>🏆</span> 랭킹 정보
            </h3>

            {/* 1. 상단: 어비스 포인트 (강조) */}
            {abyssRanking && (
                <div style={{
                    background: 'linear-gradient(180deg, var(--bg-hover) 0%, var(--bg-secondary) 100%)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.25rem'
                }}>
                    {/* 이미지 상단 배치 - 더 크게 */}
                    <img
                        src="/메달/1.png"
                        alt="어비스 포인트"
                        style={{ width: 64, height: 64, objectFit: 'contain' }}
                    />
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{abyssRanking.label}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--brand-red-main)' }}>
                            {abyssRanking.info?.value || '-'}
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'white' }}>
                            {abyssRanking.info?.rank && abyssRanking.info.rank > 0 ? `${abyssRanking.info.rank}위` : '-'}
                        </div>
                    </div>
                </div>
            )}

            {/* 2. 하단: 나머지 랭킹 (3열 그리드) */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.4rem',
                flex: 1
            }}>
                {otherRankings.map(item => (
                    <div key={item.key} style={{
                        background: 'var(--bg-hover)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        padding: '0.35rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.1rem',
                        textAlign: 'center'
                    }}>
                        <img
                            src="/메달/2.png"
                            alt={item.label}
                            style={{ width: 28, height: 28, objectFit: 'contain' }}
                        />
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{item.label}</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                            {item.info?.rank && item.info.rank > 0 ? `${item.info.rank}위` : <span style={{ color: 'var(--text-disabled)' }}>-</span>}
                        </div>
                        {item.info?.extra && (
                            <div style={{ fontSize: '0.65rem', color: item.iconColor }}>{item.info.extra}</div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
