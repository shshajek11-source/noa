'use client'
import { useState } from 'react'

interface MainStat {
    key: string
    label: string
    value: number
    icon: React.ReactNode
}

// SVG 아이콘 컴포넌트들
const PowerIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.5 2 5 4.5 5 9c0 2.5 1.5 4.5 3.5 5.5L9 22l3-3 3 3 .5-7.5C17.5 13.5 19 11.5 19 9c0-4.5-3.5-7-7-7z"
            fill="currentColor" opacity="0.3" />
        <path d="M7 9a5 5 0 1 1 10 0c0 2-1 3.5-2.5 4.5l-.5 6-2-2-2 2-.5-6C8 13.5 7 12 7 9z"
            stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
)

const AgilityIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 3L4 8v8l8 5 8-5V8l-8-5z" fill="currentColor" opacity="0.3" />
        <path d="M12 3L4 8l8 5 8-5-8-5z" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M4 8v8l8 5 8-5V8" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M12 13v8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
)

const AccuracyIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="8" fill="currentColor" opacity="0.3" />
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
)

const WillIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L9 9l-7 1 5 5-1 7 6-3 6 3-1-7 5-5-7-1-3-7z" fill="currentColor" opacity="0.3" />
        <path d="M12 2L9 9l-7 1 5 5-1 7 6-3 6 3-1-7 5-5-7-1-3-7z" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
)

const KnowledgeIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 4h16v16H4z" fill="currentColor" opacity="0.3" />
        <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M8 8h8M8 12h8M8 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
)

const StaminaIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 21c-4-4-8-6.5-8-10.5a5.5 5.5 0 0 1 11 0 5.5 5.5 0 0 1 11 0c0 4-4 6.5-8 10.5l-3-2.5-3 2.5z"
            fill="currentColor" opacity="0.3" />
        <path d="M12 6a4 4 0 0 1 4 4c0 3-4 6-4 8-0-2-4-5-4-8a4 4 0 0 1 4-4z"
            stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
)

export default function MainStatsCard({ stats }: { stats: any }) {
    const [expanded, setExpanded] = useState(false)

    if (!stats) return null

    const statList = stats.statList || []

    // 스텟 값 가져오기 헬퍼
    const getStatValue = (names: string[]): number => {
        for (const name of names) {
            const stat = statList.find((s: any) =>
                s.name === name || s.statName === name ||
                s.name?.includes(name) || s.statName?.includes(name)
            )
            if (stat) {
                const val = stat.value || stat.statValue || 0
                return typeof val === 'string' ? parseInt(val.replace(/,/g, '')) : val
            }
        }
        return 0
    }

    // 주요 6개 스텟
    const mainStats: MainStat[] = [
        { key: 'power', label: '위력', value: getStatValue(['위력', 'Power', '공격력']), icon: <PowerIcon /> },
        { key: 'agility', label: '민첩', value: getStatValue(['민첩', 'Agility', '공격속도']), icon: <AgilityIcon /> },
        { key: 'accuracy', label: '정확', value: getStatValue(['정확', 'Accuracy', '명중']), icon: <AccuracyIcon /> },
        { key: 'will', label: '의지', value: getStatValue(['의지', 'Will', '마법저항']), icon: <WillIcon /> },
        { key: 'knowledge', label: '지식', value: getStatValue(['지식', 'Knowledge', '마법력']), icon: <KnowledgeIcon /> },
        { key: 'stamina', label: '체력', value: getStatValue(['체력', 'Stamina', 'HP', '생명력']), icon: <StaminaIcon /> }
    ]

    // 전체 스텟 리스트 (더보기용)
    const allStats = statList.map((s: any) => ({
        name: s.name || s.statName,
        value: s.value || s.statValue
    }))

    return (
        <div style={{
            background: '#111318',
            border: '1px solid #1F2433',
            borderRadius: '12px',
            padding: '1rem',
            height: '220px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header */}
            <h3 style={{
                fontSize: '0.95rem',
                fontWeight: 'bold',
                color: '#E5E7EB',
                margin: 0,
                marginBottom: '0.75rem',
                height: '20px'
            }}>
                주요 스텟
            </h3>

            {/* 6 Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: '0.4rem',
                marginBottom: '0.5rem',
                flex: 1
            }}>
                {mainStats.map((stat) => (
                    <div
                        key={stat.key}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0.5rem 0.2rem',
                            background: '#0B0D12',
                            borderRadius: '8px',
                            border: '1px solid #1F2433',
                            transition: 'all 0.2s',
                            cursor: 'default'
                        }}
                        className="stat-item-hover"
                    >
                        {/* Icon */}
                        <div style={{
                            color: '#9CA3AF',
                            marginBottom: '0.35rem'
                        }}>
                            {stat.icon}
                        </div>

                        {/* Label */}
                        <span style={{
                            fontSize: '0.7rem',
                            color: '#9CA3AF',
                            marginBottom: '0.2rem'
                        }}>
                            {stat.label}
                        </span>

                        {/* Value */}
                        <span style={{
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            color: '#E5E7EB'
                        }}>
                            {stat.value.toLocaleString()}
                        </span>
                    </div>
                ))}
            </div>

            {/* Expand Button */}
            <button
                onClick={() => setExpanded(!expanded)}
                style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: 'transparent',
                    border: '1px solid #1F2433',
                    borderRadius: '6px',
                    color: '#9CA3AF',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s',
                    height: '32px',
                    flexShrink: 0
                }}
                className="expand-btn-hover"
            >
                더보기
                <span style={{
                    transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s'
                }}>
                    ∨
                </span>
            </button>

            {/* Expanded Stats List */}
            {expanded && allStats.length > 0 && (
                <div style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    background: '#0B0D12',
                    borderRadius: '8px',
                    border: '1px solid #1F2433',
                    maxHeight: '300px',
                    overflowY: 'auto'
                }}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                    }}>
                        {allStats.map((stat: any, idx: number) => (
                            <div
                                key={idx}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: '0.5rem',
                                    borderBottom: idx < allStats.length - 1 ? '1px solid #1F2433' : 'none'
                                }}
                            >
                                <span style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>
                                    {stat.name}
                                </span>
                                <span style={{ color: '#E5E7EB', fontSize: '0.875rem', fontWeight: 'bold' }}>
                                    {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <style jsx>{`
                .stat-item-hover:hover {
                    border-color: #FACC15;
                    transform: translateY(-2px);
                }
                .expand-btn-hover:hover {
                    border-color: #9CA3AF;
                    color: #E5E7EB;
                }
            `}</style>
        </div>
    )
}
