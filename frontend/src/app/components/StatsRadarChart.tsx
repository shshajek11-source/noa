'use client'
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'
import type { StatListItem } from '../../types/api'
import type { StatDetail } from '../../types/stats'

interface StatsRadarChartProps {
    stats: any[]
}

const TARGET_STATS = [
    { name: '공격력', key: 'ATM', fullKey: 'Attack' },
    { name: '명중', key: 'ACC', fullKey: 'Accuracy' },
    { name: '치명타', key: 'CRT', fullKey: 'Critical' },
    { name: '피해 증폭', key: 'AMP', fullKey: 'Amp', label: '위력' }, // User requested '위력' label
    { name: '다단 히트 적중', key: 'M-HIT', fullKey: 'Multi-Hit', label: '다단히트' }, // User requested '다단히트' label
    { name: '전투 속도', key: 'SPD', fullKey: 'Speed' },
    { name: '강타', key: 'SMASH', fullKey: 'Smash' },
    { name: '치명타 피해 증폭', key: 'CDA', fullKey: 'Crit Dmg Amp' } // Replaced Defense
]

// Normalize values for chart scaling (0-100 scale ideally)
const normalizeValue = (name: string, value: number) => {
    if (!value) return 0
    // calibrated 'Soft Cap' values for 100% chart fill
    switch (name) {
        case '공격력': return Math.min(100, (value / 3500) * 100) // End-game ~3000+
        case '명중': return Math.min(100, (value / 4500) * 100) // End-game ~4000
        case '치명타': return Math.min(100, (value / 1800) * 100) // End-game ~1500
        case '피해 증폭': return Math.min(100, (value / 300) * 100) // Realistic max ~300%
        case '다단 히트 적중': return Math.min(100, (value / 80) * 100) // Effective max ~80%
        case '전투 속도': return Math.min(100, (value / 150) * 100) // Soft cap usually lower than 200
        case '강타': return Math.min(100, (value / 400) * 100) // Good stat ~300
        case '치명타 피해 증폭': return Math.min(100, (value / 250) * 100) // Realistic max ~250%
        default: return Math.min(100, (value / 100) * 100)
    }
}

export default function StatsRadarChart({ stats }: StatsRadarChartProps) {
    if (!stats || stats.length === 0) return null

    const data = TARGET_STATS.map(target => {
        const statItem = stats.find(s => s.name === target.name)
        // Check for 'totalPercentage' for % based stats if totalValue is 0, or sum them?
        // statsAggregator usually puts % in totalPercentage and flat in totalValue.
        // For chart, we need a single representative number.
        // For speed/amp, it's mostly %. For Attack, it's value.

        let rawValue = 0
        if (statItem) {
            if (['전투 속도', '다단 히트 적중', '피해 증폭', '치명타 피해 증폭', '강타'].includes(target.name)) {
                // Prioritize percentage for these
                rawValue = statItem.totalPercentage > 0 ? statItem.totalPercentage : statItem.totalValue
            } else {
                rawValue = statItem.totalValue > 0 ? statItem.totalValue : statItem.totalPercentage
            }
        }

        return {
            subject: target.label || target.name, // Use custom label if available
            A: normalizeValue(target.name, rawValue),
            fullMark: 100,
            value: rawValue // For tooltip
        }
    })

    return (
        <div style={{ width: '100%', height: '300px', marginBottom: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                    <PolarGrid stroke="#374151" />
                    <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                        name="Stats"
                        dataKey="A"
                        stroke="#F59E0B"
                        strokeWidth={2}
                        fill="#F59E0B"
                        fillOpacity={0.2}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    )
}
