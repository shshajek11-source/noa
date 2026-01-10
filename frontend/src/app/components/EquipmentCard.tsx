import { useState } from 'react'
import EquipmentTooltip from './EquipmentTooltip'
import styles from './ProfileSection.module.css'

interface EquipmentCardProps {
    slot: string
    item?: {
        name: string
        enhancement: string  // "+15"
        tier: number
        itemLevel?: number  // 아이템 레벨
        grade?: string  // "Legendary", "Mythic", etc.
        image?: string
        category?: string
        breakthrough?: number  // 돌파 횟수
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

// Item name color based on grade (공식 사이트 색상)
const getItemNameColor = (grade: string): string => {
    const gradeColors: Record<string, string> = {
        'Mythic': '#09CE9F',      // 청록색 (격돌의 룬)
        'Legendary': '#FB9800',   // 주황색 (명룡왕의 활)
        'Unique': '#FFB84D',      // 옅은 주황색 (해방자의 팔찌 등)
        'Epic': '#7E3DCF',        // 보라색 
        'Fabled': '#EE6C2A',      // 진한 주황색 (고대 정령 시리즈)
        'Rare': '#FFFFFF',        // 흰색
        'Common': '#9CA3AF'       // 회색
    }
    return gradeColors[grade] || '#FFFFFF'
}

export default function EquipmentCard({ slot, item, onClick }: EquipmentCardProps) {
    const [isHovered, setIsHovered] = useState(false)
    const isEmpty = !item

    // Default colors for empty state
    const displayTierColor = isEmpty ? '#1F2433' : getTierColor(item.tier)
    const displayEnhancementColor = isEmpty ? '#E5E7EB' : getEnhancementColor(item.enhancement)
    const isDisplayHighTier = !isEmpty && item.tier >= 4

    return (
        <div
            className={styles.equipmentCard}
            style={{
                cursor: isEmpty ? 'default' : 'pointer',
                borderColor: isHovered && !isEmpty ? 'rgba(255, 255, 255, 0.3)' : undefined,
                overflow: 'visible' // Allow Tooltip to overflow
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => !isEmpty && item && onClick?.(item)}
        >
            {/* Tooltip */}
            {!isEmpty && isHovered && item && <EquipmentTooltip item={item} />}

            {/* Breakthrough Badge */}
            <div className={styles.breakthroughWrapper}
                style={{ visibility: !isEmpty && item.breakthrough != null && item.breakthrough > 0 ? 'visible' : 'hidden' }}>
                {!isEmpty && item.breakthrough != null && item.breakthrough > 0 && (
                    <div className={styles.breakthroughBadge}>
                        <span className={styles.breakthroughText}>
                            {item.breakthrough}
                        </span>
                    </div>
                )}
            </div>

            {/* Item Image */}
            <div className={styles.equipmentIconWrapper}
                style={{
                    borderColor: isDisplayHighTier ? displayTierColor + '60' : undefined
                }}>
                {!isEmpty && item.image ? (
                    <img src={item.image} alt={item.name} className={styles.itemImage} />
                ) : (
                    <div style={{ fontSize: '0.45rem', color: '#374151', textAlign: 'center', width: '100%', lineHeight: '28px' }}>Empty</div>
                )}

                {/* Enhancement Badge (Overlay on Image) */}
                {!isEmpty && item.enhancement && (
                    <div className={styles.enhancementBadge} style={{ color: displayEnhancementColor }}>
                        {item.enhancement}
                    </div>
                )}
            </div>

            {/* Info Column */}
            <div className={styles.equipmentInfo}>
                {/* Slot Name */}
                <div className={styles.slotName}>{slot}</div>

                {/* Item Name */}
                <div className={styles.itemName} style={{ color: !isEmpty ? getItemNameColor(item.grade || '') : '#4B5563' }}>
                    {!isEmpty ? item.name : '장착 없음'}
                </div>

            </div>
        </div>
    )
}
