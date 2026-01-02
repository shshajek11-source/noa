export default function ProfileSection({ character }: { character: any }) {
    if (!character) return null

    // Calculate rank tier based on percentile or rank
    const getRankTier = (percentile: number) => {
        if (percentile >= 99) return { name: 'Diamond', color: '#FACC15', isTop: true }
        if (percentile >= 95) return { name: 'Platinum', color: '#a78bfa', isTop: true }
        if (percentile >= 85) return { name: 'Gold', color: '#FBBF24', isTop: true }
        if (percentile >= 70) return { name: 'Silver', color: '#94a3b8', isTop: false }
        return { name: 'Bronze', color: '#cd7f32', isTop: false }
    }

    const rankTier = getRankTier(character.percentile || 0)

    return (
        <div style={{
            background: '#111318',
            border: '1px solid #1F2433',
            borderRadius: '12px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
        }}>
            {/* Character Image & Basic Info */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem'
            }}>
                {/* Profile Image Container */}
                <div style={{
                    position: 'relative',
                    width: '120px',
                    height: '120px'
                }}>
                    {/* Profile Image */}
                    <div style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: `3px solid ${rankTier.isTop ? rankTier.color : '#1F2433'}`,
                        boxShadow: rankTier.isTop ? `0 0 20px ${rankTier.color}50` : 'none'
                    }}>
                        {character.character_image_url ? (
                            <img
                                src={character.character_image_url}
                                alt={character.name}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                }}
                            />
                        ) : (
                            <div style={{
                                width: '100%',
                                height: '100%',
                                background: '#0B0D12',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#9CA3AF',
                                fontSize: '2rem'
                            }}>
                                {character.name?.[0]}
                            </div>
                        )}
                    </div>

                    {/* S1 Badge - Bottom Right */}
                    <img
                        src="/s1-badge.png"
                        alt="S1 Badge"
                        style={{
                            position: 'absolute',
                            bottom: '-23px',
                            right: '-28px',
                            width: '95px',
                            height: '95px',
                            objectFit: 'contain',
                            filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))'
                        }}
                    />
                </div>

                {/* Name & Level */}
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        color: '#E5E7EB',
                        marginBottom: '0.25rem'
                    }}>
                        {character.name}
                    </h2>
                    <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        justifyContent: 'center',
                        flexWrap: 'wrap'
                    }}>
                        <span style={{
                            padding: '0.25rem 0.75rem',
                            background: '#0B0D12',
                            border: '1px solid #1F2433',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            color: '#E5E7EB'
                        }}>
                            Lv.{character.level}
                        </span>
                        <span style={{
                            padding: '0.25rem 0.75rem',
                            background: '#0B0D12',
                            border: '1px solid #1F2433',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            color: '#9CA3AF'
                        }}>
                            {character.class}
                        </span>
                    </div>
                </div>
            </div>

            {/* Divider */}
            <div style={{
                height: '1px',
                background: '#1F2433'
            }} />

            {/* Combat Power */}
            <div style={{
                textAlign: 'center',
                padding: '1rem',
                background: '#0B0D12',
                borderRadius: '8px',
                border: '1px solid #1F2433'
            }}>
                <div style={{
                    fontSize: '0.75rem',
                    color: '#9CA3AF',
                    marginBottom: '0.5rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                }}>
                    Combat Power
                </div>
                <div style={{
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    color: rankTier.isTop ? rankTier.color : '#E5E7EB'
                }}>
                    {character.power?.toLocaleString() || '0'}
                </div>
            </div>

            {/* Ranking Info */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
            }}>
                {/* Server Rank */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem',
                    background: '#0B0D12',
                    borderRadius: '6px',
                    border: '1px solid #1F2433'
                }}>
                    <span style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>서버 랭킹</span>
                    <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#E5E7EB' }}>
                        #{character.rank || 'N/A'}
                    </span>
                </div>

                {/* Percentile */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem',
                    background: '#0B0D12',
                    borderRadius: '6px',
                    border: '1px solid #1F2433'
                }}>
                    <span style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>상위</span>
                    <span style={{
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        color: rankTier.isTop ? rankTier.color : '#E5E7EB'
                    }}>
                        {character.percentile ? `${character.percentile.toFixed(1)}%` : 'N/A'}
                    </span>
                </div>

                {/* Rank Tier Badge */}
                <div style={{
                    padding: '1rem',
                    background: rankTier.isTop ? `${rankTier.color}10` : '#0B0D12',
                    border: `1px solid ${rankTier.isTop ? `${rankTier.color}40` : '#1F2433'}`,
                    borderRadius: '6px',
                    textAlign: 'center'
                }}>
                    <div style={{
                        fontSize: '1.25rem',
                        fontWeight: 'bold',
                        color: rankTier.isTop ? rankTier.color : '#E5E7EB',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em'
                    }}>
                        {rankTier.name}
                    </div>
                </div>
            </div>

            {/* Server & Race Info */}
            <div style={{
                paddingTop: '0.75rem',
                borderTop: '1px solid #1F2433',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span style={{ color: '#9CA3AF' }}>서버</span>
                    <span style={{ color: '#E5E7EB' }}>{character.server}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span style={{ color: '#9CA3AF' }}>종족</span>
                    <span style={{ color: '#E5E7EB' }}>{character.race}</span>
                </div>
            </div>
        </div>
    )
}
