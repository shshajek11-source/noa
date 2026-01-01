'use client'
import CharacterImage from './CharacterImage'

interface CharacterHeaderProps {
    data: {
        name: string
        level: number
        class: string
        server: string
        race?: string
        title?: string
        character_image_url?: string
        tier_rank?: string
        power_index?: number
        item_level?: number
        percentile?: number
    }
}

const getTierLetter = (tierRank?: string): string => {
    return tierRank?.charAt(0) || 'D'
}

export default function CharacterHeader({ data }: CharacterHeaderProps) {
    const tier = getTierLetter(data.tier_rank)

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr auto',
            gap: '2rem',
            alignItems: 'center',
            background: '#1A1D29',
            padding: '2rem',
            borderRadius: '12px',
            border: '1px solid #2D3748'
        }}>
            {/* Character Image */}
            <CharacterImage
                imageUrl={data.character_image_url}
                name={data.name}
                tier={tier}
            />

            {/* Character Info */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
            }}>
                <h1 style={{
                    margin: 0,
                    fontSize: '2rem',
                    color: '#E5E7EB',
                    fontWeight: 'bold'
                }}>
                    {data.name}
                </h1>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    color: '#9CA3AF',
                    fontSize: '1rem'
                }}>
                    <span>{data.server}</span>
                    <span>•</span>
                    <span>{data.class}</span>
                    <span>•</span>
                    <span>Lv.{data.level}</span>
                    {data.race && (
                        <>
                            <span>•</span>
                            <span>{data.race}</span>
                        </>
                    )}
                </div>

                {data.title && (
                    <div style={{
                        color: '#FBBF24',
                        fontSize: '0.875rem',
                        fontStyle: 'italic'
                    }}>
                        {data.title}
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
            }}>
                <button
                    className="btn"
                    style={{
                        padding: '0.5rem 1rem',
                        background: 'var(--primary)',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#0B0D12',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                    }}
                >
                    갱신
                </button>
                <button
                    className="btn"
                    style={{
                        padding: '0.5rem 1rem',
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        color: 'var(--text-main)',
                        fontWeight: '500',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                    }}
                >
                    비교
                </button>
            </div>
        </div>
    )
}
