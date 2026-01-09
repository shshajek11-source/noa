import { ComparisonCharacter } from '@/types/character'
import { Plus, X, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { SERVER_MAP } from '@/app/constants/servers'

interface CompareHeaderProps {
    charA?: ComparisonCharacter
    charB?: ComparisonCharacter
    onRemoveA?: () => void
    onRemoveB?: () => void
    onAddClickA?: () => void
    onAddClickB?: () => void
    getServerName?: (serverId: number) => string
}

export default function CompareHeader({ charA, charB, onRemoveA, onRemoveB, onAddClickA, onAddClickB, getServerName }: CompareHeaderProps) {
    // 서버 ID를 서버 이름으로 변환
    const resolveServerName = (serverId: number): string => {
        if (getServerName) return getServerName(serverId)
        return SERVER_MAP[String(serverId)] || `서버 ${serverId}`
    }

    const renderCharacterCard = (char: ComparisonCharacter | undefined, side: 'left' | 'right', onRemove?: () => void, onAdd?: () => void) => {
        const isLeft = side === 'left'
        const raceColor = char ? (char.race_name === 'Elyos' ? '#4BC0C0' : '#FF6384') : '#4B5563'

        if (!char) {
            return (
                <div
                    onClick={onAdd}
                    style={{
                        flex: 1,
                        height: '140px',
                        border: '2px dashed rgba(255,255,255,0.1)',
                        borderRadius: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: 'rgba(0,0,0,0.2)',
                        gap: '0.5rem',
                        color: '#9CA3AF'
                    }}
                    className="hover:bg-white/5 hover:border-white/20 hover:text-white"
                >
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Plus size={20} />
                    </div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>캐릭터 추가</span>
                </div>
            )
        }

        return (
            <div style={{
                flex: 1,
                position: 'relative',
                height: '140px',
                background: `linear-gradient(${isLeft ? '90deg' : '-90deg'}, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 100%)`,
                borderRadius: '16px',
                border: `1px solid rgba(255,255,255,0.1)`,
                borderLeft: isLeft ? `4px solid ${raceColor}` : undefined,
                borderRight: !isLeft ? `4px solid ${raceColor}` : undefined,
                display: 'flex',
                alignItems: 'center',
                padding: '0 1.5rem',
                justifyContent: isLeft ? 'flex-start' : 'flex-end',
                overflow: 'hidden'
            }}>
                {/* Background Class Icon/Image Element (Optional) */}
                <div style={{
                    position: 'absolute',
                    top: 0, [isLeft ? 'left' : 'right']: 0,
                    width: '100%', height: '100%',
                    background: `url(${char.profile_image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: 0.2,
                    filter: 'blur(3px)',
                    zIndex: 0
                }} />

                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: isLeft ? 'row' : 'row-reverse', alignItems: 'center', gap: '1.5rem', width: '100%' }}>
                    {/* Avatar */}
                    <div style={{
                        width: '90px', height: '90px',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: `2px solid ${raceColor}`,
                        boxShadow: `0 4px 20px ${raceColor}40`,
                        background: '#1F2937',
                        flexShrink: 0
                    }}>
                        <img
                            src={char.profile_image || '/placeholder-avatar.svg'}
                            alt={char.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-avatar.svg' }}
                        />
                    </div>

                    {/* Info */}
                    <div style={{ textAlign: isLeft ? 'left' : 'right', flex: 1 }}>
                        <div style={{
                            fontSize: '1.75rem', fontWeight: 800, color: '#fff',
                            textShadow: '0 2px 4px rgba(0,0,0,0.5)', lineHeight: 1.2
                        }}>
                            {char.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: isLeft ? 'flex-start' : 'flex-end', marginTop: '0.25rem' }}>
                            <span style={{
                                padding: '2px 8px', borderRadius: '4px',
                                background: raceColor, color: '#000',
                                fontSize: '0.75rem', fontWeight: 'bold'
                            }}>
                                Lv.{char.level}
                            </span>
                            <span style={{ color: '#D1D5DB', fontSize: '0.9rem' }}>
                                {char.class_name}
                            </span>
                        </div>
                        <div style={{
                            color: '#6B7280',
                            fontSize: '0.85rem',
                            marginTop: '0.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            justifyContent: isLeft ? 'flex-start' : 'flex-end'
                        }}>
                            <span>{resolveServerName(char.server_id)}</span>
                            <Link
                                href={`/c/${resolveServerName(char.server_id)}/${char.name}`}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    color: '#9CA3AF',
                                    fontSize: '0.75rem',
                                    textDecoration: 'none',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: 'rgba(255,255,255,0.1)',
                                    transition: 'all 0.2s'
                                }}
                                className="hover:bg-white/20 hover:text-white"
                            >
                                <ExternalLink size={12} />
                                상세
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Remove Button */}
                {onRemove && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onRemove(); }}
                        style={{
                            position: 'absolute',
                            top: '10px',
                            [isLeft ? 'right' : 'left']: '10px',
                            background: 'rgba(0,0,0,0.5)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '24px', height: '24px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#fff',
                            zIndex: 10
                        }}
                        className="hover:bg-red-500/50"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>
        )
    }

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '3rem',
            padding: '1rem 0'
        }}>
            {/* Left Slot */}
            <div style={{ flex: 1, maxWidth: '45%' }}>
                {renderCharacterCard(charA, 'left', onRemoveA, onAddClickA)}
            </div>

            {/* VS Badge */}
            <div style={{
                position: 'relative',
                width: '60px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <div style={{
                    fontSize: '2.5rem',
                    fontWeight: 900,
                    fontStyle: 'italic',
                    background: 'linear-gradient(180deg, #FFFFFF 0%, #94A3B8 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 2px 10px rgba(255,255,255,0.2))',
                    zIndex: 1
                }}>
                    VS
                </div>
                {/* Divider Line behind VS */}
                <div style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%) rotate(15deg)',
                    width: '2px', height: '80px',
                    background: 'rgba(255,255,255,0.1)',
                    zIndex: 0
                }} />
            </div>

            {/* Right Slot */}
            <div style={{ flex: 1, maxWidth: '45%' }}>
                {renderCharacterCard(charB, 'right', onRemoveB, onAddClickB)}
            </div>
        </div>
    )
}
