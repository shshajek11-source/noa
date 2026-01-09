import React from 'react';
import { ComparisonCharacter, ComparisonEquipmentItem } from '@/types/character';
import { Lightbulb, AlertTriangle, ArrowUpCircle, CheckCircle } from 'lucide-react';

interface CompareInsightProps {
    charA: ComparisonCharacter;
    charB: ComparisonCharacter;
}

export default function CompareInsight({ charA, charB }: CompareInsightProps) {
    if (!charA || !charB) return null;

    // --- 1. Stat Analysis Logic ---
    const analyzeStats = () => {
        const diffs = [];
        const stats = [
            { key: 'combat_power', label: '전투력', threshold: 0.1 }, // 10% diff
            { key: 'attack_power', label: '공격력', threshold: 0.15 },
            { key: 'magic_boost', label: '마법 증폭력', threshold: 0.15 },
            { key: 'accuracy', label: '명중', threshold: 0.2 },
            { key: 'crit_strike', label: '치명타', threshold: 0.2 },
            { key: 'pvp_attack', label: 'PvP 공격력', threshold: 0.05 },
        ] as const;

        for (const stat of stats) {
            // Use type assertion or index signature if needed, but ComparisonCharacter has these keys
            const valA = (charA as any)[stat.key] || 0;
            const valB = (charB as any)[stat.key] || 0;

            if (valB > valA) {
                const percentDiff = valA > 0 ? (valB - valA) / valA : 1.0;
                if (percentDiff >= stat.threshold) {
                    diffs.push({
                        label: stat.label,
                        valA,
                        valB,
                        diff: valB - valA,
                        percent: Math.round(percentDiff * 100)
                    });
                }
            }
        }
        // Return top 3 biggest gaps
        return diffs.sort((a, b) => b.percent - a.percent).slice(0, 3);
    };

    // --- 2. Equipment Analysis Logic ---
    const analyzeEquipment = () => {
        const issues = [];

        // Tier / Grade Check for Main Slots
        const importantSlots = ['Weapon', 'Chest', 'Pants', 'Shoulders', 'Gloves', 'Shoes'];

        for (const slot of importantSlots) {
            const itemA = charA.equipment.find(i => i.slot.includes(slot) || i.category?.includes(slot));
            const itemB = charB.equipment.find(i => i.slot.includes(slot) || i.category?.includes(slot));

            if (itemB && itemA) {
                // Check Enhancement
                const enchantA = parseInt(itemA.enhancement.replace('+', '')) || 0;
                const enchantB = parseInt(itemB.enhancement.replace('+', '')) || 0;

                if (enchantB > enchantA + 3) { // Significant enchant gap
                    issues.push({
                        type: 'Enhance',
                        slot,
                        message: `${slot} 강화 수치가 ${enchantB - enchantA}단계 낮습니다.`
                    });
                }
            } else if (itemB && !itemA) {
                issues.push({
                    type: 'Missing',
                    slot,
                    message: `${slot} 장비가 비어있거나 정보가 없습니다.`
                });
            }
        }
        return issues.slice(0, 3);
    };

    const statGaps = analyzeStats();
    const equipIssues = analyzeEquipment();
    const noMajorIssues = statGaps.length === 0 && equipIssues.length === 0;

    return (
        <div style={{
            background: 'rgba(56, 189, 248, 0.05)',
            border: '1px solid rgba(56, 189, 248, 0.15)',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '2rem',
            backdropFilter: 'blur(10px)',
            maxWidth: '1200px',
            margin: '0 auto 2rem auto'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
                <div style={{
                    background: '#0EA5E9',
                    padding: '8px',
                    borderRadius: '50%',
                    boxShadow: '0 0 10px rgba(14, 165, 233, 0.4)'
                }}>
                    <Lightbulb size={20} color="#fff" />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#E0F2FE' }}>
                    AI Comparative Insight
                </h3>
            </div>

            {noMajorIssues ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#4ADE80' }}>
                    <CheckCircle size={24} />
                    <span>놀랍습니다! 비교 대상보다 대부분의 지표가 우수하거나 비슷합니다.</span>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>

                    {/* Stat Gaps */}
                    {statGaps.length > 0 && (
                        <div>
                            <h4 style={{ color: '#94A3B8', fontSize: '0.9rem', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                주요 스탯 차이
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                {statGaps.map((gap, idx) => (
                                    <div key={idx} style={{
                                        background: 'rgba(0,0,0,0.2)',
                                        padding: '0.8rem',
                                        borderRadius: '8px',
                                        borderLeft: '3px solid #F43F5E'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                                            <span style={{ color: '#E2E8F0', fontWeight: 600 }}>{gap.label}</span>
                                            <span style={{ color: '#F43F5E', fontWeight: 700 }}>-{gap.percent}%</span>
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>
                                            {charA.name}: {gap.valA.toLocaleString()} vs {charB.name}: {gap.valB.toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Equipment Advice */}
                    {equipIssues.length > 0 && (
                        <div>
                            <h4 style={{ color: '#94A3B8', fontSize: '0.9rem', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                장비 개선 제안
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                {equipIssues.map((issue, idx) => (
                                    <div key={idx} style={{
                                        background: 'rgba(0,0,0,0.2)',
                                        padding: '0.8rem',
                                        borderRadius: '8px',
                                        borderLeft: '3px solid #F59E0B',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.8rem'
                                    }}>
                                        <ArrowUpCircle size={20} color="#F59E0B" />
                                        <div style={{ fontSize: '0.9rem', color: '#E2E8F0' }}>
                                            {issue.message}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div style={{
                marginTop: '1.5rem',
                fontSize: '0.85rem',
                color: '#64748B',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                paddingTop: '0.8rem',
                display: 'flex',
                gap: '0.5rem'
            }}>
                <AlertTriangle size={14} />
                <span>분석 결과는 현재 장착 중인 장비와 스탯만을 기준으로 합니다. (세트 효과 및 마석 포함)</span>
            </div>
        </div>
    );
}
