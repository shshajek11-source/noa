'use client'

import { useState, useEffect } from 'react'
import {
    ItemUsageStat,
    SLOT_POS_MAP,
    TIER_COLORS,
    TIER_LABELS,
    getTierByPercent,
    ItemTier
} from '@/types/item'
import ItemTierCard from './ItemTierCard'
import styles from './ItemTier.module.css'

interface ItemTierListProps {
    slotPos: number
    className?: string
    onItemClick?: (item: ItemUsageStat) => void
}

export default function ItemTierList({ slotPos, className, onItemClick }: ItemTierListProps) {
    const [items, setItems] = useState<ItemUsageStat[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true)
            setError(null)

            try {
                const params = new URLSearchParams()
                params.set('slot', slotPos.toString())
                if (className) params.set('class', className)
                params.set('limit', '30')

                const res = await fetch(`/api/item-stats?${params.toString()}`)

                if (!res.ok) {
                    throw new Error('데이터를 불러오는데 실패했습니다')
                }

                const json = await res.json()
                setItems(json.data || [])
            } catch (err: any) {
                console.error('Failed to fetch item stats', err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchStats()
    }, [slotPos, className])

    // 티어별로 그룹화
    const groupedByTier = items.reduce((acc, item) => {
        const tier = getTierByPercent(item.usagePercent)
        if (!acc[tier]) acc[tier] = []
        acc[tier].push(item)
        return acc
    }, {} as Record<ItemTier, ItemUsageStat[]>)

    if (loading) {
        return (
            <div className={styles.loading}>
                데이터를 불러오는 중...
            </div>
        )
    }

    if (error) {
        return (
            <div className={styles.empty}>
                {error}
            </div>
        )
    }

    if (items.length === 0) {
        return (
            <div className={styles.empty}>
                해당 슬롯의 아이템 데이터가 없습니다.
                <br />
                <small>캐릭터 데이터가 수집되면 통계가 표시됩니다.</small>
            </div>
        )
    }

    return (
        <div>
            <h3 className={styles.slotTitle}>
                <span className={styles.slotBadge}>
                    {SLOT_POS_MAP[slotPos]}
                </span>
                인기 아이템 티어
            </h3>

            {(['S', 'A', 'B', 'C', 'D'] as ItemTier[]).map(tier => {
                const tierItems = groupedByTier[tier] || []
                if (tierItems.length === 0) return null

                return (
                    <div key={tier} className={styles.tierListContainer}>
                        <div className={styles.tierHeader}>
                            <span
                                className={styles.tierBadge}
                                style={{
                                    background: TIER_COLORS[tier],
                                    color: tier === 'D' ? '#111' : '#FFF'
                                }}
                            >
                                {tier} Tier
                            </span>
                            <span className={styles.tierLabel}>
                                {TIER_LABELS[tier]}
                            </span>
                        </div>

                        <div className={styles.tierGrid}>
                            {tierItems.map(item => (
                                <ItemTierCard
                                    key={`${item.itemId}_${item.slotPos}`}
                                    item={item}
                                    tier={tier}
                                    onClick={onItemClick}
                                />
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
