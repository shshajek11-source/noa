'use client'

import { useEffect } from 'react'

interface EquipmentTooltipProps {
    item: any
}

export default function EquipmentTooltip({ item }: EquipmentTooltipProps) {
    // 디버그 패널에 정보 전송
    useEffect(() => {
        if (item && typeof window !== 'undefined' && (window as any).setDebugInfo) {
            const detail = item.detail || item.raw?.detail
            const rDetail = detail?._raw || detail

                ; (window as any).setDebugInfo({
                    '아이템': item.name,
                    'slot': item.slot,
                    'slotPos': item.raw?.slotPos,
                    'breakthrough': item.breakthrough,
                    'enhancement': item.enhancement,
                    'subStats': rDetail?.subStats || '없음',
                    'mainStats': rDetail?.mainStats?.map((s: any) => `${s.name}: ${s.value}`) || '없음',
                })
        }
    }, [item])

    if (!item) return null

    // Reusing tier color logic (could be shared utility)
    const getTierColor = (tier: number): string => {
        if (tier >= 5) return '#FACC15'
        if (tier >= 4) return '#FBBF24'
        return '#9CA3AF'
    }

    const tierColor = getTierColor(item.tier)

    // 돌파 보너스 계산 함수
    const calculateBreakthroughBonus = () => {
        const breakthroughLevel = item.breakthrough || item.raw?.exceedLevel || 0
        if (!breakthroughLevel || breakthroughLevel <= 0) return null

        const slot = item.slot || ''
        const category = item.category || item.raw?.categoryName || ''
        const slotPos = item.raw?.slotPos || 0

        // 슬롯 이름 체크 (한글이므로 toLowerCase 제거)
        const isWeapon = slot.includes('주무기') || slot.includes('무기') || slotPos === 1
        const isGuard = slot.includes('보조') || category.includes('가더') || slotPos === 2
        const isArmor = slot.includes('투구') || slot.includes('견갑') || slot.includes('흉갑') ||
            slot.includes('장갑') || slot.includes('각반') || slot.includes('장화') || slot.includes('망토') ||
            [3, 4, 5, 6, 7, 8, 9].includes(slotPos)
        const isAccessory = slot.includes('귀걸이') || slot.includes('목걸이') ||
            slot.includes('반지') || slot.includes('벨트') || slot.includes('아뮬렛') || slot.includes('팔찌') ||
            [10, 11, 12, 13, 14, 15, 16, 17].includes(slotPos)

        const bonuses: { name: string, value: string }[] = []

        if (isWeapon || isGuard) {
            bonuses.push({ name: '공격력', value: `+${30 * breakthroughLevel}` })
            bonuses.push({ name: '공격력 증가', value: `+${1 * breakthroughLevel}%` })
        } else if (isArmor) {
            bonuses.push({ name: '방어력', value: `+${40 * breakthroughLevel}` })
            bonuses.push({ name: '생명력', value: `+${40 * breakthroughLevel}` })
            bonuses.push({ name: '방어력 증가', value: `+${1 * breakthroughLevel}%` })
        } else if (isAccessory) {
            bonuses.push({ name: '공격력', value: `+${20 * breakthroughLevel}` })
            bonuses.push({ name: '방어력', value: `+${20 * breakthroughLevel}` })
            bonuses.push({ name: '공격력 증가', value: `+${1 * breakthroughLevel}%` })
        }

        return bonuses.length > 0 ? { level: breakthroughLevel, bonuses } : null
    }

    const breakthroughBonus = calculateBreakthroughBonus()

    return (
        <div style={{
            position: 'absolute',
            top: 'calc(100% + 10px)', // Below the card
            left: '50%',
            transform: 'translateX(-50%)',
            width: '260px',
            background: 'rgba(15, 17, 23, 0.98)',
            border: `1px solid ${tierColor}80`,
            borderRadius: '8px',
            padding: '12px',
            zIndex: 99999, // Ensure it's on top of everything
            boxShadow: '0 10px 25px rgba(0,0,0,0.8)',
            pointerEvents: 'none', // Prevent tooltip from capturing mouse events
            textAlign: 'left'
        }}>
            {/* Arrow - pointing upward */}
            <div style={{
                position: 'absolute',
                top: '-6px',
                left: '50%',
                transform: 'translateX(-50%) rotate(45deg)',
                width: '10px',
                height: '10px',
                background: 'rgba(15, 17, 23, 0.98)',
                borderLeft: `1px solid ${tierColor}80`,
                borderTop: `1px solid ${tierColor}80`,
            }}></div>

            {/* Header: Name & Enhance */}
            <div style={{ borderBottom: '1px solid #1F2433', paddingBottom: '8px', marginBottom: '8px' }}>
                <div style={{ color: tierColor, fontSize: '0.95rem', fontWeight: 'bold', lineHeight: '1.4' }}>
                    {item.enhancement && <span style={{ color: '#FACC15', marginRight: '6px' }}>{item.enhancement}</span>}
                    {item.name}
                    {breakthroughBonus && (
                        <span style={{ color: '#3B82F6', marginLeft: '6px', fontSize: '0.85rem' }}>
                            {'◆'.repeat(breakthroughBonus.level)}
                        </span>
                    )}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '4px' }}>
                    {item.category || item.slot}
                </div>
            </div>

            {/* Content stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

                {/* 1. Base Options (기본 옵션) */}
                {item.detail?.options && item.detail.options.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.8rem', color: '#E5E7EB' }}>
                        {item.detail.options.map((opt: any, idx: number) => (
                            <div key={`base-${idx}`} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#9CA3AF' }}>{opt.name}</span>
                                <span>{opt.value}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Fallback to raw stats if detail is not available */
                    item.raw && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.8rem', color: '#E5E7EB' }}>
                            {item.raw.attack > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#9CA3AF' }}>공격력</span>
                                    <span>{item.raw.attack}</span>
                                </div>
                            )}
                            {item.raw.magicalAttack > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#9CA3AF' }}>마법 공격력</span>
                                    <span>{item.raw.magicalAttack}</span>
                                </div>
                            )}
                            {item.raw.hp > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#9CA3AF' }}>생명력</span>
                                    <span>{item.raw.hp}</span>
                                </div>
                            )}
                            {item.raw.physicalDefense > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#9CA3AF' }}>물리 방어</span>
                                    <span>{item.raw.physicalDefense}</span>
                                </div>
                            )}
                            {item.raw.magicalDefense > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#9CA3AF' }}>마법 방어</span>
                                    <span>{item.raw.magicalDefense}</span>
                                </div>
                            )}
                        </div>
                    )
                )}

                {/* 1.5 돌파 보너스 (파란색) */}
                {breakthroughBonus && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.8rem', marginTop: '4px', paddingTop: '4px', borderTop: '1px dashed #374151' }}>
                        <div style={{ color: '#60A5FA', fontWeight: 'bold', fontSize: '0.75rem', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ color: '#3B82F6' }}>◆</span>
                            돌파 {breakthroughBonus.level}단계
                        </div>
                        {breakthroughBonus.bonuses.map((bonus, idx) => (
                            <div key={`bt-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', color: '#60A5FA' }}>
                                <span>{bonus.name}</span>
                                <span>{bonus.value}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* 2. 영혼각인 옵션 (Green) */}
                {item.detail?.randomOptions && item.detail.randomOptions.length > 0 && (
                    <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px dashed #374151' }}>
                        <div style={{ color: '#86EFAC', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '2px' }}>영혼각인</div>
                        {item.detail.randomOptions.map((opt: any, idx: number) => (
                            <div key={`rnd-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', color: '#86EFAC', fontSize: '0.8rem' }}>
                                <span>{opt.name}</span>
                                <span>+{opt.value}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* 3. Soul Engraving (영혼 각인) */}
                {item.soulEngraving && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.8rem',
                        marginTop: '4px',
                        paddingTop: '4px',
                        borderTop: '1px dashed #374151'
                    }}>
                        <span style={{ color: '#9CA3AF' }}>영혼 각인</span>
                        <span style={{ color: '#E5E7EB' }}>
                            <span style={{ color: item.soulEngraving.grade === 'S' ? '#FACC15' : '#E5E7EB' }}>{item.soulEngraving.grade}등급</span>
                            {' '}({item.soulEngraving.percentage}%)
                        </span>
                    </div>
                )}

                {/* 4. Manastones (마석) - from detail.manastones */}
                {item.detail?.manastones && item.detail.manastones.length > 0 && (
                    <div style={{ marginTop: '4px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '4px' }}>마석</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {item.detail.manastones.map((stone: any, idx: number) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#60A5FA' }}>
                                    {stone.icon && (
                                        <img
                                            src={stone.icon}
                                            alt={stone.type}
                                            style={{ width: '16px', height: '16px', flexShrink: 0 }}
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                        />
                                    )}
                                    <span style={{ flex: 1 }}>{stone.type}</span>
                                    <span>{stone.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 5. God Stones (신석) */}
                {item.detail?.godstones && item.detail.godstones.length > 0 && (
                    <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px dashed #374151' }}>
                        <div style={{ fontSize: '0.75rem', color: '#C084FC', marginBottom: '2px' }}>신석</div>
                        {item.detail.godstones.map((stone: any, idx: number) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#C084FC', marginBottom: '2px' }}>
                                {stone.icon && (
                                    <img
                                        src={stone.icon}
                                        alt={stone.name}
                                        style={{ width: '16px', height: '16px', flexShrink: 0 }}
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                    />
                                )}
                                <span>{stone.name}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* 6. Set Effects (세트 효과) - Simplified */}
                {item.detail?.setEffects && item.detail.setEffects.length > 0 && (
                    <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #1F2433' }}>
                        <div style={{ fontSize: '0.75rem', color: '#FCD34D', marginBottom: '2px' }}>세트 효과</div>
                        {item.detail.setEffects.map((effect: any, idx: number) => (
                            <div key={idx} style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                                {effect.name}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
