'use client'
import { useMemo } from 'react'
import EquipmentCard from './EquipmentCard'
import styles from './ProfileSection.module.css'

interface EquipmentGridProps {
    equipment: any[]
    accessories: any[]
    pets?: any[]
    wings?: any[]
    appearance?: any[]
    debugInfo?: any
    onItemClick?: (item: any) => void
}

// 정렬 순서 상수 (컴포넌트 외부에 정의하여 매번 재생성 방지)
const APPEARANCE_ORDER: Record<string, number> = {
    '투구': 1, '머리': 1, '두건': 1, '모자': 1, '머리장식': 1, '가발': 1,
    '흉갑': 2, '상의': 2, '의상': 2, '옷': 2, '전신': 2,
    '견갑': 3, '어깨': 3,
    '장갑': 4, '손': 4,
    '각반': 5, '하의': 5,
    '장화': 6, '신발': 6, '발': 6,
    '주무기': 7, '무기': 7,
    '보조무기': 8, '방패': 8,
    '날개': 9,
    '모션': 10
}

export default function EquipmentGrid({ equipment = [], accessories = [], pets = [], wings = [], appearance = [], debugInfo, onItemClick }: EquipmentGridProps) {
    // useMemo로 정렬된 외형 아이템 캐싱 - appearance가 변경될 때만 재정렬
    const sortedAppearance = useMemo(() => {
        return [...appearance].sort((a, b) => {
            const slotA = a.slot || a.categoryName || ''
            const slotB = b.slot || b.categoryName || ''
            const scoreA = APPEARANCE_ORDER[slotA] || 99
            const scoreB = APPEARANCE_ORDER[slotB] || 99
            return scoreA - scoreB
        })
    }, [appearance])

    // Equipment slots - Ordered by User Request (Top-Left to Bottom-Right)
    const weaponSlots = [
        '주무기',   // 1
        '보조무기', // 2
        '투구',     // 3
        '견갑',     // 4
        '흉갑',     // 5
        '장갑',     // 6
        '각반',     // 7
        '장화',     // 8
        '망토',     // 9 (SlotPos 19)
        '허리띠'    // 10 (SlotPos 17)
    ]

    // Accessory slots - Ordered by User Request
    const accessorySlots = [
        '귀걸이1',
        '귀걸이2',
        '아뮬렛',   // 3 (SlotPos 22) - Moved before Necklace
        '목걸이',   // 4 (SlotPos 9)
        '반지1',
        '반지2',
        '팔찌1',
        '팔찌2',
        '룬1',
        '룬2'
    ]

    return (
        <div className={styles.container}>
            {/* Weapons & Armor */}
            <div>
                <h3 className={styles.sectionTitle}>
                    무기 / 방어구
                </h3>
                <div className={styles.equipmentRows}>
                    {weaponSlots.map(slot => {
                        const item = equipment?.find(e => e.slot === slot)
                        return <EquipmentCard key={slot} slot={slot} item={item} onClick={onItemClick} />
                    })}
                </div>
            </div>

            {/* Accessories */}
            <div style={{ marginTop: '0.5rem' }}>
                <h3 className={styles.sectionTitle}>
                    장신구 / 룬
                </h3>
                <div className={styles.equipmentRows}>
                    {accessorySlots.map(slot => {
                        const item = accessories?.find(a => a.slot === slot)
                        return <EquipmentCard key={slot} slot={slot} item={item} onClick={onItemClick} />
                    })}
                </div>
            </div>

            {/* Pets & Wings */}
            {(pets.length > 0 || wings.length > 0) && (
                <div style={{ marginTop: '0.5rem' }}>
                    <h3 className={styles.sectionTitle}>
                        펫 / 날개
                    </h3>
                    <div className={styles.equipmentRows}>
                        {pets.map((pet, idx) => (
                            <EquipmentCard key={`pet-${idx}`} slot="펫" item={pet} onClick={onItemClick} />
                        ))}
                        {wings.map((wing, idx) => (
                            <EquipmentCard key={`wing-${idx}`} slot="날개" item={wing} onClick={onItemClick} />
                        ))}
                    </div>
                </div>
            )}

            {/* Appearance */}
            {sortedAppearance.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                    <h3 className={styles.sectionTitle}>
                        외형 / 모션
                    </h3>
                    <div className={styles.equipmentRows}>
                        {sortedAppearance.map((item, idx) => (
                            <EquipmentCard key={`appearance-${idx}`} slot={item.slot || "외형"} item={item} onClick={onItemClick} />
                        ))}
                    </div>
                </div>
            )}
        </div >
    )
}
