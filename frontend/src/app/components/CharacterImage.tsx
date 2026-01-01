'use client'
import Image from 'next/image'

interface CharacterImageProps {
    imageUrl?: string
    name: string
    tier: string
}

const getTierColor = (tier: string): string => {
    const colors: Record<string, string> = {
        'S': '#FACC15',
        'A': '#FBBF24',
        'B': '#94A3B8',
        'C': '#9CA3AF',
        'D': '#6B7280'
    }
    return colors[tier] || '#6B7280'
}

export default function CharacterImage({ imageUrl, name, tier }: CharacterImageProps) {
    const tierColor = getTierColor(tier)

    return (
        <div style={{ position: 'relative', width: '120px', height: '120px' }}>
            {/* Character Portrait */}
            <Image
                src={imageUrl || '/placeholder-avatar.svg'}
                alt={name}
                width={120}
                height={120}
                style={{
                    borderRadius: '50%',
                    border: `3px solid ${tierColor}`,
                    objectFit: 'cover',
                    boxShadow: `0 0 20px ${tierColor}40`
                }}
                onError={(e: any) => {
                    e.target.src = '/placeholder-avatar.svg'
                }}
            />

            {/* Tier Badge Image Overlay - 눈에 띄게 크게 */}
            <Image
                src={`/tier-badges/${tier}.png`}
                alt={`${tier} Badge`}
                width={50}
                height={50}
                style={{
                    position: 'absolute',
                    bottom: '-10px',
                    right: '-10px',
                    filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))',
                    animation: tier === 'S' ? 'glow 2s ease-in-out infinite' : 'none'
                }}
                onError={(e: any) => {
                    // 폴백: 이미지 없으면 숨김
                    e.target.style.display = 'none'
                }}
            />

            <style jsx>{`
        @keyframes glow {
          0%, 100% {
            filter: drop-shadow(0 0 10px rgba(250, 204, 21, 0.8));
          }
          50% {
            filter: drop-shadow(0 0 20px rgba(250, 204, 21, 1));
          }
        }
      `}</style>
        </div>
    )
}
