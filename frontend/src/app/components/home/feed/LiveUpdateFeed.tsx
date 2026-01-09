import { useState, useEffect } from 'react'

interface FeedItem {
    id: number
    type: 'rank_up' | 'new_ranker' | 'level_up' | 'guild'
    className: string
    playerName: string
    detail: string
    time: string
}

// Mock Data Generator with structured data (no XSS risk)
const generateMockFeed = (): Omit<FeedItem, 'id' | 'time'> => {
    const classes = ['검성', '수호성', '궁성', '살성', '마도성', '정령성', '치유성', '호법성']
    const names = ['홍길동', '김철수', '이영희', '박민수', '최지우', '정우성', '강동원', '손예진']
    const types: FeedItem['type'][] = ['rank_up', 'new_ranker', 'level_up', 'guild']

    const randomClass = classes[Math.floor(Math.random() * classes.length)]
    const randomName = names[Math.floor(Math.random() * names.length)]
    const randomType = types[Math.floor(Math.random() * types.length)]

    let detail = ''
    switch (randomType) {
        case 'rank_up':
            detail = `전투력 ${(Math.floor(Math.random() * 2000) + 500).toLocaleString()} 상승`
            break
        case 'new_ranker':
            detail = `TOP ${Math.floor(Math.random() * 50) + 1} 진입`
            break
        case 'level_up':
            detail = `Lv.${Math.floor(Math.random() * 10) + 35} 달성`
            break
        case 'guild':
            detail = `길드 랭킹 ${Math.floor(Math.random() * 10) + 1}위`
            break
    }

    return { type: randomType, className: randomClass, playerName: randomName, detail }
}

const getTypeIcon = (type: FeedItem['type']) => {
    switch (type) {
        case 'rank_up': return '📈'
        case 'new_ranker': return '🏆'
        case 'level_up': return '⬆️'
        case 'guild': return '🏰'
        default: return '📢'
    }
}

const getTypeColor = (type: FeedItem['type']) => {
    switch (type) {
        case 'rank_up': return '#4ade80'
        case 'new_ranker': return '#fbbf24'
        case 'level_up': return '#60a5fa'
        case 'guild': return '#a78bfa'
        default: return '#9ca3af'
    }
}

export default function LiveUpdateFeed() {
    const [feeds, setFeeds] = useState<FeedItem[]>([])

    useEffect(() => {
        // Initial Mock Data
        const initial = Array.from({ length: 5 }).map((_, i) => ({
            id: Date.now() - i * 1000,
            ...generateMockFeed(),
            time: '방금 전'
        }))
        setFeeds(initial)

        // Add new feed every 5 seconds (reduced frequency)
        const interval = setInterval(() => {
            setFeeds(prev => {
                const newFeed = {
                    id: Date.now(),
                    ...generateMockFeed(),
                    time: '방금 전'
                }
                // Update time for older feeds
                const updated = prev.slice(0, 4).map((f, i) => ({
                    ...f,
                    time: i === 0 ? '10초 전' : i === 1 ? '30초 전' : i === 2 ? '1분 전' : '2분 전'
                }))
                return [newFeed, ...updated]
            })
        }, 5000)

        return () => clearInterval(interval)
    }, [])

    return (
        <section style={{
            height: '100%',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)',
            borderRadius: '12px',
            padding: '1.25rem',
            border: '1px solid rgba(255,255,255,0.05)'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem'
            }}>
                <h2 style={{
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    color: '#9CA3AF',
                    letterSpacing: '-0.02em',
                    margin: 0
                }}>
                    실시간 업데이트
                </h2>
                <span style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-disabled)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                }}>
                    <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#4ade80',
                        animation: 'pulse 2s infinite'
                    }} />
                    LIVE
                </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {feeds.map((feed, index) => (
                    <div
                        key={feed.id}
                        style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.5rem',
                            fontSize: '0.8rem',
                            padding: '0.5rem',
                            borderRadius: '6px',
                            background: index === 0 ? 'rgba(255,255,255,0.03)' : 'transparent',
                            animation: index === 0 ? 'fadeIn 0.5s ease-in-out' : 'none',
                            transition: 'background 0.3s'
                        }}
                    >
                        <span style={{ fontSize: '0.9rem' }}>{getTypeIcon(feed.type)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap' }}>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                                    [{feed.className}]
                                </span>
                                <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>
                                    {feed.playerName}
                                </span>
                            </div>
                            <div style={{ color: getTypeColor(feed.type), fontSize: '0.8rem', marginTop: '2px' }}>
                                {feed.detail}
                            </div>
                        </div>
                        <span style={{
                            fontSize: '0.65rem',
                            color: 'var(--text-disabled)',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                        }}>
                            {feed.time}
                        </span>
                    </div>
                ))}
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </section>
    )
}
