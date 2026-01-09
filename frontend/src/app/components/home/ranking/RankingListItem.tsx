import Link from 'next/link'
import { RankingCharacter } from '@/types/character'

interface RankingListItemProps {
    character: RankingCharacter
    rank: number
}

export default function RankingListItem({ character, rank }: RankingListItemProps) {
    const isElyos = character.race_name?.toLowerCase() === 'elyos'

    return (
        <Link href={`/c/${encodeURIComponent(character.server_id)}/${encodeURIComponent(character.name)}`} className="block w-full">
            <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                transition: 'background 0.2s',
                cursor: 'pointer'
            }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
                {/* Rank */}
                <div style={{
                    width: '24px',
                    fontWeight: 'bold',
                    color: 'var(--text-secondary)',
                    marginRight: '1rem',
                    textAlign: 'center'
                }}>
                    {rank}
                </div>

                {/* Class Icon & Name */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    {/* Basic Class Indicator (Color Dot) */}
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: isElyos ? '#4BC0C0' : '#FF6384',
                        marginRight: '0.75rem'
                    }} />

                    <div>
                        <div style={{ color: 'var(--text-main)', fontWeight: '500', fontSize: '0.95rem' }}>
                            {character.name}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                            {character.class_name}
                        </div>
                    </div>
                </div>

                {/* Score */}
                <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'var(--text-main)', fontWeight: 'bold', fontSize: '0.95rem' }}>
                        {(character.combat_power || 0).toLocaleString()}
                    </div>
                </div>
            </div>
        </Link>
    )
}
