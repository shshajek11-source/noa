import React from 'react';
import { Shield, Sword, Crown, User, Star } from 'lucide-react';

interface Member {
    id: string;
    name: string;
    class: string;
    cp: number;
    gearScore: number;
    server: string;
    isMvp: boolean;
    level?: number;
    isMainCharacter?: boolean;
}

interface PartyCardProps {
    member: Member;
    index: number;
}

export default function PartyCard({ member, index }: PartyCardProps) {
    // MVP & Main Character Styling
    const isMvp = member.isMvp;
    const isMain = member.isMainCharacter;
    const glowColor = isMain ? 'rgba(250, 204, 21, 0.4)' : isMvp ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255, 255, 255, 0.05)';
    const borderColor = isMain ? '#FACC15' : isMvp ? '#F59E0B' : 'rgba(255, 255, 255, 0.1)';

    // Class Icon Mock (Replace with real icons later if needed)
    const renderClassIcon = () => {
        return (
            <div style={{
                width: '40px', height: '40px',
                borderRadius: '50%',
                background: isMain ? 'linear-gradient(135deg, #FACC15, #B45309)' : isMvp ? 'linear-gradient(135deg, #F59E0B, #B45309)' : '#1F2937',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: isMain ? '2px solid #FACC15' : isMvp ? '2px solid #FFF' : '1px solid #374151',
                color: isMain || isMvp ? 'white' : '#9CA3AF',
                boxShadow: isMain || isMvp ? '0 4px 6px rgba(0,0,0,0.2)' : 'none'
            }}>
                {isMain ? <Star size={20} /> : isMvp ? <Crown size={20} /> : <User size={20} />}
            </div>
        );
    };

    return (
        <div
            className="party-card-hover"
            style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.8rem 1rem',
                background: isMain
                    ? 'linear-gradient(90deg, rgba(250, 204, 21, 0.1), rgba(0,0,0,0.2))'
                    : isMvp
                    ? 'linear-gradient(90deg, rgba(245, 158, 11, 0.1), rgba(0,0,0,0.2))'
                    : 'rgba(255, 255, 255, 0.02)',
                border: (isMain || isMvp) ? `1px solid ${borderColor}` : '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                marginBottom: '0.5rem',
                transition: 'all 0.2s',
                boxShadow: (isMain || isMvp) ? `0 4px 20px -5px ${glowColor}` : 'none',
                animation: `fadeInUp 0.5s ease-out forwards ${index * 50}ms`,
                opacity: 0,
                cursor: 'default'
            }}
        >

            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .party-card-hover:hover {
                    transform: translateX(4px);
                    background: rgba(255, 255, 255, 0.05) !important;
                    border-color: rgba(255,255,255,0.15) !important;
                }
            `}</style>

            {/* Left: Icon & Name info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                {/* Rank # */}
                <div style={{
                    fontSize: '0.8rem', fontWeight: 700,
                    color: isMain ? '#FACC15' : isMvp ? '#F59E0B' : 'var(--text-secondary)',
                    width: '1.5rem', textAlign: 'center'
                }}>
                    {index + 1}
                </div>

                {/* Icon */}
                <div style={{ position: 'relative' }}>
                    {renderClassIcon()}
                    {member.level && (
                        <span style={{
                            position: 'absolute', bottom: -2, right: -2,
                            background: '#111', color: '#FBBF24',
                            fontSize: '0.6rem', fontWeight: 700,
                            padding: '0 3px', borderRadius: '3px',
                            border: '1px solid #FBBF24',
                            lineHeight: 1
                        }}>
                            {member.level}
                        </span>
                    )}
                </div>

                {/* Name & Meta */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                            color: isMain ? '#FACC15' : isMvp ? '#FDE68A' : 'var(--text-main)',
                            fontWeight: 600, fontSize: '0.9rem'
                        }}>
                            {member.name}
                        </span>
                        {isMain && (
                            <span style={{
                                background: 'linear-gradient(135deg, #FACC15, #B45309)',
                                color: 'white',
                                fontSize: '0.6rem', fontWeight: 800,
                                padding: '1px 5px', borderRadius: '4px',
                                boxShadow: '0 2px 4px rgba(250, 204, 21, 0.3)'
                            }}>대표</span>
                        )}
                        {isMvp && !isMain && (
                            <span style={{
                                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                                color: 'white',
                                fontSize: '0.6rem', fontWeight: 800,
                                padding: '1px 5px', borderRadius: '4px',
                                boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)'
                            }}>MVP</span>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <span>{member.server}</span>
                        <span style={{ opacity: 0.3 }}>|</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{member.class}</span>
                    </div>
                </div>
            </div>

            {/* Right: Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{
                        color: isMain ? '#FACC15' : isMvp ? '#F59E0B' : 'var(--brand-red-main)',
                        fontWeight: 700, fontSize: '0.95rem', fontFamily: 'monospace'
                    }}>
                        {member.cp.toLocaleString()}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-disabled)' }}>CP</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: 'var(--text-disabled)', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                        IL {member.gearScore}
                    </span>
                </div>
            </div>
        </div>
    );
}
