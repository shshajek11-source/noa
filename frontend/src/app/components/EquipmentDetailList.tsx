'use client'

interface EquipmentDetailListProps {
    equipment: any[]
    accessories: any[]
    onItemClick?: (item: any) => void
}

export default function EquipmentDetailList({ equipment, accessories, onItemClick }: EquipmentDetailListProps) {
    if (!equipment?.length && !accessories?.length) return null

    // Reuse tier color logic
    const getTierColor = (tier: number): string => {
        if (tier >= 5) return '#FACC15'
        if (tier >= 4) return '#FBBF24'
        return '#9CA3AF'
    }

    const DetailItem = ({ item }: { item: any }) => {
        const tierColor = getTierColor(item.tier)
        const isHighTier = item.tier >= 4

        return (
            <div
                onClick={() => onItemClick?.(item)}
                style={{
                    display: 'flex',
                    cursor: 'pointer',
                    gap: '1rem',
                    background: '#111318',
                    border: '1px solid #1F2433',
                    borderRadius: '8px',
                    padding: '1rem',
                    alignItems: 'center'
                }}>
                {/* Icon */}
                <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '8px',
                    border: `1px solid ${isHighTier ? tierColor + '60' : '#1F2433'}`,
                    background: '#0B0D12',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    overflow: 'hidden',
                    position: 'relative'
                }}>
                    {item.image ? (
                        <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <span style={{ fontSize: '0.7rem', color: '#4B5563' }}>No IMG</span>
                    )}
                    {item.enhancement && (
                        <div style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            background: 'rgba(0,0,0,0.8)',
                            color: '#FACC15',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            padding: '1px 3px',
                            borderTopLeftRadius: '4px'
                        }}>{item.enhancement}</div>
                    )}
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>{item.category || item.slot}</span>
                        <span style={{ fontSize: '0.75rem', color: tierColor, border: `1px solid ${tierColor}40`, padding: '0 4px', borderRadius: '4px' }}>T{item.tier}</span>
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#E5E7EB', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.name}
                    </div>

                    {/* Stats Row */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.8rem' }}>
                        {/* Soul Engraving */}
                        {item.soulEngraving && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#1F2937', padding: '2px 6px', borderRadius: '4px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.soulEngraving.grade === 'S' ? '#FACC15' : '#9CA3AF' }}></span>
                                <span style={{ color: '#D1D5DB' }}>각인 {item.soulEngraving.grade}</span>
                                <span style={{ color: '#9CA3AF' }}>({item.soulEngraving.percentage}%)</span>
                            </div>
                        )}

                        {/* Manastones */}
                        {item.manastones && item.manastones.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {item.manastones.map((stone: any, idx: number) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#1F2937', padding: '2px 6px', borderRadius: '4px' }}>
                                        <div style={{
                                            width: '6px', height: '6px', borderRadius: '50%',
                                            background: stone.type.includes('공격') ? '#EF4444' : stone.type.includes('치명') ? '#F59E0B' : '#3B82F6'
                                        }}></div>
                                        <span style={{ color: '#D1D5DB' }}>{stone.type}</span>
                                        <span style={{ color: '#9CA3AF' }}>+{stone.value}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div style={{ width: '100%', marginTop: '3rem', borderTop: '1px solid #1F2433', paddingTop: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#E5E7EB', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '4px', height: '20px', background: '#FACC15' }}></span>
                장비 상세 정보
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* Equipment Section */}
                {equipment.length > 0 && (
                    <section>
                        <h3 style={{ fontSize: '1rem', color: '#9CA3AF', marginBottom: '1rem' }}>무기 / 방어구</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1rem' }}>
                            {equipment.map((item, index) => (
                                <DetailItem key={`eq-${index}`} item={item} />
                            ))}
                        </div>
                    </section>
                )}

                {/* Accessories Section */}
                {accessories.length > 0 && (
                    <section>
                        <h3 style={{ fontSize: '1rem', color: '#9CA3AF', marginBottom: '1rem' }}>장신구</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1rem' }}>
                            {accessories.map((item, index) => (
                                <DetailItem key={`ac-${index}`} item={item} />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    )
}
