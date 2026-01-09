'use client'

import { ItemSearchResult, GRADE_COLORS } from '@/types/item'
import styles from './ItemSearch.module.css'

interface ItemCardProps {
    item: ItemSearchResult
    onClick?: (item: ItemSearchResult) => void
}

export default function ItemCard({ item, onClick }: ItemCardProps) {
    const gradeColor = GRADE_COLORS[item.grade] || GRADE_COLORS['Common']

    return (
        <div
            className={styles.itemCard}
            onClick={() => onClick?.(item)}
            style={{ cursor: onClick ? 'pointer' : 'default' }}
        >
            {/* 아이콘 */}
            <div
                className={styles.itemIconWrapper}
                style={{ borderColor: gradeColor }}
            >
                {item.icon ? (
                    <img
                        src={`/api/image-proxy?url=${encodeURIComponent(item.icon)}`}
                        alt={item.name}
                        className={styles.itemIcon}
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                        }}
                    />
                ) : (
                    <div className={styles.itemNoIcon}>?</div>
                )}
            </div>

            {/* 정보 */}
            <div className={styles.itemDetails}>
                <div
                    className={styles.itemName}
                    style={{ color: gradeColor }}
                    title={item.name}
                >
                    {item.name}
                </div>
                <div className={styles.itemMeta}>
                    {item.slotName && (
                        <span className={styles.itemSlot}>{item.slotName}</span>
                    )}
                    {item.categoryName && (
                        <span>{item.categoryName}</span>
                    )}
                    {item.itemLevel > 0 && (
                        <span className={styles.itemLevel}>Lv.{item.itemLevel}</span>
                    )}
                </div>
            </div>
        </div>
    )
}
