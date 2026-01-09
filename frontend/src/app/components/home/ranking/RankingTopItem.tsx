import Link from 'next/link'
import { RankingCharacter } from '@/types/character'
import DSCard from '@/app/components/design-system/DSCard'

interface RankingTopItemProps {
    character: RankingCharacter
    rank: number
}

export default function RankingTopItem({ character, rank }: RankingTopItemProps) {
    const isElyos = character.race_name?.toLowerCase() === 'elyos'
    const rankColor = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32'

    // Fallback profile image if none
    const profileImg = character.profile_image || '/placeholder-avatar.svg'

    return (
        <Link href={`/c/${encodeURIComponent(character.server_id)}/${encodeURIComponent(character.name)}`} className="block w-full">
            <DSCard
                hoverEffect
                noPadding
                style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)',
                    textAlign: 'center',
                    padding: '1.5rem 1rem',
                    position: 'relative',
                    borderTop: `3px solid ${rankColor}`
                }}
            >
                {/* Rank Badge */}
                <div style={{
                    position: 'absolute',
                    top: '0.5rem',
                    left: '0.5rem',
                    width: '24px',
                    height: '24px',
                    background: rankColor,
                    color: '#000',
                    fontWeight: 'bold',
                    fontSize: '0.8rem',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
                }}>
                    {rank}
                </div>

                {/* Profile Image */}
                <div style={{
                    width: '64px',
                    height: '64px',
                    margin: '0 auto 1rem',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: `2px solid ${isElyos ? '#4BC0C0' : '#FF6384'}`,
                    background: '#222'
                }}>
                    {/* Using standard img tag for now as Next/Image might need domain config */}
                    <img
                        src={profileImg}
                        alt={character.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder-avatar.svg'
                        }}
                    />
                </div>

                {/* Info */}
                <div style={{ marginBottom: '0.5rem' }}>
                    <h3 style={{
                        color: 'var(--text-main)',
                        fontWeight: 'bold',
                        fontSize: '1.1rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {character.name}
                    </h3>
                    <p style={{
                        color: 'var(--text-secondary)',
                        fontSize: '0.85rem'
                    }}>
                        {character.class_name}
                    </p>
                </div>

                {/* Score */}
                <div style={{
                    background: 'rgba(0,0,0,0.3)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    display: 'inline-block'
                }}>
                    <span style={{ color: 'var(--brand-red-main)', fontWeight: 'bold' }}>
                        {(character.combat_power || 0).toLocaleString()}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#666', marginLeft: '4px' }}>CP</span>
                </div>
            </DSCard>
        </Link>
    )
}
