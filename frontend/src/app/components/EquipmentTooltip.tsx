'use client'

interface EquipmentTooltipProps {
    item: any
}

export default function EquipmentTooltip({ item }: EquipmentTooltipProps) {
    if (!item) return null

    // Reusing tier color logic (could be shared utility)
    const getTierColor = (tier: number): string => {
        if (tier >= 5) return '#FACC15'
        if (tier >= 4) return '#FBBF24'
        return '#9CA3AF'
    }

    const tierColor = getTierColor(item.tier)

    return (
        <div style={{
            position: 'absolute',
            bottom: 'calc(100% + 10px)', // Above the card
            left: '50%',
            transform: 'translateX(-50%)',
            width: '260px',
            background: 'rgba(15, 17, 23, 0.98)',
            border: `1px solid ${tierColor}80`,
            borderRadius: '8px',
            padding: '12px',
            zIndex: 9999,
            boxShadow: '0 10px 25px rgba(0,0,0,0.8)',
            pointerEvents: 'none', // Prevent tooltip from capturing mouse events
            textAlign: 'left'
        }}>
            {/* Arrow */}
            <div style={{
                position: 'absolute',
                bottom: '-6px',
                left: '50%',
                transform: 'translateX(-50%) rotate(45deg)',
                width: '10px',
                height: '10px',
                background: 'rgba(15, 17, 23, 0.98)',
                borderRight: `1px solid ${tierColor}80`,
                borderBottom: `1px solid ${tierColor}80`,
            }}></div>

            {/* Header: Name & Enhance */}
            <div style={{ borderBottom: '1px solid #1F2433', paddingBottom: '8px', marginBottom: '8px' }}>
                <div style={{ color: tierColor, fontSize: '0.95rem', fontWeight: 'bold', lineHeight: '1.4' }}>
                    {item.enhancement && <span style={{ color: '#FACC15', marginRight: '6px' }}>{item.enhancement}</span>}
                    {item.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '4px' }}>
                    {item.category || item.slot}
                </div>
            </div>

            {/* Content stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {/* Soul Engraving */}
                {item.soulEngraving && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <span style={{ color: '#9CA3AF' }}>영혼 각인</span>
                        <span style={{ color: '#E5E7EB' }}>
                            <span style={{ color: item.soulEngraving.grade === 'S' ? '#FACC15' : '#E5E7EB' }}>{item.soulEngraving.grade}등급</span>
                            {' '}({item.soulEngraving.percentage}%)
                        </span>
                    </div>
                )}

                {/* Manastones */}
                {item.manastones && item.manastones.length > 0 && (
                    <div style={{ marginTop: '4px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '4px' }}>마석 정보</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {item.manastones.map((stone: any, idx: number) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                                    <div style={{
                                        width: '6px', height: '6px', borderRadius: '50%',
                                        background: stone.type.includes('공격') ? '#EF4444' : stone.type.includes('치명') ? '#F59E0B' : '#3B82F6'
                                    }}></div>
                                    <span style={{ color: '#D1D5DB' }}>{stone.type}</span>
                                    <span style={{ color: '#9CA3AF' }}>+{stone.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
