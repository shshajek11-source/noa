'use client'

import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend
} from 'recharts'

export interface RadarDataPoint {
    subject: string
    A: number
    B: number
    fullMark: number
}

interface CompareRadarChartProps {
    data: RadarDataPoint[]
    charAName?: string
    charBName?: string
    colorA: string
    colorB: string
}

export default function CompareRadarChart({ data, charAName, charBName, colorA, colorB }: CompareRadarChartProps) {
    return (
        <div style={{ width: '100%', height: '400px', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 'bold' }}
                    />
                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />

                    <Radar
                        name={charAName}
                        dataKey="A"
                        stroke={colorA}
                        fill={colorA}
                        fillOpacity={0.4}
                    />
                    <Radar
                        name={charBName}
                        dataKey="B"
                        stroke={colorB}
                        fill={colorB}
                        fillOpacity={0.4}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(17, 24, 39, 0.9)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            color: '#fff'
                        }}
                        itemStyle={{ color: '#fff' }}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    )
}
