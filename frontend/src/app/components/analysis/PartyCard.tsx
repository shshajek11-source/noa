import React, { useState } from 'react';
import { User, Star, ChevronDown } from 'lucide-react';
import type { ServerCandidate, PartyMember } from '@/hooks/usePartyScanner';

// 상세 스펙 정보
export interface DetailedSpec {
    hitonCP: number;
    itemLevel: number;
    totalBreakthrough: number;
    stats: {
        attackPower: string;
        attackSpeed: number;
        weaponDamageAmp: number;
        damageAmp: number;
        criticalRate: number;
        multiHitRate: number;
    };
}

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
    profileImage?: string;
    characterId?: string;
    isFromDb?: boolean;
    race?: string; // 종족 추가
    pvpScore?: number; // PVP 점수 추가
}

// 선택 정보
interface SelectionInfo {
    type: 'server' | 'name';
    ocrName: string;
    candidates: ServerCandidate[];
}

interface PartyCardProps {
    member: Member;
    index: number;
    spec?: DetailedSpec;
    isLoadingSpec?: boolean;
    selectionInfo?: SelectionInfo;
    onSelect?: (selectedServer: string, characterData: PartyMember) => void;
}

export default function PartyCard({ member, index, spec, isLoadingSpec, selectionInfo, onSelect }: PartyCardProps) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const isMvp = member.isMvp;
    const isMain = member.isMainCharacter;
    const hasSelection = selectionInfo && selectionInfo.candidates.length > 0;

    // 종족 색상 결정
    const getRaceColor = (race?: string) => {
        if (!race) return 'var(--text-secondary)';
        const r = race.toLowerCase();
        if (r.includes('elyos') || r.includes('천족') || r === '1' || r === '0') return '#2DD4BF'; // Teal
        if (r.includes('asmodian') || r.includes('마족') || r === '2') return '#A78BFA'; // Violet
        return 'var(--text-secondary)';
    };

    // 종족 텍스트
    const getRaceText = (race?: string) => {
        if (!race) return '';
        const r = race.toLowerCase();
        if (r.includes('elyos') || r.includes('천족') || r === '1' || r === '0') return '천족';
        if (r.includes('asmodian') || r.includes('마족') || r === '2') return '마족';
        return race;
    };

    const raceColor = getRaceColor(member.race);
    const raceText = getRaceText(member.race);

    // PVP 점수 (API 없으면 0)
    const pvpScore = member.pvpScore || 0;
    // PVE 점수 (Hiton CP)
    const pveScore = spec?.hitonCP || member.cp;

    // 프로필 아이콘
    const renderProfileIcon = () => {
        if (member.profileImage) {
            return (
                <div style={{
                    position: 'relative',
                    width: '42px', height: '42px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: isMvp ? '2px solid #F59E0B' : '1px solid #374151',
                    flexShrink: 0
                }}>
                    <img
                        src={member.profileImage}
                        alt={member.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                </div>
            );
        }
        return (
            <div style={{
                width: '42px', height: '42px',
                borderRadius: '50%',
                background: '#1F2937',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid #374151',
                color: '#9CA3AF',
                flexShrink: 0
            }}>
                <User size={20} />
            </div>
        );
    };

    return (
        <div
            className="party-card-hover"
            style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                marginBottom: '8px',
                animation: `fadeInUp 0.3s ease-out forwards ${index * 50}ms`,
                opacity: 0,
                position: 'relative',
                gap: '16px'
            }}
        >
            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .party-card-hover:hover {
                    background: rgba(255, 255, 255, 0.04) !important;
                    border-color: rgba(255, 255, 255, 0.15) !important;
                }
            `}</style>

            {/* 1. Rank & Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                    width: '28px', height: '28px',
                    background: '#1F2937',
                    borderRadius: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#E5E7EB', fontWeight: 700, fontSize: '0.9rem'
                }}>
                    {index + 1}
                </div>
                {renderProfileIcon()}
            </div>

            {/* 2. Main Info (Name, Class, Server) */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                        fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF',
                        letterSpacing: '-0.02em'
                    }}>
                        {member.name}
                    </span>
                    {isMvp && <div style={{ background: '#F59E0B', padding: '1px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold', color: '#000' }}>ACE</div>}
                    {isMain && <div style={{ border: '1px solid #FACC15', color: '#FACC15', padding: '0px 4px', borderRadius: '4px', fontSize: '0.65rem' }}>ME</div>}
                </div>

                <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    fontSize: '0.85rem', color: '#9CA3AF'
                }}>
                    <span>{member.server}</span>
                    <span style={{ width: '3px', height: '3px', background: '#4B5563', borderRadius: '50%' }} />
                    <span style={{ color: raceColor, fontWeight: 500 }}>{raceText}</span>
                    <span style={{ width: '3px', height: '3px', background: '#4B5563', borderRadius: '50%' }} />
                    <span>{member.class}</span>
                </div>
            </div>

            {/* 3. Stats (Right Aligned) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', minWidth: '100px' }}>
                {/* PVE Score */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280' }}>PVE</span>
                    <span style={{
                        fontSize: '1rem', fontWeight: 700,
                        color: '#4ADE80',
                        fontFamily: 'monospace'
                    }}>
                        {pveScore.toLocaleString()}
                    </span>
                </div>

                {/* PVP Score */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280' }}>PVP</span>
                    <span style={{
                        fontSize: '0.9rem', fontWeight: 600,
                        color: pvpScore > 0 ? '#EF4444' : '#6B7280',
                        fontFamily: 'monospace'
                    }}>
                        {pvpScore.toLocaleString()}
                    </span>
                </div>
            </div>

            {/* Selection Overlay (Redesigned Dropdown) */}
            {hasSelection && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '12px',
                    background: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(2px)',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div style={{ position: 'relative', minWidth: '200px' }}>
                        {/* Dropdown Trigger */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsDropdownOpen(!isDropdownOpen);
                            }}
                            style={{
                                width: '100%',
                                padding: '10px 16px',
                                background: 'rgba(17, 24, 39, 0.95)',
                                border: '1px solid #F59E0B',
                                borderRadius: '8px',
                                color: '#F59E0B',
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <span>{selectionInfo.type === 'name' ? '캐릭터 선택' : '서버를 선택해주세요'}</span>
                            <ChevronDown size={16} style={{
                                transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0)',
                                transition: 'transform 0.2s'
                            }} />
                        </button>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                            <div style={{
                                position: 'absolute',
                                top: 'calc(100% + 8px)',
                                left: 0,
                                right: 0,
                                background: '#111827',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                borderRadius: '8px',
                                padding: '4px',
                                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
                                zIndex: 20,
                                maxHeight: '240px',
                                overflowY: 'auto'
                            }}>
                                {selectionInfo.candidates.map((candidate, idx) => (
                                    <button
                                        key={idx}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (candidate.characterData && onSelect) {
                                                onSelect(candidate.server, candidate.characterData);
                                                setIsDropdownOpen(false);
                                            }
                                        }}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '10px 12px',
                                            background: 'transparent',
                                            border: 'none',
                                            borderRadius: '4px',
                                            color: '#E5E7EB',
                                            fontSize: '0.85rem',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'background 0.15s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontWeight: 500 }}>
                                                {selectionInfo.type === 'name'
                                                    ? (candidate.alternativeName || candidate.characterData?.name)
                                                    : candidate.server
                                                }
                                            </span>
                                            {candidate.characterData?.server && selectionInfo.type === 'name' && (
                                                <span style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{candidate.characterData.server}</span>
                                            )}
                                        </div>
                                        {candidate.characterData && (
                                            <span style={{
                                                color: '#F59E0B',
                                                fontSize: '0.75rem',
                                                background: 'rgba(245, 158, 11, 0.1)',
                                                padding: '2px 6px',
                                                borderRadius: '4px'
                                            }}>
                                                iLv.{candidate.characterData.gearScore}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
