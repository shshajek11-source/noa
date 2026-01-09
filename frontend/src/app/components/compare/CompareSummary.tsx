'use client'

import { ComparisonCharacter } from '@/types/character'

interface CompareSummaryProps {
    charA?: ComparisonCharacter
    charB?: ComparisonCharacter
}

// 비교할 스탯 목록 - 실제 API에서 오는 스탯 기준
const COMPARE_STATS: { key: keyof ComparisonCharacter; label: string }[] = [
    { key: 'combat_power', label: 'NOA 점수' },
    { key: 'item_level', label: '아이템 레벨' },
    { key: 'attack_power', label: '위력' },
    { key: 'crit_strike', label: '민첩' },
    { key: 'accuracy', label: '정확' },
    { key: 'defense', label: '체력' },
    { key: 'magic_resist', label: '의지' },
    { key: 'magic_boost', label: '지식' },
    { key: 'evasion', label: '회피' },
]

export default function CompareSummary({ charA, charB }: CompareSummaryProps) {
    if (!charA || !charB) return null

    // 우세/열세 항목 계산 (값이 있는 스탯만)
    let winsA = 0
    let winsB = 0
    let draws = 0
    const validStats: string[] = []

    COMPARE_STATS.forEach(stat => {
        const valA = (charA[stat.key] as number) || 0
        const valB = (charB[stat.key] as number) || 0

        // 둘 다 0이면 비교에서 제외
        if (valA === 0 && valB === 0) return

        validStats.push(stat.label)

        if (valA > valB) winsA++
        else if (valB > valA) winsB++
        else draws++
    })

    const totalCompared = winsA + winsB + draws
    if (totalCompared === 0) return null

    const winner = winsA > winsB ? 'A' : winsB > winsA ? 'B' : 'draw'

    const colorA = charA.race_name === 'Elyos' ? '#4BC0C0' : '#FF6384'
    const colorB = charB.race_name === 'Elyos' ? '#4BC0C0' : '#FF6384'

    return (
        <div style={{
            maxWidth: '1200px',
            margin: '0 auto 2rem auto',
            padding: '1.5rem',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.05)'
        }}>
            <h3 style={{
                textAlign: 'center',
                margin: '0 0 1.5rem 0',
                color: '#fff',
                fontSize: '1rem',
                fontWeight: 600
            }}>
                비교 결과 요약
            </h3>

            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '2rem'
            }}>
                {/* 캐릭터 A 스코어 */}
                <div style={{
                    textAlign: 'center',
                    flex: 1,
                    maxWidth: '200px'
                }}>
                    <div style={{
                        fontSize: '2.5rem',
                        fontWeight: 800,
                        color: winner === 'A' ? colorA : '#6B7280',
                        textShadow: winner === 'A' ? `0 0 20px ${colorA}50` : 'none'
                    }}>
                        {winsA}
                    </div>
                    <div style={{
                        fontSize: '0.875rem',
                        color: '#9CA3AF',
                        marginTop: '0.25rem'
                    }}>
                        {charA.name}
                    </div>
                    {winner === 'A' && (
                        <div style={{
                            marginTop: '0.5rem',
                            padding: '0.25rem 0.75rem',
                            background: `${colorA}20`,
                            border: `1px solid ${colorA}`,
                            borderRadius: '12px',
                            color: colorA,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'inline-block'
                        }}>
                            우세
                        </div>
                    )}
                </div>

                {/* 중앙 구분 */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <div style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.875rem',
                        color: '#9CA3AF',
                        fontWeight: 600
                    }}>
                        VS
                    </div>
                    {draws > 0 && (
                        <div style={{
                            fontSize: '0.75rem',
                            color: '#6B7280'
                        }}>
                            무승부 {draws}
                        </div>
                    )}
                    <div style={{
                        fontSize: '0.7rem',
                        color: '#4B5563'
                    }}>
                        총 {totalCompared}개 항목 비교
                    </div>
                </div>

                {/* 캐릭터 B 스코어 */}
                <div style={{
                    textAlign: 'center',
                    flex: 1,
                    maxWidth: '200px'
                }}>
                    <div style={{
                        fontSize: '2.5rem',
                        fontWeight: 800,
                        color: winner === 'B' ? colorB : '#6B7280',
                        textShadow: winner === 'B' ? `0 0 20px ${colorB}50` : 'none'
                    }}>
                        {winsB}
                    </div>
                    <div style={{
                        fontSize: '0.875rem',
                        color: '#9CA3AF',
                        marginTop: '0.25rem'
                    }}>
                        {charB.name}
                    </div>
                    {winner === 'B' && (
                        <div style={{
                            marginTop: '0.5rem',
                            padding: '0.25rem 0.75rem',
                            background: `${colorB}20`,
                            border: `1px solid ${colorB}`,
                            borderRadius: '12px',
                            color: colorB,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'inline-block'
                        }}>
                            우세
                        </div>
                    )}
                </div>
            </div>

            {/* 승률 바 */}
            <div style={{
                marginTop: '1.5rem',
                height: '8px',
                borderRadius: '4px',
                background: 'rgba(255,255,255,0.1)',
                overflow: 'hidden',
                display: 'flex'
            }}>
                <div style={{
                    width: `${(winsA / totalCompared) * 100}%`,
                    background: colorA,
                    transition: 'width 0.5s ease-out'
                }} />
                <div style={{
                    width: `${(draws / totalCompared) * 100}%`,
                    background: '#6B7280',
                    transition: 'width 0.5s ease-out'
                }} />
                <div style={{
                    width: `${(winsB / totalCompared) * 100}%`,
                    background: colorB,
                    transition: 'width 0.5s ease-out'
                }} />
            </div>
        </div>
    )
}
