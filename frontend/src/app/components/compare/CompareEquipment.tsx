import React from 'react';
import EquipmentCard from '../EquipmentCard';
import { ComparisonCharacter, ComparisonEquipmentItem } from '@/types/character';

interface CompareEquipmentProps {
    charA?: ComparisonCharacter;
    charB?: ComparisonCharacter;
}

const WEAPON_ARMOR_SLOTS = [
    '주무기', '보조무기',
    '투구', '견갑', '흉갑', '장갑', '각반', '장화',
    '망토', '허리띠'
];

const ACCESSORY_SLOTS = [
    '목걸이', '귀걸이1', '귀걸이2',
    '반지1', '반지2', '팔찌1', '팔찌2',
    '아뮬렛', '룬1', '룬2'
];

const SPECIAL_SLOTS = [
    '날개', '펫'
];

// 등급 순위 매핑 (높을수록 좋음)
const GRADE_RANK: Record<string, number> = {
    'Common': 1,
    'Rare': 2,
    'Legend': 3,
    'Unique': 4,
    'Epic': 5,
    'Mythic': 6
}

// 장비 점수 계산 (티어, 등급, 강화, 돌파 등 종합)
const calculateItemScore = (item: ComparisonEquipmentItem | undefined): number => {
    if (!item) return 0

    let score = 0

    // 티어 점수 (1000점 단위)
    score += (item.tier || 0) * 1000

    // 등급 점수 (100점 단위)
    score += (GRADE_RANK[item.grade || ''] || 0) * 100

    // 강화 점수 (10점 단위)
    const enhancement = parseInt(item.enhancement?.replace('+', '') || '0')
    score += enhancement * 10

    // 돌파 점수 (50점 단위)
    score += (item.breakthrough || 0) * 50

    // 아이템 레벨 점수 (1점 단위)
    score += item.itemLevel || 0

    // 영혼 각인 점수
    if (item.soulEngraving) {
        const gradeBonus: Record<string, number> = { 'S': 50, 'A': 40, 'B': 30, 'C': 20, 'D': 10 }
        score += gradeBonus[item.soulEngraving.grade] || 0
        score += (item.soulEngraving.percentage || 0) / 10
    }

    return score
}

export default function CompareEquipment({ charA, charB }: CompareEquipmentProps) {

    const renderSlotRow = (slot: string) => {
        const itemA = charA?.equipment?.find(e => e.slot === slot);
        const itemB = charB?.equipment?.find(e => e.slot === slot);

        // 둘 다 없으면 표시하지 않음
        if (!itemA && !itemB) return null;

        // 종합 점수 기반 비교
        const scoreA = calculateItemScore(itemA);
        const scoreB = calculateItemScore(itemB);

        let winner: 'A' | 'B' | null = null;
        if (scoreA > 0 && scoreB > 0) {
            if (scoreA > scoreB) winner = 'A';
            else if (scoreB > scoreA) winner = 'B';
        }

        return (
            <div key={slot} style={{
                display: 'grid',
                gridTemplateColumns: '1fr 60px 1fr',
                gap: '1rem',
                marginBottom: '0.5rem',
                alignItems: 'center'
            }}>
                {/* Char A Item */}
                <div style={{ position: 'relative' }}>
                    <EquipmentCard slot={slot} item={itemA} />
                    {winner === 'A' && (
                        <div style={{
                            position: 'absolute', top: -5, right: -5,
                            background: '#10B981', color: '#fff', fontSize: '0.6rem', padding: '1px 4px', borderRadius: '4px'
                        }}>Better</div>
                    )}
                </div>

                {/* Slot Label */}
                <div style={{
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    color: '#6B7280',
                    fontWeight: 500
                }}>
                    {slot}
                </div>

                {/* Char B Item */}
                <div style={{ position: 'relative' }}>
                    <EquipmentCard slot={slot} item={itemB} />
                    {winner === 'B' && (
                        <div style={{
                            position: 'absolute', top: -5, left: -5,
                            background: '#10B981', color: '#fff', fontSize: '0.6rem', padding: '1px 4px', borderRadius: '4px'
                        }}>Better</div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '16px',
            padding: '1.5rem',
            border: '1px solid rgba(255,255,255,0.05)',
            backdropFilter: 'blur(10px)',
            marginTop: '2rem'
        }}>
            <h3 style={{
                margin: '0 0 1.5rem 0',
                textAlign: 'center',
                color: 'var(--brand-primary)', // Using CSS variable or fallback
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem'
            }}>
                <span style={{ height: '1px', background: 'rgba(255,255,255,0.1)', flex: 1 }}></span>
                Equipment Comparison
                <span style={{ height: '1px', background: 'rgba(255,255,255,0.1)', flex: 1 }}></span>
            </h3>

            <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ color: '#9CA3AF', fontSize: '0.8rem', marginBottom: '1rem', borderBottom: '1px solid #374151', paddingBottom: '0.5rem' }}>Weapons & Armor</h4>
                {WEAPON_ARMOR_SLOTS.map(slot => renderSlotRow(slot))}
            </div>

            <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ color: '#9CA3AF', fontSize: '0.8rem', marginBottom: '1rem', borderBottom: '1px solid #374151', paddingBottom: '0.5rem' }}>Accessories</h4>
                {ACCESSORY_SLOTS.map(slot => renderSlotRow(slot))}
            </div>

            <div>
                <h4 style={{ color: '#9CA3AF', fontSize: '0.8rem', marginBottom: '1rem', borderBottom: '1px solid #374151', paddingBottom: '0.5rem' }}>Special</h4>
                {SPECIAL_SLOTS.map(slot => renderSlotRow(slot))}
            </div>
        </div>
    );
}
