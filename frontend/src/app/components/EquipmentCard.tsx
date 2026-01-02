import { useState } from 'react'
import EquipmentTooltip from './EquipmentTooltip'

interface EquipmentCardProps {
    slot: string
    item?: {
        name: string
        enhancement: string  // "+15"
        tier: number
        image?: string
        category?: string
        soulEngraving?: {
            grade: string  // "S", "A", "B"
            percentage: number  // 98.5
        }
        manastones?: Array<{
            type: string
            value: number
        }>
        raw?: any // Full item data for tooltip
    }
    onClick?: (item: any) => void
}

// Tier color - only high tier (4+) uses accent yellow
const getTierColor = (tier: number): string => {
    if (tier >= 5) return '#FACC15'  // Accent yellow for top tier only
    if (tier >= 4) return '#FBBF24'  // Secondary accent for high tier
    return '#9CA3AF'  // Sub text color for normal tiers
}

// Enhancement color - only high enhancement (+10+) uses accent
const getEnhancementColor = (enhancement: string): string => {
    const level = parseInt(enhancement.replace('+', ''))
    if (level >= 15) return '#FACC15'  // Top enhancement
    if (level >= 10) return '#FBBF24'  // High enhancement
    return '#E5E7EB'  // Normal text
}

export default function EquipmentCard({ slot, item, onClick }: EquipmentCardProps) {
    const [isHovered, setIsHovered] = useState(false)

    if (!item) {
        return (
            <div style={{
                padding: '1rem',
                background: '#111318',
                border: '1px solid #1F2433',
                borderRadius: '8px',
                textAlign: 'center',
                color: '#9CA3AF'
            }}>
                <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>{slot}</div>
                <div style={{ fontSize: '0.75rem' }}>장착 없음</div>
            </div>
        )
    }

    const tierColor = getTierColor(item.tier)
    const enhancementColor = getEnhancementColor(item.enhancement)
    const isHighTier = item.tier >= 4

    return (
        <div style={{
            padding: '0.35rem',
            background: '#111318',
            border: '1px solid #1F2433',
            borderRadius: '6px',
            position: 'relative',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            gap: '0.35rem',
            alignItems: 'center',
            maxWidth: '100%',
            boxSizing: 'border-box',
            height: '100%'
        }}
            className="equipment-card-hover"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => item && onClick?.(item)}
        >
            {/* Tooltip */}
            {isHovered && <EquipmentTooltip item={item} />}

            {/* Item Image */}
            <div style={{
                width: '32px',
                height: '32px',
                background: '#0B0D12',
                borderRadius: '4px',
                border: `1px solid ${isHighTier ? tierColor + '60' : '#1F2433'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
                position: 'relative'
            }}>
                {item.image ? (
                    <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <div style={{ fontSize: '0.5rem', color: '#9CA3AF', textAlign: 'center' }}>No</div>
                )}

                {/* Enhancement Badge (Overlay on Image) */}
                {item.enhancement && (
                    <div style={{
                        position: 'absolute',
                        bottom: '0',
                        right: '0',
                        background: 'rgba(11,13,18,0.95)',
                        color: enhancementColor,
                        fontSize: '0.6rem',
                        fontWeight: 'bold',
                        padding: '0 2px',
                        borderTopLeftRadius: '2px',
                        lineHeight: '1'
                    }}>
                        {item.enhancement}
                    </div>
                )}
            </div>

            {/* Info Column - 이름 제거됨 */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {/* Slot & Tier Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.65rem', color: '#9CA3AF' }}>{slot}</span>
                    <span style={{
                        fontSize: '0.6rem',
                        color: tierColor,
                        border: `1px solid ${isHighTier ? tierColor + '40' : '#1F2433'}`,
                        padding: '0 3px',
                        borderRadius: '2px',
                        lineHeight: '1.2'
                    }}>
                        T{item.tier}
                    </span>
                </div>

                {/* Manastones (very compact) */}
                {item.manastones && item.manastones.length > 0 && (
                    <div style={{
                        marginTop: '2px',
                        display: 'flex',
                        gap: '2px',
                        alignItems: 'center'
                    }}>
                        {item.manastones.slice(0, 4).map((stone, idx) => (
                            <div key={idx}
                                title={`${stone.type} +${stone.value}`}
                                style={{
                                    width: '5px',
                                    height: '5px',
                                    borderRadius: '50%',
                                    background: stone.type.includes('공격') ? '#EF4444' : stone.type.includes('치명') ? '#F59E0B' : '#3B82F6',
                                }} />
                        ))}
                        {item.manastones.length > 4 && (
                            <span style={{ fontSize: '0.55rem', color: '#9CA3AF' }}>+{item.manastones.length - 4}</span>
                        )}
                    </div>
                )}
            </div>

            <style jsx>{`
        .equipment-card-hover:hover {
          border-color: #FACC15;
          transform: translateY(-1px);
        }
      `}</style>
        </div>
    )
}

