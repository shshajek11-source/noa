'use client'

interface PowerDisplayProps {
    combatScore?: number
    itemLevel?: number
    tier?: string
    percentile?: number
}

const getTierColor = (tier?: string): string => {
    if (!tier) return '#6B7280'
    const letter = tier.charAt(0)
    const colors: Record<string, string> = {
        'S': '#FACC15',
        'A': '#FBBF24',
        'B': '#94A3B8',
        'C': '#9CA3AF',
        'D': '#6B7280'
    }
    return colors[letter] || '#6B7280'
}

const shouldAnimate = (tier?: string): boolean => {
    if (!tier) return false
    return tier.startsWith('S') || (tier.startsWith('A') && parseInt(tier.charAt(1)) >= 5)
}

export default function PowerDisplay({ combatScore, itemLevel, tier, percentile }: PowerDisplayProps) {
    const tierColor = getTierColor(tier)
    const animate = shouldAnimate(tier)

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            padding: '2rem',
            background: '#1A1D29',
            borderRadius: '12px',
            border: `2px solid ${tierColor}`,
            boxShadow: `0 0 20px ${tierColor}20`
        }}>
            {/* Main Combat Score */}
            <div style={{
                textAlign: 'center'
            }}>
                <div style={{
                    fontSize: '0.875rem',
                    color: '#9CA3AF',
                    marginBottom: '0.5rem',
                    fontWeight: '500'
                }}>
                    전투력
                </div>
                <div style={{
                    fontSize: animate ? '3.5rem' : '3rem',
                    fontWeight: 'bold',
                    color: (tier?.startsWith('S') || tier?.startsWith('A')) ? tierColor : '#E5E7EB',
                    textShadow: animate ? `0 0 20px ${tierColor}80` : 'none',
                    animation: animate ? 'pulse 2s ease-in-out infinite' : 'none',
                    lineHeight: '1'
                }}>
                    {combatScore?.toLocaleString() || '---'}
                </div>
            </div>

            {/* Rank & Percentile */}
            {tier && percentile !== null && percentile !== undefined && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    fontSize: '1.125rem'
                }}>
                    <span style={{
                        color: tierColor,
                        fontWeight: 'bold'
                    }}>
                        {tier}
                    </span>
                    <span style={{
                        color: '#6B7280'
                    }}>
                        •
                    </span>
                    <span style={{
                        color: '#9CA3AF'
                    }}>
                        상위 {percentile}%
                    </span>
                </div>
            )}

            {/* Item Level */}
            {itemLevel && (
                <div style={{
                    fontSize: '0.875rem',
                    color: '#6B7280',
                    textAlign: 'center'
                }}>
                    템 레벨: <span style={{ color: '#9CA3AF' }}>{itemLevel.toLocaleString()}</span>
                </div>
            )}

            <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.9;
          }
        }
      `}</style>
        </div>
    )
}
