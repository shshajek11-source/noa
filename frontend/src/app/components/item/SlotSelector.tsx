'use client'

import { SLOT_POS_MAP, SLOT_GROUPS } from '@/types/item'
import styles from './ItemTier.module.css'

interface SlotSelectorProps {
    selectedSlot: number
    onSlotChange: (slot: number) => void
}

export default function SlotSelector({ selectedSlot, onSlotChange }: SlotSelectorProps) {
    return (
        <div className={styles.slotSelectorContainer}>
            {SLOT_GROUPS.map(group => (
                <div key={group.name} className={styles.slotGroup}>
                    <div className={styles.slotGroupLabel}>
                        {group.name}
                    </div>
                    <div className={styles.slotButtons}>
                        {group.slots.map(slot => (
                            <button
                                key={slot}
                                onClick={() => onSlotChange(slot)}
                                className={`${styles.slotButton} ${selectedSlot === slot ? styles.slotButtonActive : ''}`}
                            >
                                {SLOT_POS_MAP[slot]}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}
