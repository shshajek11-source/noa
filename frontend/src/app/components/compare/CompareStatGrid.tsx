import { memo } from 'react'

interface StatRowProps {
    label: string
    valueA: number
    valueB: number
    format?: (val: number) => string
}

const StatRow = memo(function StatRow({ label, valueA, valueB, format = (v) => v.toLocaleString() }: StatRowProps) {
    // 둘 다 0이면 표시하지 않음
    if (valueA === 0 && valueB === 0) return null

    const diff = valueA - valueB
    const winA = diff > 0
    const winB = diff < 0 // A < B

    // Calculate percentages for bar visualization
    const maxVal = Math.max(valueA, valueB) || 1
    const percentA = (valueA / maxVal) * 100
    const percentB = (valueB / maxVal) * 100

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 140px 1fr',
            padding: '0.5rem 0',
            alignItems: 'center',
            fontSize: '0.9rem',
            position: 'relative'
        }}>
            {/* Value A (Right Aligned) */}
            <div style={{
                position: 'relative',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: '1rem'
            }}>
                <div style={{
                    position: 'absolute',
                    top: 0, right: 0, bottom: 0,
                    width: `${percentA}%`,
                    background: winA ? 'linear-gradient(90deg, transparent 0%, rgba(75, 192, 192, 0.2) 100%)' : 'rgba(255,255,255,0.05)',
                    borderRight: winA ? '2px solid #4BC0C0' : 'none',
                    borderRadius: '4px 0 0 4px',
                    transition: 'width 0.5s ease-out'
                }} />
                <span style={{ position: 'relative', fontWeight: winA ? 'bold' : 'normal', color: winA ? '#4BC0C0' : '#9CA3AF' }}>
                    {format(valueA)}
                    {winA && <span style={{ fontSize: '0.7em', marginLeft: '4px' }}>▲</span>}
                </span>
            </div>

            {/* Label (Center) */}
            <div style={{
                textAlign: 'center',
                color: '#D1D5DB',
                fontSize: '0.8rem',
                fontWeight: '600',
                textTransform: 'uppercase',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '12px',
                padding: '4px 8px',
                margin: '0 8px',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                {label}
            </div>

            {/* Value B (Left Aligned) */}
            <div style={{
                position: 'relative',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                paddingLeft: '1rem'
            }}>
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, bottom: 0,
                    width: `${percentB}%`,
                    background: winB ? 'linear-gradient(-90deg, transparent 0%, rgba(255, 99, 132, 0.2) 100%)' : 'rgba(255,255,255,0.05)',
                    borderLeft: winB ? '2px solid #FF6384' : 'none',
                    borderRadius: '0 4px 4px 0',
                    transition: 'width 0.5s ease-out'
                }} />
                <span style={{ position: 'relative', fontWeight: winB ? 'bold' : 'normal', color: winB ? '#FF6384' : '#9CA3AF' }}>
                    {format(valueB)}
                    {winB && <span style={{ fontSize: '0.7em', marginLeft: '4px' }}>▲</span>}
                </span>
            </div>
        </div>
    )
})

import { ComparisonCharacter } from '@/types/character'

interface CompareStatGridProps {
    statsA?: ComparisonCharacter
    statsB?: ComparisonCharacter
}

export default function CompareStatGrid({ statsA, statsB }: CompareStatGridProps) {
    // 기본 스탯
    const basicStats: { key: keyof ComparisonCharacter; label: string }[] = [
        { key: 'combat_power', label: 'NOA 점수' },
        { key: 'item_level', label: '아이템레벨' },
        { key: 'level', label: '레벨' },
        { key: 'attack_power', label: '위력' },
        { key: 'accuracy', label: '정확' },
        { key: 'crit_strike', label: '민첩' },
        { key: 'hp', label: '체력' },
        { key: 'mp', label: '의지' },
        { key: 'magic_boost', label: '지식' },
    ]

    // 대바니온 스탯
    const daevanionStats: { key: keyof ComparisonCharacter; label: string }[] = [
        { key: 'daevanion_destruction', label: '파괴' },
        { key: 'daevanion_death', label: '죽음' },
        { key: 'daevanion_time', label: '시간' },
        { key: 'daevanion_life', label: '생명' },
        { key: 'daevanion_justice', label: '정의' },
        { key: 'daevanion_freedom', label: '자유' },
    ]

    const statList = [...basicStats, ...daevanionStats]

    return (
        <div style={{
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '12px',
            padding: '1rem',
            border: '1px solid rgba(255,255,255,0.05)'
        }}>
            <div style={{
                textAlign: 'center',
                marginBottom: '1rem',
                color: '#fff',
                fontWeight: 'bold',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                paddingBottom: '0.5rem'
            }}>
                상세 스탯 비교
            </div>
            {statList.map(stat => (
                <StatRow
                    key={stat.key}
                    label={stat.label}
                    valueA={statsA ? (statsA[stat.key] as number || 0) : 0}
                    valueB={statsB ? (statsB[stat.key] as number || 0) : 0}
                />
            ))}
        </div>
    )
}
