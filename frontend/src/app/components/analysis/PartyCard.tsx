import React from 'react';
import { User, Star } from 'lucide-react';

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
}

interface PartyCardProps {
    member: Member;
    index: number;
    spec?: DetailedSpec;
    isLoadingSpec?: boolean;
}

// 돌파 아이콘 컴포넌트 (메달/3.png 사용)
const BreakthroughIcon = ({ value, size = 'medium' }: { value: number; size?: 'small' | 'medium' | 'large' }) => {
    // 크기 2.25배 적용 (1.5 * 1.5)
    const iconSize = size === 'large' ? 81 : size === 'medium' ? 68 : 54;
    const fontSize = size === 'large' ? '27px' : size === 'medium' ? '24px' : '21px';

    return (
        <div style={{
            position: 'relative',
            width: `${iconSize}px`,
            height: `${iconSize}px`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: '-4px', // 왼쪽으로 4px 이동
        }}>
            <img
                src="/메달/3.png"
                alt="돌파"
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                }}
            />
            <span style={{
                position: 'absolute',
                top: '45%',
                left: 'calc(50% + 2px)',
                transform: 'translate(-50%, -50%)',
                zIndex: 1,
                color: '#fff',
                fontWeight: 'bold',
                fontSize,
                textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.5)',
            }}>
                {value}
            </span>
        </div>
    );
};

export default function PartyCard({ member, index, spec, isLoadingSpec }: PartyCardProps) {
    // MVP & Main Character Styling
    const isMvp = member.isMvp;
    const isMain = member.isMainCharacter;

    // 프로필 이미지 또는 아이콘 렌더링
    const renderProfileIcon = () => {
        const hasProfileImage = member.profileImage;

        if (hasProfileImage) {
            return (
                <div style={{
                    position: 'relative',
                    width: '40px', height: '40px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: isMvp ? '2px solid #F59E0B' : '1px solid #374151',
                    boxShadow: isMvp ? '0 4px 6px rgba(0,0,0,0.2)' : 'none',
                    flexShrink: 0
                }}>
                    <img
                        src={member.profileImage}
                        alt={member.name}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                        }}
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                    {isMvp && (
                        <div style={{
                            position: 'absolute',
                            bottom: -2, right: -2,
                            background: '#F59E0B',
                            borderRadius: '50%',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Star size={8} fill="white" color="white" />
                        </div>
                    )}
                </div>
            );
        }

        // 이미지 없을 때 기본 아이콘
        return (
            <div style={{
                width: '40px', height: '40px',
                borderRadius: '50%',
                background: isMvp ? 'linear-gradient(135deg, #F59E0B, #B45309)' : '#1F2937',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: isMvp ? '2px solid #FFF' : '1px solid #374151',
                color: isMvp ? 'white' : '#9CA3AF',
                boxShadow: isMvp ? '0 4px 6px rgba(0,0,0,0.2)' : 'none',
                flexShrink: 0
            }}>
                {isMvp ? <Star size={18} fill="white" /> : <User size={18} />}
            </div>
        );
    };

    const itemLevel = spec?.itemLevel || member.gearScore || 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* ACE 뱃지 - 카드 바깥 윗부분 */}
            {isMvp && (
                <div style={{
                    background: 'linear-gradient(135deg, #FACC15, #F59E0B)',
                    color: '#000',
                    fontWeight: 'bold',
                    padding: '4px 12px',
                    fontSize: '0.7rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    borderRadius: '8px 8px 0 0',
                    marginBottom: '-1px',
                }}>
                    <Star size={12} fill="#000" /> ACE
                </div>
            )}

            {/* 카드 본체 */}
            <div
                className="party-card-hover"
                style={{
                    position: 'relative',
                    background: isMvp
                        ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(0,0,0,0.2))'
                        : 'rgba(255, 255, 255, 0.02)',
                    border: isMvp ? '2px solid #F59E0B' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: isMvp ? '0 0 12px 12px' : '12px',
                    transition: 'all 0.2s',
                    boxShadow: isMvp
                        ? `0 0 30px rgba(250, 204, 21, 0.3), 0 0 60px rgba(250, 204, 21, 0.15)`
                        : 'none',
                    animation: `fadeInUp 0.5s ease-out forwards ${index * 50}ms`,
                    opacity: 0,
                    overflow: 'hidden',
                }}
            >
                <style>{`
                    @keyframes fadeInUp {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .party-card-hover:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 8px 25px rgba(0,0,0,0.3) !important;
                    }
                `}</style>

                {/* 내캐릭터 표시 - 오른쪽 상단 */}
                {isMain && (
                    <div style={{
                        position: 'absolute',
                        top: '6px',
                        right: '8px',
                        background: 'rgba(250, 204, 21, 0.2)',
                        border: '1px solid rgba(250, 204, 21, 0.5)',
                        color: '#FACC15',
                        fontSize: '0.55rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        zIndex: 10,
                    }}>
                        내캐릭터
                    </div>
                )}

                {/* 상단: 기본 정보 */}
                <div style={{
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                }}>
                    {/* Rank # */}
                    <div style={{
                        fontSize: '0.8rem', fontWeight: 700,
                        color: isMvp ? '#F59E0B' : 'var(--text-secondary)',
                        width: '1rem', textAlign: 'center',
                        flexShrink: 0
                    }}>
                        {index + 1}
                    </div>

                    {/* Icon */}
                    {renderProfileIcon()}

                    {/* Name & Meta */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                            <span style={{
                                color: isMvp ? '#FDE68A' : 'var(--text-main)',
                                fontWeight: 600, fontSize: '0.85rem',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                            }}>
                                {member.name}
                            </span>
                        </div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.65rem',
                            color: 'var(--text-secondary)',
                            flexWrap: 'wrap'
                        }}>
                            <span>{member.server}</span>
                            <span style={{ opacity: 0.3 }}>·</span>
                            <span>{member.class}</span>
                        </div>
                        {/* 레벨 + 아이템레벨 (같은 줄, 크게) */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginTop: '2px'
                        }}>
                            <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: 'var(--text-main)'
                            }}>
                                Lv.{member.level || '?'}
                            </span>
                            <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: '#60A5FA'
                            }}>
                                iLv.{itemLevel}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 중앙: HITON 전투력 + 돌파 (나란히 정렬) */}
                {spec && (
                    <div style={{
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        background: isMvp
                            ? 'linear-gradient(135deg, rgba(250, 204, 21, 0.15), rgba(250, 204, 21, 0.05))'
                            : 'rgba(0, 0, 0, 0.15)',
                    }}>
                        {/* HITON 전투력 */}
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                        }}>
                            <div style={{
                                fontSize: '0.6rem',
                                color: 'var(--text-secondary)',
                                marginBottom: '2px',
                                letterSpacing: '0.5px',
                            }}>
                                HITON
                            </div>
                            <div style={{
                                fontSize: '1.5rem',
                                fontWeight: 800,
                                color: '#FACC15',
                                fontFamily: '"Pretendard", "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                                textShadow: isMvp ? '0 0 12px rgba(250, 204, 21, 0.6)' : '0 1px 2px rgba(0,0,0,0.3)',
                                lineHeight: 1,
                            }}>
                                {(spec.hitonCP || member.cp).toLocaleString()}
                            </div>
                        </div>

                        {/* 구분선 */}
                        <div style={{
                            width: '1px',
                            height: '40px',
                            background: 'rgba(255, 255, 255, 0.15)',
                        }} />

                        {/* 돌파 */}
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                        }}>
                            <div style={{
                                fontSize: '0.6rem',
                                color: 'var(--text-secondary)',
                                marginBottom: '2px',
                            }}>
                                돌파
                            </div>
                            <BreakthroughIcon value={spec.totalBreakthrough} size="medium" />
                        </div>
                    </div>
                )}

                {/* 스펙 없을 때 기본 전투력 표시 */}
                {!spec && !isLoadingSpec && (
                    <div style={{
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        background: 'rgba(0, 0, 0, 0.15)',
                    }}>
                        {/* HITON 전투력 */}
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                        }}>
                            <div style={{
                                fontSize: '0.6rem',
                                color: 'var(--text-secondary)',
                                marginBottom: '2px',
                                letterSpacing: '0.5px',
                            }}>
                                HITON
                            </div>
                            <div style={{
                                fontSize: '1.5rem',
                                fontWeight: 800,
                                color: '#FACC15',
                                fontFamily: '"Pretendard", "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
                                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                                lineHeight: 1,
                            }}>
                                {member.cp.toLocaleString()}
                            </div>
                        </div>

                        {/* 구분선 */}
                        <div style={{
                            width: '1px',
                            height: '40px',
                            background: 'rgba(255, 255, 255, 0.15)',
                        }} />

                        {/* 돌파 */}
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                        }}>
                            <div style={{
                                fontSize: '0.6rem',
                                color: 'var(--text-secondary)',
                                marginBottom: '2px',
                            }}>
                                돌파
                            </div>
                            <BreakthroughIcon value={0} size="medium" />
                        </div>
                    </div>
                )}

                {/* 하단: 능력치 (스펙 데이터가 있을 때만) - 3x2 그리드 */}
                {spec && (
                    <div style={{
                        padding: '8px 10px',
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '4px 6px',
                        fontSize: '0.65rem',
                    }}>
                        <StatItem label="공격력" value={spec.stats.attackPower} />
                        <StatItem label="전투속도" value={spec.stats.attackSpeed > 0 ? `${spec.stats.attackSpeed.toFixed(2)}` : '-'} />
                        <StatItem label="무기피증" value={spec.stats.weaponDamageAmp > 0 ? `${spec.stats.weaponDamageAmp.toFixed(1)}%` : '-'} />
                        <StatItem label="피해증폭" value={spec.stats.damageAmp > 0 ? `${spec.stats.damageAmp.toFixed(1)}%` : '-'} />
                        <StatItem label="치명타" value={spec.stats.criticalRate > 0 ? `${spec.stats.criticalRate.toFixed(1)}%` : '-'} />
                        <StatItem label="다단히트" value={spec.stats.multiHitRate > 0 ? `${spec.stats.multiHitRate.toFixed(1)}%` : '-'} />
                    </div>
                )}

                {/* 로딩 상태 */}
                {isLoadingSpec && !spec && (
                    <div style={{
                        padding: '10px',
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                        textAlign: 'center',
                        fontSize: '0.65rem',
                        color: 'var(--text-secondary)',
                    }}>
                        스펙 로딩 중...
                    </div>
                )}
            </div>
        </div>
    );
}

// 능력치 아이템 컴포넌트
function StatItem({ label, value }: { label: string; value: string }) {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '2px 0',
        }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.6rem' }}>{label}</span>
            <span style={{ color: 'var(--text-main)', fontWeight: 500, fontFamily: 'monospace', fontSize: '0.65rem' }}>{value}</span>
        </div>
    );
}
