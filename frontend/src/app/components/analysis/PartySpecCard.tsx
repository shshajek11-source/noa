import React from 'react';

export interface CharacterStats {
    attackPower: string;      // 공격력 (298~383 형식)
    attackSpeed: number;      // 전투속도
    weaponDamageAmp: number;  // 무기피해증폭 %
    damageAmp: number;        // 피해증폭 %
    criticalRate: number;     // 치명타 %
    multiHitRate: number;     // 다단히트적중 %
}

export interface CharacterSpec {
    name: string;
    server: string;
    className: string;
    level: number;
    profileImage?: string;
    hitonCP: number;           // HITON 전투력
    itemLevel: number;         // 아이템 레벨
    totalBreakthrough: number; // 돌파 총 합
    stats: CharacterStats;
}

interface PartySpecCardProps {
    spec: CharacterSpec;
    isMvp: boolean;
}

// 마름모 안에 숫자 표시 컴포넌트
const BreakthroughDiamond = ({ value }: { value: number }) => (
    <div style={{
        position: 'relative',
        width: '36px',
        height: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    }}>
        <div style={{
            position: 'absolute',
            width: '28px',
            height: '28px',
            background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
            transform: 'rotate(45deg)',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.5)',
        }} />
        <span style={{
            position: 'relative',
            zIndex: 1,
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '12px',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
        }}>
            {value}
        </span>
    </div>
);

export default function PartySpecCard({ spec, isMvp }: PartySpecCardProps) {
    const cardStyle: React.CSSProperties = isMvp ? {
        border: '2px solid #FACC15',
        boxShadow: `
            0 0 30px rgba(250, 204, 21, 0.5),
            0 0 60px rgba(250, 204, 21, 0.3),
            0 0 90px rgba(250, 204, 21, 0.2),
            inset 0 0 30px rgba(250, 204, 21, 0.1)
        `,
        background: 'linear-gradient(135deg, rgba(250, 204, 21, 0.15) 0%, rgba(0, 0, 0, 0) 40%, var(--bg-card))',
        borderRadius: '16px',
        overflow: 'hidden',
    } : {
        border: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'var(--bg-card)',
        borderRadius: '16px',
        overflow: 'hidden',
    };

    return (
        <div style={cardStyle}>
            {/* MVP 뱃지 */}
            {isMvp && (
                <div style={{
                    background: 'linear-gradient(135deg, #FACC15, #F59E0B)',
                    color: '#000',
                    fontWeight: 'bold',
                    padding: '6px 16px',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                }}>
                    <span style={{ fontSize: '1.1rem' }}>👑</span>
                    MVP
                </div>
            )}

            {/* 상단: 프로필 정보 */}
            <div style={{
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
                {/* 프로필 이미지 */}
                <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.1)',
                    overflow: 'hidden',
                    flexShrink: 0,
                }}>
                    {spec.profileImage ? (
                        <img
                            src={spec.profileImage}
                            alt={spec.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : (
                        <div style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-secondary)',
                            fontSize: '1.2rem',
                        }}>
                            ?
                        </div>
                    )}
                </div>

                {/* 이름, 서버, 직업, 아이템레벨 */}
                <div style={{ flex: 1 }}>
                    <div style={{
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        color: isMvp ? '#FACC15' : 'var(--text-main)',
                    }}>
                        {spec.name}
                    </div>
                    <div style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)',
                        marginTop: '2px',
                    }}>
                        {spec.server} · {spec.className} · Lv.{spec.level}
                    </div>
                    <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        marginTop: '2px',
                    }}>
                        아이템레벨 <span style={{ color: '#60A5FA', fontWeight: 600 }}>{spec.itemLevel}</span>
                    </div>
                </div>
            </div>

            {/* 중앙: HITON 전투력 + 돌파 (2열 그리드) */}
            <div style={{
                padding: '16px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
                {/* HITON 전투력 */}
                <div style={{
                    background: isMvp
                        ? 'linear-gradient(135deg, rgba(250, 204, 21, 0.2), rgba(250, 204, 21, 0.1))'
                        : 'rgba(250, 204, 21, 0.1)',
                    border: isMvp
                        ? '1px solid rgba(250, 204, 21, 0.5)'
                        : '1px solid rgba(250, 204, 21, 0.3)',
                    borderRadius: '10px',
                    padding: '12px',
                    textAlign: 'center',
                }}>
                    <div style={{
                        fontSize: '0.7rem',
                        color: 'var(--text-secondary)',
                        marginBottom: '4px',
                    }}>
                        HITON 전투력
                    </div>
                    <div style={{
                        fontSize: '1.4rem',
                        fontWeight: 'bold',
                        color: '#FACC15',
                        textShadow: isMvp ? '0 0 10px rgba(250, 204, 21, 0.5)' : 'none',
                    }}>
                        {spec.hitonCP.toLocaleString()}
                    </div>
                </div>

                {/* 돌파 */}
                <div style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '10px',
                    padding: '12px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <div style={{
                        fontSize: '0.7rem',
                        color: 'var(--text-secondary)',
                        marginBottom: '4px',
                    }}>
                        돌파
                    </div>
                    <BreakthroughDiamond value={spec.totalBreakthrough} />
                </div>
            </div>

            {/* 하단: 능력치 목록 */}
            <div style={{
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                fontSize: '0.8rem',
            }}>
                <StatRow label="공격력" value={spec.stats.attackPower} />
                <StatRow label="전투속도" value={spec.stats.attackSpeed.toFixed(1)} />
                <StatRow label="무기피해증폭" value={`${spec.stats.weaponDamageAmp.toFixed(1)}%`} />
                <StatRow label="피해증폭" value={`${spec.stats.damageAmp.toFixed(1)}%`} />
                <StatRow label="치명타" value={`${spec.stats.criticalRate.toFixed(1)}%`} />
                <StatRow label="다단히트적중" value={`${spec.stats.multiHitRate.toFixed(1)}%`} />
            </div>
        </div>
    );
}

// 능력치 행 컴포넌트
function StatRow({ label, value }: { label: string; value: string }) {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '4px 0',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        }}>
            <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
            <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{value}</span>
        </div>
    );
}
