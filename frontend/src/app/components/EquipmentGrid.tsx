'use client'
import EquipmentCard from './EquipmentCard'

interface EquipmentGridProps {
    equipment?: any[]
    accessories?: any[]
}

export default function EquipmentGrid({ equipment = [], accessories = [] }: EquipmentGridProps) {
    // Equipment slots
    const weaponSlots = [
        '주무기',
        '보조무기',
        '투구',
        '견갑',
        '흉갑',
        '허리띠',
        '각반',
        '장갑',
        '망토',
        '장화'
    ]

    // Accessory slots
    const accessorySlots = [
        '귀걸이1',
        '귀걸이2',
        '목걸이',
        '아뮬렛',
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
            gap: '2rem'
        }}>
            {/* Weapons & Armor */}
            <div>
                <h3 style={{
                    color: '#E5E7EB',
                    fontSize: '1.25rem',
                    marginBottom: '1rem',
                    fontWeight: 'bold'
                }}>
                    무기 / 방어구
                </h3>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '0.75rem'
                }}>
                    {weaponSlots.map(slot => {
                        const item = equipment?.find(e => e.slot === slot)
                        return <EquipmentCard key={slot} slot={slot} item={item} />
                    })}
                </div>
            </div>

            {/* Accessories */}
            <div>
                <h3 style={{
                    color: '#E5E7EB',
                    fontSize: '1.25rem',
                    marginBottom: '1rem',
                    fontWeight: 'bold'
                }}>
                    장신구 / 룬
                </h3>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '0.75rem'
                }}>
                    {accessorySlots.map(slot => {
                        const item = accessories?.find(a => a.slot === slot)
                        return <EquipmentCard key={slot} slot={slot} item={item} />
                    })}
                </div>
            </div>
        </div>
    )
}
