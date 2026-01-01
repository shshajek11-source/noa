'use client'

interface EquipmentCardProps {
    slot: string
    item?: {
        name: string
        enhancement: string  // "+15"
        tier: number  // 5
        soulEngraving?: {
            grade: string  // "S", "A", "B"
            percentage: number  // 98.5
        }
        manastones?: Array<{
            type: string
            value: number
        }>
    }
}

const getTierColor = (tier: number): string => {
    const colors: Record<number, string> = {
        5: '#FACC15',
        4: '#FBBF24',
        3: '#94A3B8',
        2: '#9CA3AF',
        1: '#6B7280'
    }
    return colors[tier] || '#6B7280'
}

const getEnhancementColor = (enhancement: string): string => {
    const level = parseInt(enhancement.replace('+', ''))
    if (level >= 15) return '#FACC15'
    if (level >= 10) return '#FBBF24'
    if (level >= 5) return '#94A3B8'
    return '#9CA3AF'
}

export default function EquipmentCard({ slot, item }: EquipmentCardProps) {
    if (!item) {
        return (
            <div style={{
                padding: '1rem',
                background: '#1A1D29',
                border: '1px solid #2D3748',
                borderRadius: '8px',
                textAlign: 'center',
                color: '#6B7280'
            }}>
                <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>{slot}</div>
                <div style={{ fontSize: '0.75rem' }}>장착 없음</div>
            </div>
        )
    }

    const tierColor = getTierColor(item.tier)
    const enhancementColor = getEnhancementColor(item.enhancement)

    return (
        <div style={{
            padding: '1rem',
            background: '#1A1D29',
            border: `2px solid ${tierColor}40`,
            borderRadius: '8px',
            position: 'relative',
            transition: 'all 0.2s',
            cursor: 'pointer'
        }}
            className="equipment-card-hover"
        >
            {/* Slot Label */}
            <div style={{
                fontSize: '0.75rem',
                color: '#9CA3AF',
                marginBottom: '0.5rem'
            }}>
                {slot}
            </div>

            {/* Enhancement Badge */}
            <div style={{
                position: 'absolute',
                top: '0.5rem',
                right: '0.5rem',
                padding: '0.25rem 0.5rem',
                background: enhancementColor,
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                color: '#0B0D12'
            }}>
                {item.enhancement}
            </div>

            {/* Item Name */}
            <div style={{
                fontSize: '0.875rem',
                color: '#E5E7EB',
                fontWeight: '500',
                marginBottom: '0.5rem',
                lineHeight: '1.2'
            }}>
                {item.name}
            </div>

            {/* Tier Badge */}
            <div style={{
                display: 'inline-block',
                padding: '0.25rem 0.5rem',
                background: `${tierColor}20`,
                border: `1px solid ${tierColor}`,
                borderRadius: '4px',
                fontSize: '0.75rem',
                color: tierColor,
                marginBottom: '0.5rem'
            }}>
                Tier {item.tier}
            </div>

            {/* Soul Engraving */}
            {item.soulEngraving && (
                <div style={{
                    marginTop: '0.5rem',
                    padding: '0.5rem',
                    background: '#0B0D1220',
                    borderRadius: '4px',
                    borderLeft: `3px solid ${item.soulEngraving.grade === 'S' ? '#FACC15' : item.soulEngraving.grade === 'A' ? '#FBBF24' : '#94A3B8'}`
                }}>
                    <div style={{
                        fontSize: '0.75rem',
                        color: '#9CA3AF',
                        marginBottom: '0.25rem'
                    }}>
                        소울 각인
                    </div>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span style={{
                            fontSize: '0.875rem',
                            fontWeight: 'bold',
                            color: item.soulEngraving.grade === 'S' ? '#FACC15' : item.soulEngraving.grade === 'A' ? '#FBBF24' : '#94A3B8'
                        }}>
                            {item.soulEngraving.grade} 등급
                        </span>
                        <span style={{
                            fontSize: '0.75rem',
                            color: '#E5E7EB'
                        }}>
                            {item.soulEngraving.percentage}%
                        </span>
                    </div>
                </div>
            )}

            {/* Manastones */}
            {item.manastones && item.manastones.length > 0 && (
                <div style={{
                    marginTop: '0.5rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.25rem'
                }}>
                    {item.manastones.map((stone, idx) => (
                        <div
                            key={idx}
                            style={{
                                padding: '0.25rem 0.5rem',
                                background: '#2D374840',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                color: '#9CA3AF'
                            }}
                        >
                            {stone.type} +{stone.value}
                        </div>
                    ))}
                </div>
            )}

            <style jsx>{`
        .equipment-card-hover:hover {
          border-color: ${tierColor};
          box-shadow: 0 0 20px ${tierColor}40;
          transform: translateY(-2px);
        }
      `}</style>
        </div>
    )
}
