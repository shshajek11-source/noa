import React from 'react';
import PartySpecCard, { CharacterSpec } from './PartySpecCard';

interface PartySpecViewProps {
    specs: CharacterSpec[];
    isLoading?: boolean;
}

// 마름모 안에 숫자 표시 컴포넌트 (요약용)
const BreakthroughDiamond = ({ value, size = 'normal' }: { value: number; size?: 'normal' | 'large' }) => {
    const diamondSize = size === 'large' ? 40 : 32;
    const fontSize = size === 'large' ? '14px' : '12px';

    return (
        <div style={{
            position: 'relative',
            width: `${diamondSize + 8}px`,
            height: `${diamondSize + 8}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            <div style={{
                position: 'absolute',
                width: `${diamondSize}px`,
                height: `${diamondSize}px`,
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
                fontSize,
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            }}>
                {value}
            </span>
        </div>
    );
};

export default function PartySpecView({ specs, isLoading }: PartySpecViewProps) {
    if (isLoading) {
        return (
            <div style={{
                padding: '2rem',
                textAlign: 'center',
                color: 'var(--text-secondary)',
            }}>
                <div style={{ marginBottom: '1rem' }}>스펙 정보를 불러오는 중...</div>
                <div style={{
                    width: '40px',
                    height: '40px',
                    border: '3px solid rgba(250, 204, 21, 0.2)',
                    borderTopColor: '#FACC15',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto',
                }} />
                <style>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    if (!specs || specs.length === 0) {
        return null;
    }

    // MVP 찾기 (HITON 전투력 최고)
    const maxHitonCP = Math.max(...specs.map(s => s.hitonCP));
    const mvpIndex = specs.findIndex(s => s.hitonCP === maxHitonCP);

    // 파티 통계 계산
    const totalHitonCP = specs.reduce((sum, s) => sum + s.hitonCP, 0);
    const avgHitonCP = Math.round(totalHitonCP / specs.length);
    const totalBreakthrough = specs.reduce((sum, s) => sum + s.totalBreakthrough, 0);
    const avgBreakthrough = Math.round(totalBreakthrough / specs.length);

    return (
        <div style={{ marginTop: '2rem' }}>
            {/* 헤더 */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.8rem',
                marginBottom: '1.5rem',
            }}>
                <div style={{
                    width: '4px',
                    height: '24px',
                    background: '#FACC15',
                    borderRadius: '2px',
                }} />
                <h2 style={{
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    color: 'var(--text-main)',
                    margin: 0,
                }}>
                    파티원 스펙 상세
                </h2>
            </div>

            {/* 스펙 카드 그리드 */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem',
            }}>
                {specs.map((spec, idx) => (
                    <PartySpecCard
                        key={`spec-${idx}`}
                        spec={spec}
                        isMvp={idx === mvpIndex && specs.length > 1}
                    />
                ))}
            </div>

            {/* 파티 요약 */}
            <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '1.5rem',
            }}>
                <h3 style={{
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    color: 'var(--text-main)',
                    marginTop: 0,
                    marginBottom: '1rem',
                    paddingBottom: '0.75rem',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                }}>
                    파티 요약
                </h3>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem',
                }}>
                    {/* HITON 총합 */}
                    <div style={{
                        background: 'rgba(250, 204, 21, 0.1)',
                        border: '1px solid rgba(250, 204, 21, 0.3)',
                        borderRadius: '12px',
                        padding: '1rem',
                        textAlign: 'center',
                    }}>
                        <div style={{
                            fontSize: '0.8rem',
                            color: 'var(--text-secondary)',
                            marginBottom: '8px',
                        }}>
                            HITON 총합
                        </div>
                        <div style={{
                            fontSize: '1.8rem',
                            fontWeight: 'bold',
                            color: '#FACC15',
                        }}>
                            {totalHitonCP.toLocaleString()}
                        </div>
                        <div style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            marginTop: '6px',
                        }}>
                            평균: {avgHitonCP.toLocaleString()}
                        </div>
                    </div>

                    {/* 돌파 총합 */}
                    <div style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '12px',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <div style={{
                            fontSize: '0.8rem',
                            color: 'var(--text-secondary)',
                            marginBottom: '8px',
                        }}>
                            돌파 총합
                        </div>
                        <BreakthroughDiamond value={totalBreakthrough} size="large" />
                        <div style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            marginTop: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                        }}>
                            평균: <BreakthroughDiamond value={avgBreakthrough} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
