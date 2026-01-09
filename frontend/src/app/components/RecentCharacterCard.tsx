'use client'

import { RecentCharacter } from '../../types/character'

interface RecentCharacterCardProps {
    character: RecentCharacter
    compact?: boolean
    onClick: (character: RecentCharacter) => void
    onRemove: (id: string, e: React.MouseEvent) => void
}

export default function RecentCharacterCard({ character, onClick, onRemove }: RecentCharacterCardProps) {
    const isElyos = character.race?.toLowerCase() === 'elyos'
    const raceColor = isElyos ? '#4BC0C0' : '#FF6384'

    return (
        <>
            <style>{`
                .recent-card {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    width: 100%;
                    height: 56px;
                    padding: 0 12px;
                    background: transparent;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .recent-card:hover {
                    background: rgba(255, 255, 255, 0.03);
                    border-color: rgba(255, 255, 255, 0.1);
                }
                .recent-card:last-child {
                    border-bottom: none;
                }
                .recent-card .remove-btn {
                    opacity: 0;
                    transition: opacity 0.2s;
                }
                .recent-card:hover .remove-btn {
                    opacity: 1;
                }
            `}</style>

            <div className="recent-card" onClick={() => onClick(character)}>
                {/* Left: Avatar & Level Badge */}
                <div style={{ position: 'relative', flexShrink: 0, marginRight: '12px' }}>
                    <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: `2px solid ${raceColor}`,
                        background: '#1f2937'
                    }}>
                        {character.profileImage ? (
                            <img
                                src={character.profileImage}
                                alt={character.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/placeholder-avatar.svg'
                                }}
                            />
                        ) : (
                            <div style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#6b7280',
                                fontSize: '0.6rem'
                            }}>
                                ?
                            </div>
                        )}
                    </div>
                    {/* Level Badge */}
                    <div style={{
                        position: 'absolute',
                        bottom: '-2px',
                        right: '-2px',
                        background: 'rgba(0,0,0,0.9)',
                        color: '#fbbf24',
                        fontSize: '0.6rem',
                        fontWeight: '700',
                        padding: '1px 4px',
                        borderRadius: '4px',
                        border: '1px solid #fbbf24',
                        lineHeight: 1
                    }}>
                        {character.level || '?'}
                    </div>
                </div>

                {/* Center: Info */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                        color: '#fff',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        whiteSpace: 'nowrap'
                    }}>
                        {character.name}
                    </span>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.8rem',
                        color: '#9ca3af',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        <span style={{ color: '#4b5563' }}>|</span>
                        <span>{character.server}</span>
                        <span style={{ color: '#4b5563' }}>|</span>
                        <span style={{ color: raceColor }}>
                            {isElyos ? '천족' : '마족'}
                        </span>
                        <span style={{ color: '#4b5563' }}>|</span>
                        <span>{character.class || '?'}</span>
                    </div>
                </div>

                {/* Right: Item Level & Remove */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, marginLeft: '8px' }}>
                    {/* Item Level */}
                    {character.itemLevel !== undefined && character.itemLevel > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>IL</span>
                            <span style={{
                                color: '#fbbf24',
                                fontWeight: '700',
                                fontSize: '0.85rem'
                            }}>
                                {character.itemLevel.toLocaleString()}
                            </span>
                        </div>
                    )}

                    {/* Remove Button */}
                    <button
                        className="remove-btn"
                        onClick={(e) => onRemove(character.id, e)}
                        style={{
                            padding: '4px',
                            borderRadius: '50%',
                            background: 'transparent',
                            border: 'none',
                            color: '#6b7280',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#ef4444'
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#6b7280'
                            e.currentTarget.style.background = 'transparent'
                        }}
                        aria-label="기록 삭제"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        </>
    )
}
