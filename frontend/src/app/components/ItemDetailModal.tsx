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
                                    {/* Standard Options Display */}
                                    {item.raw?.attack > 0 && <div>공격력 {item.raw.attack} <span style={{ color: '#3B82F6' }}>{item.raw.bonusAttack ? `(+${item.raw.bonusAttack})` : ''}</span></div>}
                                    {item.raw?.magicBoost > 0 && <div>마법 증폭력 {item.raw.magicBoost} <span style={{ color: '#3B82F6' }}>{item.raw.bonusMagicBoost ? `(+${item.raw.bonusMagicBoost})` : ''}</span></div>}
                                    {item.raw?.accuracy > 0 && <div>명중 {item.raw.accuracy}</div>}
                                    {item.raw?.crit > 0 && <div>물리 치명타 {item.raw.crit}</div>}
                                    {item.raw?.parry > 0 && <div>막기 {item.raw.parry}</div>}
                                    {item.raw?.block > 0 && <div>방패 방어 {item.raw.block}</div>}
                                    {item.raw?.hp > 0 && <div>생명력 {item.raw.hp}</div>}

                                    {/* Bonus Options (Blue) */}
                                    {item.manastones && item.manastones.map((m: any, idx: number) => (
                                        <div key={`ms-${idx}`} style={{ color: '#3B82F6' }}>
                                            {m.type} {m.value > 0 && `+${m.value}`}
                                        </div>
                                    ))}

                                    {/* Random options from raw if available */}
                                    {item.raw?.randomOptionList?.map((opt: any, idx: number) => (
                                        <div key={`rnd-${idx}`} style={{ color: '#3B82F6' }}>
                                            {opt.name} +{opt.value}
                                        </div>
                                    ))}
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
                            <div style={{ color: '#71717A' }}>없음</div>
                        </div>

                        <div style={{ background: '#27272A', padding: '8px 12px', fontSize: '0.9rem', color: '#A1A1AA', marginBottom: '24px', fontWeight: 'bold' }}>획득처</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px', fontSize: '0.9rem' }}>
                            <div style={{ color: '#A1A1AA' }}>성역</div>
                            <div style={{ color: '#E4E4E7' }}>-</div>
                            <div style={{ color: '#A1A1AA' }}>원정</div>
                            <div style={{ color: '#E4E4E7' }}>-</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
