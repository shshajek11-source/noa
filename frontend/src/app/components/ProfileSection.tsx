import { useState } from 'react'
import Image from 'next/image'
import { calculateCombatPower, getTierInfo, getTierBadgeStyle } from '../utils/combatPower'

interface ProfileSectionProps {
    character: any
    arcana?: any[]
    onArcanaClick?: (item: any) => void
    stats?: any
    equipment?: any[]
    topPower?: number  // 1등 전투력 (상대 평가용)
}

export default function ProfileSection({ character, arcana, onArcanaClick, stats, equipment, topPower }: ProfileSectionProps) {
    if (!character) return null

    const [hoveredArcana, setHoveredArcana] = useState<any | null>(null)

    // Extract item level from stats (same way as MainStatsCard)
    const statList = stats?.statList || []
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

    const itemLevel = getStatValue(['아이템', 'Item', 'item'])

    // Calculate combat power and tier (상대 평가: 1등 기준)
    const allEquipment = equipment || []
    const combatPower = calculateCombatPower(stats, allEquipment)
    const tierInfo = getTierInfo(combatPower, topPower)
    const tierBadgeStyle = getTierBadgeStyle(tierInfo)

    // Calculate rank tier based on percentile (Bronze → Silver → Gold → Platinum → Emerald → Sapphire → Ruby → Diamond)
    const getRankTier = (percentile: number) => {
        if (percentile >= 99) return { name: 'Diamond', color: '#B9F2FF', isTop: true }
        if (percentile >= 97) return { name: 'Ruby', color: '#E0115F', isTop: true }
        if (percentile >= 94) return { name: 'Sapphire', color: '#0F52BA', isTop: true }
        if (percentile >= 90) return { name: 'Emerald', color: '#50C878', isTop: true }
        if (percentile >= 85) return { name: 'Platinum', color: '#E5E4E2', isTop: true }
        if (percentile >= 75) return { name: 'Gold', color: '#FFD700', isTop: false }
        if (percentile >= 60) return { name: 'Silver', color: '#C0C0C0', isTop: false }
        return { name: 'Bronze', color: '#CD7F32', isTop: false }
    }

    const rankTier = getRankTier(character.percentile || 0)

    // Calculate arcana stats totals
    const calculateArcanaTotal = () => {
        if (!arcana || arcana.length === 0) return {}

        const totals: Record<string, number> = {}

        arcana.forEach((item: any) => {
            // Sum base options
            if (item.detail?.options) {
                item.detail.options.forEach((opt: any) => {
                    const value = parseInt(opt.value) || 0
                    if (value > 0) {
                        totals[opt.name] = (totals[opt.name] || 0) + value
                    }
                })
            }

            // Sum random options
            if (item.detail?.randomOptions) {
                item.detail.randomOptions.forEach((opt: any) => {
                    const value = parseInt(opt.value) || 0
                    if (value > 0) {
                        totals[opt.name] = (totals[opt.name] || 0) + value
                    }
                })
            }

            // Sum arcana effects (if numeric)
            if (item.detail?.arcanas) {
                item.detail.arcanas.forEach((arc: any) => {
                    // Try to extract numeric values from description
                    const match = arc.desc?.match(/(\d+)/)
                    if (match) {
                        const value = parseInt(match[1])
                        totals[arc.name] = (totals[arc.name] || 0) + value
                    }
                })
            }
        })

        return totals
    }

    const arcanaTotals = calculateArcanaTotal()

    return (
        <div style={{
            background: 'transparent',
            border: 'none',
            borderRadius: '12px',
            padding: '0.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            height: '100%',
            boxSizing: 'border-box'
        }}>
            {/* Character Image & Basic Info */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem'
            }}>
                {/* Profile Image Container */}
                <div style={{
                    position: 'relative',
                    width: '100px',
                    height: '100px'
                }}>
                    {/* Profile Image */}
                    <div style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: `3px solid ${rankTier.isTop ? rankTier.color : '#1F2433'}`,
                        boxShadow: rankTier.isTop ? `0 0 20px ${rankTier.color}50` : 'none'
                    }}>
                        {character.character_image_url ? (
                            <img
                                src={character.character_image_url}
                                alt={character.name}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                }}
                            />
                        ) : (
                            <div style={{
                                width: '100%',
                                height: '100%',
                                background: 'var(--bg-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-secondary)',
                                fontSize: '2rem'
                            }}>
                                {character.name?.[0]}
                            </div>
                        )}
                    </div>

                    {/* S1 Badge - Bottom Right */}
                    <img
                        src="/s1-badge.png"
                        alt="S1 Badge"
                        style={{
                            position: 'absolute',
                            bottom: '-20px',
                            right: '-24px',
                            width: '80px',
                            height: '80px',
                            objectFit: 'contain',
                            filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))'
                        }}
                    />
                </div>

                {/* Name & Level */}
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{
                        fontSize: '1.25rem',
                        fontWeight: 'bold',
                        color: 'var(--text-main)',
                        margin: 0,
                        marginBottom: '0.25rem'
                    }}>
                        {character.name}
                    </h2>
                    {/* Equipped Title */}
                    {character.title_name && (
                        <div style={{
                            fontSize: '0.75rem',
                            color: character.title_grade === 'Unique' ? '#8B5CF6' :
                                character.title_grade === 'Legend' ? '#F59E0B' :
                                    character.title_grade === 'Rare' ? '#3B82F6' : '#9CA3AF',
                            marginBottom: '0.5rem',
                            fontStyle: 'italic'
                        }}>
                            『{character.title_name}』
                        </div>
                    )}
                    <div style={{
                        display: 'flex',
                        gap: '0.4rem',
                        justifyContent: 'center',
                        flexWrap: 'wrap'
                    }}>
                        <span style={{
                            padding: '0.2rem 0.6rem',
                            background: 'var(--bg-hover)',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            color: 'var(--text-main)'
                        }}>
                            Lv.{character.level}
                        </span>
                        <span style={{
                            padding: '0.2rem 0.6rem',
                            background: 'var(--bg-hover)',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)'
                        }}>
                            {character.class}
                        </span>
                        <span style={{
                            padding: '0.2rem 0.6rem',
                            background: 'var(--bg-hover)',
                            border: '1px solid rgba(217, 43, 75, 0.4)',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            color: 'var(--brand-red-main)'
                        }}>
                            아이템 Lv.{itemLevel || character.item_level || 0}
                        </span>
                    </div>
                </div>
            </div>

            {/* Divider */}
            <div style={{
                height: '1px',
                background: 'var(--border)'
            }} />

            {/* Combat Power */}
            <div style={{
                textAlign: 'center',
                padding: '0.75rem',
                background: 'var(--bg-secondary)',
                borderRadius: '8px',
                border: '1px solid var(--border)'
            }}>
                <div style={{
                    fontSize: '0.65rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '0.5rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    fontWeight: '600'
                }}>
                    Hiton 전투력
                </div>
                <div style={{
                    fontSize: '2.5rem',
                    fontWeight: '900',
                    background: 'linear-gradient(135deg, #FACC15 0%, #FDE047 50%, #FACC15 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    letterSpacing: '-0.02em',
                    lineHeight: '1',
                    textShadow: '0 0 30px rgba(250, 204, 21, 0.5)',
                    filter: 'drop-shadow(0 0 10px rgba(250, 204, 21, 0.3))'
                }}>
                    {combatPower.toLocaleString()}
                </div>
                {/* Tier Badge with Image */}
                <div style={{
                    marginTop: '0.75rem',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <Image
                        src={tierInfo.image}
                        alt={tierInfo.tier}
                        width={32}
                        height={32}
                        style={{ objectFit: 'contain' }}
                    />
                    <div style={{
                        ...tierBadgeStyle,
                        boxShadow: `0 0 15px ${tierInfo.color}40`
                    }}>
                        {tierInfo.displayName}
                    </div>
                </div>
            </div>

            {/* Ranking Info */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
            }}>
                {/* Server Rank */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.6rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '6px',
                    border: '1px solid var(--border)'
                }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>서버 랭킹</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                        #{character.rank || 'N/A'}
                    </span>
                </div>

                {/* Percentile */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.6rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: '6px',
                    border: '1px solid var(--border)'
                }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>상위</span>
                    <span style={{
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        color: rankTier.isTop ? rankTier.color : 'var(--text-main)'
                    }}>
                        {character.percentile ? `${character.percentile.toFixed(1)}%` : 'N/A'}
                    </span>
                </div>

                {/* Rank Tier Badge */}
                {rankTier.name !== 'Bronze' && (
                    <div style={{
                        padding: '0.75rem',
                        background: rankTier.isTop ? `${rankTier.color}10` : 'var(--bg-secondary)',
                        border: `1px solid ${rankTier.isTop ? `${rankTier.color}40` : 'var(--border)'}`,
                        borderRadius: '6px',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            color: rankTier.isTop ? rankTier.color : 'var(--text-main)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em'
                        }}>
                            {rankTier.name}
                        </div>
                    </div>
                )}
            </div>

            {/* Server & Race Info */}
            <div style={{
                paddingTop: '0.6rem',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>서버</span>
                    <span style={{ color: 'var(--text-main)' }}>{character.server}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>종족</span>
                    <span style={{ color: 'var(--text-main)' }}>{character.race}</span>
                </div>
            </div>

            {/* Arcana Section */}
            {arcana && arcana.length > 0 && (
                <div style={{
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--border)',
                    marginTop: 'auto'
                }}>
                    <div style={{
                        fontSize: '0.7rem',
                        color: 'var(--text-secondary)',
                        marginBottom: '0.5rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        Arcana
                    </div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 1fr)',
                        gap: '0.4rem'
                    }}>
                        {arcana.slice(0, 5).map((item: any, index: number) => {
                            const gradeColors: Record<string, string> = {
                                'Common': '#9CA3AF',
                                'Rare': '#60A5FA',
                                'Legend': '#FBBF24',
                                'Unique': '#A78BFA',
                                'Epic': '#F472B6',
                                'Mythic': '#FACC15',
                            }
                            const gradeColor = gradeColors[item.grade] || '#9CA3AF'

                            return (
                                <div
                                    key={index}
                                    style={{
                                        position: 'relative',
                                        aspectRatio: '1',
                                        background: '#0B0D12',
                                        border: `1px solid ${gradeColor}40`,
                                        borderRadius: '6px',
                                        overflow: 'visible',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: onArcanaClick ? 'pointer' : 'default',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onClick={() => onArcanaClick?.(item)}
                                    onMouseEnter={(e) => {
                                        setHoveredArcana(item)
                                        if (onArcanaClick) {
                                            e.currentTarget.style.transform = 'scale(1.05)'
                                            e.currentTarget.style.borderColor = gradeColor
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        setHoveredArcana(null)
                                        if (onArcanaClick) {
                                            e.currentTarget.style.transform = 'scale(1)'
                                            e.currentTarget.style.borderColor = `${gradeColor}40`
                                        }
                                    }}
                                >
                                    {item.image && (
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover'
                                            }}
                                        />
                                    )}
                                    {item.enhancement && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '2px',
                                            right: '2px',
                                            fontSize: '0.6rem',
                                            fontWeight: 'bold',
                                            color: gradeColor,
                                            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                                            lineHeight: 1
                                        }}>
                                            {item.enhancement}
                                        </div>
                                    )}

                                    {/* Tooltip on hover */}
                                    {hoveredArcana === item && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: 'calc(100% + 8px)',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            width: '220px',
                                            background: 'rgba(15, 17, 23, 0.98)',
                                            border: `1px solid ${gradeColor}80`,
                                            borderRadius: '6px',
                                            padding: '8px',
                                            zIndex: 10000,
                                            boxShadow: '0 10px 25px rgba(0,0,0,0.8)',
                                            pointerEvents: 'none',
                                            textAlign: 'left'
                                        }}>
                                            {/* Arrow */}
                                            <div style={{
                                                position: 'absolute',
                                                top: '100%',
                                                left: '50%',
                                                transform: 'translateX(-50%) translateY(-1px)',
                                                width: 0,
                                                height: 0,
                                                borderLeft: '6px solid transparent',
                                                borderRight: '6px solid transparent',
                                                borderTop: `6px solid ${gradeColor}80`
                                            }}></div>

                                            {/* Header */}
                                            <div style={{ borderBottom: '1px solid #1F2433', paddingBottom: '6px', marginBottom: '6px' }}>
                                                <div style={{ color: gradeColor, fontSize: '0.85rem', fontWeight: 'bold', lineHeight: '1.2' }}>
                                                    {item.enhancement && <span style={{ marginRight: '4px' }}>{item.enhancement}</span>}
                                                    {item.name}
                                                </div>
                                                <div style={{ fontSize: '0.65rem', color: '#9CA3AF', marginTop: '2px' }}>
                                                    {item.category || item.slot}
                                                </div>
                                            </div>

                                            {/* Options */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {item.detail?.options && item.detail.options.map((opt: any, idx: number) => (
                                                    <div key={`opt-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#E5E7EB' }}>
                                                        <span style={{ color: '#9CA3AF' }}>{opt.name}</span>
                                                        <span>{opt.value}</span>
                                                    </div>
                                                ))}

                                                {item.detail?.randomOptions && item.detail.randomOptions.map((opt: any, idx: number) => (
                                                    <div key={`rnd-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#86EFAC' }}>
                                                        <span>{opt.name}</span>
                                                        <span>+{opt.value}</span>
                                                    </div>
                                                ))}

                                                {item.detail?.arcanas && item.detail.arcanas.length > 0 && (
                                                    <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px dashed #374151' }}>
                                                        <div style={{ fontSize: '0.65rem', color: '#F59E0B', fontWeight: 'bold', marginBottom: '3px' }}>
                                                            아르카나 효과
                                                        </div>
                                                        {item.detail.arcanas.map((arc: any, idx: number) => (
                                                            <div key={`arc-${idx}`} style={{ marginBottom: '4px' }}>
                                                                <div style={{ fontSize: '0.65rem', color: '#F59E0B', marginBottom: '1px' }}>
                                                                    {arc.name}
                                                                </div>
                                                                {arc.skill && (
                                                                    <div style={{ fontSize: '0.6rem', color: '#FCD34D', marginBottom: '1px' }}>
                                                                        {arc.skill}
                                                                    </div>
                                                                )}
                                                                {arc.skillDesc && (
                                                                    <div style={{ fontSize: '0.6rem', color: '#D4D4D8', whiteSpace: 'pre-wrap', lineHeight: '1.3' }}>
                                                                        {arc.skillDesc.substring(0, 100)}{arc.skillDesc.length > 100 ? '...' : ''}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Arcana Stats Total */}
                    {Object.keys(arcanaTotals).length > 0 && (
                        <div style={{
                            marginTop: '0.75rem',
                            padding: '0.6rem',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px'
                        }}>
                            <div style={{
                                fontSize: '0.65rem',
                                color: '#9CA3AF',
                                marginBottom: '0.5rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                아르카나 합계
                            </div>
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.3rem'
                            }}>
                                {Object.entries(arcanaTotals).map(([statName, value], idx) => (
                                    <div key={idx} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontSize: '0.7rem'
                                    }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>{statName}</span>
                                        <span style={{ color: '#F59E0B', fontWeight: 'bold' }}>+{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
