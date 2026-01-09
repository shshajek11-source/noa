'use client'

import { ItemUsageStat, GRADE_COLORS, ItemTier } from '@/types/item'
import styles from './ItemTier.module.css'

interface ItemTierCardProps {
    item: ItemUsageStat
    tier: ItemTier
    onClick?: (item: ItemUsageStat) => void
}

export default function ItemTierCard({ item, tier, onClick }: ItemTierCardProps) {
    const gradeColor = GRADE_COLORS[item.grade] || GRADE_COLORS['Common']

    return (
        <div
            onClick={() => onClick?.(item)}
            className={styles.tierCard}
            style={{ cursor: onClick ? 'pointer' : 'default' }}
        >
            {/* 아이콘 */}
            <div
                className={styles.iconWrapper}
                style={{ borderColor: gradeColor }}
            >
                {item.icon ? (
                    <img
                        src={`/api/image-proxy?url=${encodeURIComponent(item.icon)}`}
                        alt={item.itemName}
                        className={styles.icon}
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                        }}
                    />
                ) : (
                    <div className={styles.noIcon}>?</div>
                )}
            </div>

            {/* 정보 */}
            <div className={styles.itemInfo}>
                <div
                    className={styles.itemName}
                    style={{ color: gradeColor }}
                    title={item.itemName}
                >
                    {item.itemName}
                </div>
                <div className={styles.itemStats}>
                    <span>
                        사용률 <strong className={styles.highlight}>{item.usagePercent}%</strong>
                    </span>
                    <span>평균 +{item.avgEnhanceLevel?.toFixed(1) || '0'}</span>
                    {item.avgBreakthrough > 0 && (
                        <span className={styles.breakthrough}>
                            돌파 {item.avgBreakthrough?.toFixed(1)}
                        </span>
                    )}
                </div>
            </div>

            {/* 사용 수 */}
            <div className={styles.usageCount}>
                <div className={styles.countNumber}>
                    {item.usageCount.toLocaleString()}
                </div>
                <div className={styles.countLabel}>명 사용</div>
            </div>
        </div>
    )
}
