'use client'

import { useEffect } from 'react'

interface ItemDetailModalProps {
    item: any
    onClose: () => void
}

export default function ItemDetailModal({ item, onClose }: ItemDetailModalProps) {
    useEffect(() => {
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = 'unset' }
    }, [])

    if (!item) return null

    // Helper for tier color
    const getTierColor = (tier: number | undefined) => {
        if (!tier) return '#9CA3AF'
        if (tier >= 5) return '#FACC15' // Mythic/High
        if (tier >= 4) return '#FBBF24' // Legendary/Unique
        return '#9CA3AF'
    }

    // Check if we have tier from mapped item or raw
    const tier = item.tier || (item.raw ? (item.raw.grade === 'Mythic' ? 5 : 4) : 3)
    const tierColor = getTierColor(tier)

    // Check if this is an Arcana item (slotPos 41-45)
    const isArcana = item.raw?.slotPos >= 41 && item.raw?.slotPos <= 45

    // 돌파 보너스 계산 함수
    const calculateBreakthroughBonus = () => {
        // breakthrough 또는 exceedLevel에서 돌파 단계 가져오기
        const breakthroughLevel = item.breakthrough || item.raw?.exceedLevel || 0
        if (!breakthroughLevel || breakthroughLevel <= 0) return null

        const slot = (item.slot || '').toLowerCase()
        const category = (item.category || item.raw?.categoryName || '').toLowerCase()
        const slotPos = item.raw?.slotPos || 0

        // 슬롯 타입 판별
        const isWeapon = slot.includes('주무기') || slot.includes('무기') || slotPos === 1
        const isGuard = slot.includes('보조') || slot.includes('가더') || category.includes('가더') || slotPos === 2
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
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(2px)'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    width: '850px', maxWidth: '95vw',
                    background: '#18181B', border: '1px solid #27272A', borderRadius: '4px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    display: 'flex', flexDirection: 'column',
                    maxHeight: '90vh', overflowY: 'auto'
                }}
                onClick={e => e.stopPropagation()}
            >

                {/* Header */}
                <div style={{
                    padding: '16px', borderBottom: '1px solid #27272A',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#E4E4E7', fontSize: '1.1rem', fontWeight: 'bold' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
                        <span>상세 보기</span>
                    </div>
                    <button onClick={onClose} style={{ color: '#A1A1AA', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                {/* Body - 2 Columns */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', minHeight: '500px' }}>

                    {/* LEFT COLUMN: Item Info */}
                    <div style={{ padding: '24px', borderRight: '1px solid #27272A' }}>
                        {/* Item Identity */}
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                            <div style={{
                                width: '64px', height: '64px', borderRadius: '4px',
                                background: '#111', border: `1px solid ${tierColor}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative'
                            }}>
                                {item.image && <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                {item.enhancement && <div style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.8)', color: '#FACC15', fontSize: '0.8rem', padding: '0 3px', borderRadius: '2px', fontWeight: 'bold' }}>{item.enhancement}</div>}
                            </div>
                            <div>
                                <div style={{ color: tierColor, fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '6px' }}>
                                    {item.enhancement && <span style={{ color: '#FACC15', marginRight: '6px' }}>{item.enhancement}</span>}
                                    {item.name}
                                    {/* 돌파 표시 */}
                                    {breakthroughBonus && (
                                        <span style={{ color: '#3B82F6', marginLeft: '8px', fontSize: '0.9rem' }}>
                                            {'◆'.repeat(breakthroughBonus.level)}
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    {/* Mock Icons */}
                                    <span title="보관 가능" style={{ color: '#71717A' }}>📦</span>
                                    <span title="거래 가능" style={{ color: '#71717A' }}>⚖️</span>
                                    <span title="판매 가능" style={{ color: '#71717A' }}>💰</span>
                                </div>
                            </div>
                        </div>

                        {/* Info Section */}
                        <div style={{ background: '#27272A', padding: '8px 12px', fontSize: '0.9rem', color: '#A1A1AA', marginBottom: '16px', fontWeight: 'bold' }}>아이템 정보</div>

                        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px', fontSize: '0.9rem', marginBottom: '24px' }}>
                            <div style={{ color: '#A1A1AA' }}>분류</div>
                            <div style={{ color: '#E4E4E7' }}>{item.category || (item.raw ? item.raw.categoryName : '장비')}</div>

                            {item.raw?.itemLevel && <>
                                <div style={{ color: '#A1A1AA' }}>아이템 레벨</div>
                                <div style={{ color: '#E4E4E7' }}>{item.raw.itemLevel}</div>
                            </>}

                            {/* Static Data Fallback if raw data is sparse */}
                            <div style={{ color: '#A1A1AA' }}>직업 제한</div>
                            <div style={{ color: '#E4E4E7' }}>전체 (또는 클래스 전용)</div>

                            <div style={{ color: '#A1A1AA' }}>착용 레벨</div>
                            <div style={{ color: '#E4E4E7' }}>{item.raw?.equipLevel || '-'}</div>
                        </div>

                        {/* Options Section */}
                        <div style={{ borderTop: '1px solid #27272A', paddingTop: '24px', marginBottom: '24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px', fontSize: '0.9rem' }}>
                                <div style={{ color: '#A1A1AA' }}>옵션</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: '#E4E4E7' }}>

                                    {/* 1. Base Options from Detail API */}
                                    {item.detail?.options && item.detail.options.length > 0 && item.detail.options.map((opt: any, idx: number) => (
                                        <div key={`base-${idx}`} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: '#D4D4D8' }}>{opt.name}</span>
                                            <span>{opt.value}</span>
                                        </div>
                                    ))}

                                    {/* 1.5 돌파 보너스 (파란색) */}
                                    {breakthroughBonus && (
                                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #374151' }}>
                                            <div style={{ color: '#60A5FA', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ color: '#3B82F6' }}>◆</span>
                                                돌파 {breakthroughBonus.level}단계 보너스
                                            </div>
                                            {breakthroughBonus.bonuses.map((bonus, idx) => (
                                                <div key={`bt-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', color: '#60A5FA' }}>
                                                    <span>{bonus.name}</span>
                                                    <span>{bonus.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Fallback to raw if detail is missing or empty (Legacy) */}
                                    {(!item.detail?.options || item.detail.options.length === 0) && item.raw && (
                                        <>
                                            {item.raw.attack > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: '#D4D4D8' }}>공격력</span>
                                                    <span>{item.raw.attack}</span>
                                                </div>
                                            )}
                                            {item.raw.magicalAttack > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: '#D4D4D8' }}>마법 공격력</span>
                                                    <span>{item.raw.magicalAttack}</span>
                                                </div>
                                            )}
                                            {item.raw.hp > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: '#D4D4D8' }}>생명력</span>
                                                    <span>{item.raw.hp}</span>
                                                </div>
                                            )}
                                            {item.raw.physicalDefense > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: '#D4D4D8' }}>물리 방어력</span>
                                                    <span>{item.raw.physicalDefense}</span>
                                                </div>
                                            )}
                                            {item.raw.magicalDefense > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: '#D4D4D8' }}>마법 방어력</span>
                                                    <span>{item.raw.magicalDefense}</span>
                                                </div>
                                            )}
                                            {/* Add a notice if no detail data available */}
                                            {!item.raw.attack && !item.raw.magicalAttack && !item.raw.hp && !item.raw.physicalDefense && !item.raw.magicalDefense && (
                                                <div style={{ color: '#71717A', fontSize: '0.85rem' }}>
                                                    상세 정보를 불러오는 중...
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* 2. 영혼각인 옵션 (Green) */}
                                    {item.detail?.randomOptions && item.detail.randomOptions.length > 0 && (
                                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #374151' }}>
                                            <div style={{ color: '#86EFAC', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>
                                                영혼각인 옵션
                                            </div>
                                            {item.detail.randomOptions.map((opt: any, idx: number) => (
                                                <div key={`rnd-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', color: '#86EFAC' }}>
                                                    <span>{opt.name}</span>
                                                    <span>+{opt.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* 3. Manastones (Blue) - from detail.manastones (장비만) */}
                                    {!isArcana && item.detail?.manastones && item.detail.manastones.length > 0 && item.detail.manastones.map((m: any, idx: number) => (
                                        <div key={`ms-${idx}`} style={{ color: '#60A5FA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                            {m.icon && (
                                                <img
                                                    src={m.icon}
                                                    alt={m.type}
                                                    style={{ width: '20px', height: '20px', flexShrink: 0 }}
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                                />
                                            )}
                                            <span style={{ flex: 1 }}>{m.type}</span>
                                            <span>{m.value}</span>
                                        </div>
                                    ))}

                                    {/* 4. God Stones (Purple) - (장비만) */}
                                    {!isArcana && item.detail?.godstones && item.detail.godstones.length > 0 && (
                                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #374151' }}>
                                            <div style={{ color: '#C084FC', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '4px' }}>신석</div>
                                            {item.detail.godstones.map((stone: any, idx: number) => (
                                                <div key={`god-${idx}`} style={{ color: '#C084FC', fontSize: '0.85rem', marginBottom: '8px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', marginBottom: '4px' }}>
                                                        {stone.icon && (
                                                            <img
                                                                src={stone.icon}
                                                                alt={stone.name}
                                                                style={{ width: '24px', height: '24px', flexShrink: 0 }}
                                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                                            />
                                                        )}
                                                        <span>{stone.name}</span>
                                                    </div>
                                                    <div style={{ color: '#A1A1AA', fontSize: '0.8rem', marginTop: '2px', whiteSpace: 'pre-wrap', paddingLeft: stone.icon ? '32px' : '0' }}>
                                                        {stone.desc}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* 5. Arcanas (아르카나 효과) - (아르카나만) */}
                                    {isArcana && (
                                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #374151' }}>
                                            <div style={{ color: '#F59E0B', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '8px' }}>
                                                아르카나 효과
                                            </div>

                                            {item.detail?.arcanas && item.detail.arcanas.length > 0 ? item.detail.arcanas.map((skill: any, idx: number) => {
                                                return (
                                                    <div key={`skill-${idx}`} style={{ marginBottom: '10px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            {skill.icon && (
                                                                <img
                                                                    src={skill.icon}
                                                                    alt={skill.name}
                                                                    style={{ width: '32px', height: '32px', flexShrink: 0 }}
                                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                                                />
                                                            )}
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ color: '#F59E0B', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                                                    {skill.name}
                                                                    {skill.level && <span style={{ color: '#FCD34D', marginLeft: '6px', fontSize: '0.8rem' }}>Lv.{skill.level}</span>}
                                                                </div>
                                                                {skill.desc && (
                                                                    <div style={{ color: '#D4D4D8', fontSize: '0.75rem', marginTop: '2px', lineHeight: '1.4' }}>
                                                                        {skill.desc}
                                                                    </div>
                                                                )}
                                                                {skill.value && (
                                                                    <div style={{ color: '#86EFAC', fontSize: '0.75rem', marginTop: '2px' }}>
                                                                        {skill.value}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            }) : null}
                                        </div>
                                    )}

                                    {/* Debug info - show if detail exists but transformed incorrectly */}
                                    {item.detail?._raw && (!item.detail.options || item.detail.options.length === 0) && (
                                        <div style={{ marginTop: '8px', padding: '8px', background: '#27272A', borderRadius: '4px' }}>
                                            <div style={{ color: '#FCD34D', fontSize: '0.8rem', marginBottom: '4px' }}>디버그 정보:</div>
                                            <div style={{ color: '#71717A', fontSize: '0.75rem', maxHeight: '100px', overflow: 'auto' }}>
                                                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                                                    {JSON.stringify(item.detail._raw, null, 2).substring(0, 500)}...
                                                </pre>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Soul Engraving */}
                        {item.soulEngraving && (
                            <div style={{ borderTop: '1px solid #27272A', paddingTop: '24px' }}>
                                <div style={{ display: 'flex', gap: '8px', fontSize: '0.9rem', marginBottom: '8px' }}>
                                    <span style={{ color: '#3B82F6' }}>영혼 각인 ({item.soulEngraving.percentage}%)</span>
                                </div>
                                <div style={{ paddingLeft: '0px', color: '#E4E4E7', fontSize: '0.9rem' }}>
                                    <div>{item.soulEngraving.grade}등급 효과 적용 중</div>
                                    <div style={{ color: '#A1A1AA', fontSize: '0.8rem', marginTop: '4px' }}>
                                        PvP 공격력/방어력 증가 등
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN: Set Effects & Source */}
                    <div style={{ padding: '24px', background: '#18181B' }}>
                        <div style={{ background: '#27272A', padding: '8px 12px', fontSize: '0.9rem', color: '#A1A1AA', marginBottom: '24px', fontWeight: 'bold' }}>세트 효과</div>
                        <div style={{ color: '#E4E4E7', fontSize: '0.9rem', marginBottom: '48px', minHeight: '100px' }}>
                            {item.detail?.setEffects && item.detail.setEffects.length > 0 ? (
                                item.detail.setEffects.map((effect: any, idx: number) => (
                                    <div key={idx} style={{ marginBottom: '12px' }}>
                                        <div style={{ color: '#FCD34D', marginBottom: '6px', fontSize: '0.95rem', fontWeight: 'bold' }}>
                                            {effect.name}
                                            {effect.equippedCount && <span style={{ color: '#86EFAC', marginLeft: '6px', fontSize: '0.85rem' }}>({effect.equippedCount}개 장착)</span>}
                                        </div>
                                        {effect.bonuses?.map((bonus: any, bIdx: number) => (
                                            <div key={bIdx} style={{ marginBottom: '8px', paddingLeft: '8px' }}>
                                                <div style={{ color: '#F59E0B', fontSize: '0.8rem', marginBottom: '2px' }}>{bonus.degree}세트</div>
                                                {bonus.descriptions?.map((desc: string, dIdx: number) => (
                                                    <div key={dIdx} style={{ fontSize: '0.8rem', color: '#D4D4D8', paddingLeft: '8px' }}>• {desc}</div>
                                                ))}
                                            </div>
                                        ))}
                                        {effect.options?.map((opt: any, oIdx: number) => (
                                            <div key={oIdx} style={{ fontSize: '0.8rem', color: '#A1A1AA', paddingLeft: '8px' }}>- {opt}</div>
                                        ))}
                                    </div>
                                ))
                            ) : (
                                <div style={{ color: '#71717A' }}>없음</div>
                            )}
                        </div>

                        <div style={{ background: '#27272A', padding: '8px 12px', fontSize: '0.9rem', color: '#A1A1AA', marginBottom: '24px', fontWeight: 'bold' }}>획득처</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px', fontSize: '0.9rem' }}>
                            <div style={{ color: '#A1A1AA' }}>출처</div>
                            <div style={{ color: '#E4E4E7' }}>{item.detail?.source || item.raw?.source || '-'}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
