'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ItemTierList from '../../components/item/ItemTierList'
import SlotSelector from '../../components/item/SlotSelector'
import ItemDetailModal from '../../components/item/ItemDetailModal'
import { CLASSES } from '../../constants/game-data'
import { ItemUsageStat } from '@/types/item'
import styles from '../../components/item/ItemTier.module.css'

function ItemTierContent() {
    const searchParams = useSearchParams()
    const router = useRouter()

    const [selectedSlot, setSelectedSlot] = useState<number>(
        parseInt(searchParams.get('slot') || '1')
    )
    const [selectedClass, setSelectedClass] = useState<string>(
        searchParams.get('class') || ''
    )
    const [selectedItem, setSelectedItem] = useState<ItemUsageStat | null>(null)

    const handleSlotChange = (slot: number) => {
        setSelectedSlot(slot)
        updateURL(slot, selectedClass)
    }

    const handleClassChange = (cls: string) => {
        setSelectedClass(cls)
        updateURL(selectedSlot, cls)
    }

    const updateURL = (slot: number, cls: string) => {
        const params = new URLSearchParams()
        params.set('slot', slot.toString())
        if (cls) params.set('class', cls)
        router.push(`?${params.toString()}`, { scroll: false })
    }

    return (
        <div>
            {/* 슬롯 선택 */}
            <SlotSelector
                selectedSlot={selectedSlot}
                onSlotChange={handleSlotChange}
            />

            {/* 직업 필터 */}
            <div className={styles.classFilter}>
                <select
                    value={selectedClass}
                    onChange={(e) => handleClassChange(e.target.value)}
                    className={styles.classSelect}
                >
                    <option value="">전체 직업</option>
                    {CLASSES.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                </select>
            </div>

            {/* 티어 리스트 */}
            <ItemTierList
                slotPos={selectedSlot}
                className={selectedClass || undefined}
                onItemClick={setSelectedItem}
            />

            {/* 아이템 상세 모달 */}
            {selectedItem && (
                <ItemDetailModal
                    item={selectedItem}
                    onClose={() => setSelectedItem(null)}
                />
            )}
        </div>
    )
}

export default function ItemTierPage() {
    return (
        <Suspense fallback={<div className={styles.loading}>로딩 중...</div>}>
            <ItemTierContent />
        </Suspense>
    )
}
