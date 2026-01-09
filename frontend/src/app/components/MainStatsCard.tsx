'use client'
import { useState } from 'react'
import { ConsolidatedStatCalculator } from '@/lib/consolidatedStatCalculator'

// Image Paths
const STAT_ICONS = {
    OFFENSE: '/주요능력/1.png', // 공격, 치명, 명중, 지식, 민첩
    DEFENSE: '/주요능력/2.png', // 방어, 저항, 회피, 방패
    SUPPORT: '/주요능력/3.png'  // 생명, 정신, 의지
}

const StatImage = ({ src, alt }: { src: string, alt: string }) => (
    <div style={{
        width: '24px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    }}>
        <img src={src} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    </div>
)

export default function MainStatsCard({ stats, isEmbedded = false }: { stats: any, isEmbedded?: boolean }) {
    const [viewMode, setViewMode] = useState<'basic' | 'detail'>('basic')

    if (!stats || !stats.statList) return null

    // 통합된 능력치로 변환 (생명력, 공격력, 방어력, 정신력 그룹화)
    const groupedStats = ConsolidatedStatCalculator.getGroupedStatsForUI(stats.statList)

    // Get Icon based on stat name
    const getIconForStat = (name: string) => {
        if (!name) return <StatImage src={STAT_ICONS.SUPPORT} alt="Stat" />

        // 1. Offense (1.png)
        if (name.includes('공격') || name.includes('위력') ||
            name.includes('치명') ||
            name.includes('명중') || name.includes('적중') || name.includes('정확') ||
            name.includes('지식') || name.includes('증폭') ||
            name.includes('민첩')) {
            return <StatImage src={STAT_ICONS.OFFENSE} alt="Offense" />
        }

        // 2. Defense (2.png)
        if (name.includes('방어') || name.includes('저항') ||
            name.includes('회피') || name.includes('방패') ||
            name.includes('무기방어')) {
            return <StatImage src={STAT_ICONS.DEFENSE} alt="Defense" />
        }

        // 3. Support/Vitals (3.png) - Default fallback for HP/MP/Will etc.
        return <StatImage src={STAT_ICONS.SUPPORT} alt="Support" />
    }

    // 통합된 능력치 사용 (생명력, 공격력, 방어력, 정신력 그룹)
    // 기존 개별 능력치 대신 그룹화된 능력치 표시
    const displayStats = groupedStats

    return (
        <div style={{
            background: isEmbedded ? 'transparent' : '#111318',
            border: isEmbedded ? 'none' : '1px solid #1F2433',
            borderRadius: isEmbedded ? '0' : '12px',
            padding: isEmbedded ? '0' : '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            width: '100%',
            boxSizing: 'border-box'
        }}>
            {/* Header with Switch */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '0.5rem',
                borderBottom: '1px solid #1F2433'
            }}>
                <div style={{ fontWeight: 'bold', color: '#E5E7EB', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1rem' }}>주요 능력치</span>
                </div>

                {/* Custom Toggle Switch */}
                <div
                    onClick={() => setViewMode(prev => prev === 'basic' ? 'detail' : 'basic')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: '#1F2433',
                        borderRadius: '20px',
                        padding: '2px',
                        cursor: 'pointer',
                        position: 'relative',
                        width: '80px',
                        height: '24px',
                        userSelect: 'none'
                    }}
                >
                    <div style={{
                        position: 'absolute',
                        left: viewMode === 'basic' ? '2px' : '40px',
                        background: '#3B82F6',
                        borderRadius: '16px',
                        width: '38px',
                        height: '20px',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                    }} />
                    <span style={{
                        zIndex: 1,
                        flex: 1,
                        textAlign: 'center',
                        fontSize: '0.7rem',
                        color: viewMode === 'basic' ? '#FFF' : '#9CA3AF',
                        transition: 'color 0.3s'
                    }}>
                        기본
                    </span>
                    <span style={{
                        zIndex: 1,
                        flex: 1,
                        textAlign: 'center',
                        fontSize: '0.7rem',
                        color: viewMode === 'detail' ? '#FFF' : '#9CA3AF',
                        transition: 'color 0.3s'
                    }}>
                        상세
                    </span>
                </div>
            </div>

            {/* Content: 6-Column Grid for ALL stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '0.5rem',
                width: '100%'
            }}>
                {displayStats.map((stat: any, index: number) => {
                    const isBasic = viewMode === 'basic'
                    return (
                        <div
                            key={index}
                            style={{
                                background: '#0B0D12',
                                border: '1px solid #1F2433',
                                borderRadius: '8px',
                                padding: '0.75rem 0.5rem',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: isBasic ? '0.5rem' : '0',
                                minHeight: '95px',
                                transition: 'all 0.2s',
                                boxSizing: 'border-box',
                                overflow: 'hidden'
                            }}
                        >
                            {/* Icon */}
                            {isBasic && (
                                <div style={{
                                    color: '#60A5FA',
                                    flexShrink: 0,
                                    height: '22px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {getIconForStat(stat.name || stat.statName)}
                                </div>
                            )}

                            {/* Text Content */}
                            <div style={{
                                textAlign: 'center',
                                width: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.25rem',
                                overflow: 'hidden',
                                justifyContent: 'center',
                                height: isBasic ? 'auto' : '100%'
                            }}>
                                {isBasic && (
                                    <div style={{
                                        fontSize: '0.7rem',
                                        color: '#9CA3AF',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {stat.name || stat.statName}
                                    </div>
                                )}

                                {/* Value vs Detail */}
                                <div style={{
                                    fontSize: isBasic ? '0.95rem' : '0.75rem',
                                    fontWeight: isBasic ? 'bold' : 'normal',
                                    color: '#E5E7EB',
                                    whiteSpace: isBasic ? 'nowrap' : 'normal', // Allow wrap in detail for full visibility
                                    wordBreak: 'keep-all', // Korean word break optimization
                                    lineHeight: '1.2',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textAlign: 'center'
                                }}>
                                    {isBasic
                                        ? (typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value)
                                        : (stat.statSecondList && stat.statSecondList.length > 0
                                            ? stat.statSecondList.join(' ')
                                            : '-')
                                    }
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
