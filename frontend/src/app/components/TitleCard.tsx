'use client'

interface TitleCategory {
    name: string
    icon: React.ReactNode
    total: number
    owned: number
    representativeTitle?: {
        name: string
        effects: string[]
    }
}

// SVG 아이콘 컴포넌트들
const AttackIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2L4 12l3 3 10-10-3-3z" fill="currentColor" opacity="0.3" />
        <path d="M14 2L4 12l3 3 10-10-3-3z" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M4 12l3 3-5 5 2 2 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
)

const DefenseIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L4 6v6c0 5.5 3.5 10 8 11 4.5-1 8-5.5 8-11V6l-8-4z" fill="currentColor" opacity="0.3" />
        <path d="M12 2L4 6v6c0 5.5 3.5 10 8 11 4.5-1 8-5.5 8-11V6l-8-4z" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
)

const OtherIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.3" />
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <circle cx="12" cy="8" r="1.5" fill="currentColor" />
        <circle cx="8" cy="14" r="1.5" fill="currentColor" />
        <circle cx="16" cy="14" r="1.5" fill="currentColor" />
    </svg>
)

export default function TitleCard({ titles }: { titles: any }) {
    if (!titles) return null

    const totalCount = titles.totalCount || 0
    const ownedCount = titles.ownedCount || 0
    const titleList = titles.titleList || []

    // 카테고리별 분류
    const categorizeTitle = (title: any): string => {
        const equipCategory = title.equipCategory || ''

        // API uses: "Defense", "Attack", "Etc"
        if (equipCategory === 'Attack') return 'attack'
        if (equipCategory === 'Defense') return 'defense'
        if (equipCategory === 'Etc') return 'other'

        return 'other'
    }

    // 효과 파싱
    const parseEffects = (title: any): string[] => {
        // API uses equipStatList array with desc field
        if (title.equipStatList && Array.isArray(title.equipStatList)) {
            return title.equipStatList.map((stat: any) => stat.desc).filter(Boolean)
        }
        if (title.statList && Array.isArray(title.statList)) {
            return title.statList.map((stat: any) => stat.desc).filter(Boolean)
        }
        return []
    }

    // 카테고리별 데이터 집계 (API는 각 titleList 항목에 카테고리별 totalCount/ownedCount 제공)
    const attackTitle = titleList.find((t: any) => categorizeTitle(t) === 'attack')
    const defenseTitle = titleList.find((t: any) => categorizeTitle(t) === 'defense')
    const otherTitle = titleList.find((t: any) => categorizeTitle(t) === 'other')

    const categories: TitleCategory[] = [
        {
            name: '공격계열',
            icon: <AttackIcon />,
            total: attackTitle?.totalCount || 0,
            owned: attackTitle?.ownedCount || 0,
            representativeTitle: attackTitle ? {
                name: attackTitle.name,
                effects: parseEffects(attackTitle)
            } : undefined
        },
        {
            name: '방어계열',
            icon: <DefenseIcon />,
            total: defenseTitle?.totalCount || 0,
            owned: defenseTitle?.ownedCount || 0,
            representativeTitle: defenseTitle ? {
                name: defenseTitle.name,
                effects: parseEffects(defenseTitle)
            } : undefined
        },
        {
            name: '기타계열',
            icon: <OtherIcon />,
            total: otherTitle?.totalCount || 0,
            owned: otherTitle?.ownedCount || 0,
            representativeTitle: otherTitle ? {
                name: otherTitle.name,
                effects: parseEffects(otherTitle)
            } : undefined
        }
    ]

    // Only use accent color for high progress (75%+)
    const isHighProgress = totalCount > 0 && (ownedCount / totalCount) >= 0.75

    return (
        <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '1rem',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem',
                flexShrink: 0
            }}>
                <h3 style={{
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    color: 'var(--text-main)',
                    margin: 0
                }}>
                    타이틀
                </h3>
                <div style={{
                    padding: '0.2rem 0.5rem',
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                }}>
                    <span style={{ color: isHighProgress ? '#FACC15' : 'var(--text-main)' }}>
                        {ownedCount}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>/{totalCount}</span>
                </div>
            </div>

            {/* 3-Column Category Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.6rem'
            }}>
                {categories.map((category, idx) => (
                    <div
                        key={idx}
                        style={{
                            background: 'var(--bg-hover)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            padding: '0.8rem',
                            transition: 'all 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            minHeight: '180px'
                        }}
                        className="category-card-hover"
                    >
                        {/* Category Header */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            marginBottom: '0.4rem'
                        }}>
                            <span style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>
                                {category.icon}
                            </span>
                            <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                color: 'var(--text-main)'
                            }}>
                                {category.name}
                            </span>
                        </div>

                        {/* Count */}
                        <div style={{
                            fontSize: '0.75rem',
                            marginBottom: '0.4rem'
                        }}>
                            <span style={{ color: 'var(--text-main)', fontWeight: 'bold' }}>
                                {category.owned}
                            </span>
                            <span style={{ color: 'var(--text-secondary)' }}>/{category.total}</span>
                        </div>

                        {/* Representative Title Name */}
                        {category.representativeTitle && (
                            <div style={{
                                fontSize: '0.75rem',
                                color: '#FACC15',
                                fontWeight: 'bold',
                                marginBottom: '0.4rem',
                                lineHeight: '1.4'
                            }}>
                                {category.representativeTitle.name}
                            </div>
                        )}

                        {/* All Effects */}
                        {category.representativeTitle && category.representativeTitle.effects.length > 0 && (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.25rem'
                            }}>
                                {category.representativeTitle.effects.map((effect, effectIdx) => (
                                    <div key={effectIdx} style={{
                                        fontSize: '0.7rem',
                                        color: '#60A5FA',
                                        lineHeight: '1.4',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        • {effect}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <style jsx>{`
                .category-card-hover:hover {
                    border-color: var(--brand-primary);
                    transform: translateY(-2px);
                }
            `}</style>
        </div>
    )
}
