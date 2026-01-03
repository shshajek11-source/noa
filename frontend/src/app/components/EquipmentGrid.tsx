'use client'
import EquipmentCard from './EquipmentCard'

interface EquipmentGridProps {
    equipment?: any[]
    accessories?: any[]
    onItemClick?: (item: any) => void
}

export default function EquipmentGrid({ equipment = [], accessories = [], onItemClick }: EquipmentGridProps) {
    // Equipment slots
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
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            height: '100%'
        }}>
            {/* Weapons & Armor */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{
                    color: '#E5E7EB',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    margin: 0,
                    marginBottom: '0.5rem'
                }}>
                    무기 / 방어구
                </h3>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '0.5rem',
                    flex: 1
                }}>
                    {weaponSlots.map(slot => {
                        const item = equipment?.find(e => e.slot === slot)
                        return <EquipmentCard key={slot} slot={slot} item={item} onClick={onItemClick} />
                    })}
                </div>
            </div>

            {/* Accessories */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{
                    color: '#E5E7EB',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    margin: 0,
                    marginBottom: '0.5rem'
                }}>
                    장신구 / 룬
                </h3>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '0.5rem',
                    flex: 1
                }}>
                    {accessorySlots.map(slot => {
                        const item = accessories?.find(a => a.slot === slot)
                        return <EquipmentCard key={slot} slot={slot} item={item} onClick={onItemClick} />
                    })}
                </div>
            </div>
        </div >
    )
}
