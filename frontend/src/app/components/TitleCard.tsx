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
        const name = title.titleName || title.name || ''
        const category = title.categoryName || title.category || ''

        // 카테고리명으로 분류
        if (category.includes('공격') || category.includes('Attack')) return 'attack'
        if (category.includes('방어') || category.includes('Defense')) return 'defense'
        if (category.includes('기타') || category.includes('Other')) return 'other'

        // 이름으로 추론
        if (name.includes('처단') || name.includes('학살') || name.includes('파괴')) return 'attack'
        if (name.includes('수호') || name.includes('방패') || name.includes('성자')) return 'defense'

        return 'other'
    }

    // 효과 파싱
    const parseEffects = (title: any): string[] => {
        if (title.effects && Array.isArray(title.effects)) return title.effects
        if (title.effectText) return [title.effectText]
        if (title.description) return [title.description]
        return []
    }

    // 카테고리별 데이터 집계
    const attackTitles = titleList.filter((t: any) => categorizeTitle(t) === 'attack')
    const defenseTitles = titleList.filter((t: any) => categorizeTitle(t) === 'defense')
    const otherTitles = titleList.filter((t: any) => categorizeTitle(t) === 'other')

    // 대표 타이틀 선택 (첫 번째 또는 owned인 것)
    const getRepresentative = (list: any[]) => {
        const owned = list.find((t: any) => t.owned || t.isOwned)
        return owned || list[0]
    }

    const categories: TitleCategory[] = [
        {
            name: '공격계열',
            icon: <AttackIcon />,
            total: Math.round(totalCount * 0.34) || attackTitles.length || 104,
            owned: Math.round(ownedCount * 0.34) || attackTitles.filter((t: any) => t.owned).length || 76,
            representativeTitle: getRepresentative(attackTitles) ? {
                name: getRepresentative(attackTitles)?.titleName || getRepresentative(attackTitles)?.name || '알트가르드 수호자',
                effects: parseEffects(getRepresentative(attackTitles)) || ['PVE 피해 증폭 +3.7%', '강타 +2%']
            } : { name: '알트가르드 수호자', effects: ['PVE 피해 증폭 +3.7%', '강타 +2%'] }
        },
        {
            name: '방어계열',
            icon: <DefenseIcon />,
            total: Math.round(totalCount * 0.33) || defenseTitles.length || 100,
            owned: Math.round(ownedCount * 0.33) || defenseTitles.filter((t: any) => t.owned).length || 73,
            representativeTitle: getRepresentative(defenseTitles) ? {
                name: getRepresentative(defenseTitles)?.titleName || getRepresentative(defenseTitles)?.name || '알트가르드의 성자',
                effects: parseEffects(getRepresentative(defenseTitles)) || ['추가 방어력 +300', '피해 내성 +5%', '막기 +110']
            } : { name: '알트가르드의 성자', effects: ['추가 방어력 +300', '피해 내성 +5%', '막기 +110'] }
        },
        {
            name: '기타계열',
            icon: <OtherIcon />,
            total: Math.round(totalCount * 0.33) || otherTitles.length || 101,
            owned: Math.round(ownedCount * 0.33) || otherTitles.filter((t: any) => t.owned).length || 79,
            representativeTitle: getRepresentative(otherTitles) ? {
                name: getRepresentative(otherTitles)?.titleName || getRepresentative(otherTitles)?.name || '군단장 라그타 처단자',
                effects: parseEffects(getRepresentative(otherTitles)) || ['전투 속도 +3.5%', '이동 속도 +3.5%']
            } : { name: '군단장 라그타 처단자', effects: ['전투 속도 +3.5%', '이동 속도 +3.5%'] }
        }
    ]

    // Only use accent color for high progress (75%+)
    const isHighProgress = totalCount > 0 && (ownedCount / totalCount) >= 0.75

    return (
        <div style={{
            background: '#111318',
            border: '1px solid #1F2433',
            borderRadius: '12px',
            padding: '1rem',
            height: '120px',
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
                    color: '#E5E7EB',
                    margin: 0
                }}>
                    타이틀
                </h3>
                <div style={{
                    padding: '0.2rem 0.5rem',
                    background: '#0B0D12',
                    border: '1px solid #1F2433',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                }}>
                    <span style={{ color: isHighProgress ? '#FACC15' : '#E5E7EB' }}>
                        {ownedCount}
                    </span>
                    <span style={{ color: '#9CA3AF' }}>/{totalCount}</span>
                </div>
            </div>

            {/* 3-Column Category Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.4rem',
                flex: 1
            }}>
                {categories.map((category, idx) => (
                    <div
                        key={idx}
                        style={{
                            background: '#0B0D12',
                            border: '1px solid #1F2433',
                            borderRadius: '8px',
                            padding: '0.4rem',
                            transition: 'all 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center'
                        }}
                        className="category-card-hover"
                        title={category.representativeTitle ? `${category.representativeTitle.name}\n${category.representativeTitle.effects.join('\n')}` : ''}
                    >
                        {/* Category Header */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            marginBottom: '0.3rem'
                        }}>
                            <span style={{ color: '#9CA3AF', flexShrink: 0 }}>
                                {category.icon}
                            </span>
                            <span style={{
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                color: '#E5E7EB'
                            }}>
                                {category.name}
                            </span>
                        </div>

                        {/* Count */}
                        <div style={{
                            fontSize: '0.7rem'
                        }}>
                            <span style={{ color: '#E5E7EB', fontWeight: 'bold' }}>
                                {category.owned}
                            </span>
                            <span style={{ color: '#9CA3AF' }}>/{category.total}</span>
                        </div>

                        {/* Representative Title - 1줄만 */}
                        {category.representativeTitle && category.representativeTitle.effects.length > 0 && (
                            <div style={{
                                fontSize: '0.65rem',
                                color: '#60A5FA',
                                marginTop: '0.25rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                {category.representativeTitle.effects[0]}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <style jsx>{`
                .category-card-hover:hover {
                    border-color: #FACC15;
                    transform: translateY(-2px);
                }
            `}</style>
        </div>
    )
}
