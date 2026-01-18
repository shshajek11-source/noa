import { useState, useMemo, useEffect, useRef } from 'react'
import CharacterShowcase from './profile/CharacterShowcase'
import styles from './ProfileSection.module.css'
import { aggregateStats } from '../../lib/statsAggregator'
import { calculateDualCombatPowerFromStats } from '../../lib/combatPower'

interface ProfileSectionProps {
    character: any
    arcana: any[]
    onArcanaClick?: (item: any) => void
    stats: any
    equipment: any[]
    topPower?: number
    titles?: any
    daevanion?: any
    equippedTitleId?: number
}

const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ko-KR').format(num)
}

export default function ProfileSection({ character, arcana, onArcanaClick, stats, equipment, topPower, titles, daevanion, equippedTitleId }: ProfileSectionProps) {
    const [hoveredArcana, setHoveredArcana] = useState<any | null>(null)
    const [showDebug, setShowDebug] = useState(false)
    const [copied, setCopied] = useState(false)

    // PVE/PVP 전투력 계산
    const dualCombatPower = useMemo(() => {
        // 장비 또는 스탯 데이터가 있는 경우 새 계산식 사용
        if ((equipment && equipment.length > 0) || stats?.statList) {
            const aggregatedStats = aggregateStats(
                equipment || [],
                titles || {},
                daevanion || {},
                stats,
                equippedTitleId
            )
            return calculateDualCombatPowerFromStats(aggregatedStats, stats)
        }
        return null
    }, [equipment, titles, daevanion, stats, equippedTitleId])

    // PVE/PVP 전투력
    const pveCombatPower = dualCombatPower?.pve || character.pve_score || character.power || 0
    const pvpCombatPower = dualCombatPower?.pvp || character.pvp_score || 0
    // 호환성 유지
    const combatPower = pveCombatPower

    // 클라이언트에서 계산된 전투력을 DB에 저장 (캐릭터 상세 페이지 조회 시)
    const savedScoreRef = useRef<string | null>(null)
    useEffect(() => {
        const saveScores = async () => {
            // 전투력이 계산되었고, 이전에 저장한 값과 다른 경우에만 저장
            if (!pveCombatPower || pveCombatPower <= 0) return
            const scoreKey = `${pveCombatPower}-${pvpCombatPower}`
            if (savedScoreRef.current === scoreKey) return
            if (!character?.characterId) return

            try {
                // API를 통해 PVE/PVP 점수 저장
                const res = await fetch('/api/character/save-score', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        characterId: character.characterId,
                        pveScore: pveCombatPower,
                        pvpScore: pvpCombatPower
                    })
                })

                if (res.ok) {
                    savedScoreRef.current = scoreKey
                    console.log(`[ProfileSection] PVE=${pveCombatPower}, PVP=${pvpCombatPower} saved for ${character.characterName || character.name}`)
                }
            } catch (err) {
                console.error('[ProfileSection] Failed to save scores:', err)
            }
        }

        saveScores()
    }, [pveCombatPower, pvpCombatPower, character?.characterId, character?.characterName, character?.name])

    // Calculate Percentile / Tier
    const tierInfo = useMemo(() => {
        if (!topPower) return { tier: 'Unranked', percentile: 0, color: '#9CA3AF' }
        const ratio = combatPower / topPower
        let tier = 'Iron'
        let color = '#9CA3AF'

        if (ratio >= 0.9) { tier = 'Diamond'; color = '#3B82F6' } // Blue
        else if (ratio >= 0.8) { tier = 'Platinum'; color = '#22C55E' } // Green
        else if (ratio >= 0.7) { tier = 'Gold'; color = '#FACC15' } // Yellow
        else if (ratio >= 0.5) { tier = 'Silver'; color = '#94A3B8' } // Silver

        return { tier, percentile: Math.floor(ratio * 100), color }
    }, [combatPower, topPower])

    // Calculate Total Arcana Stats
    const arcanaTotals = useMemo(() => {
        if (!arcana) return {}
        const totals: Record<string, number> = {}
        arcana.forEach(item => {
            // Main Options
            item.detail?.options?.forEach((opt: any) => {
                totals[opt.name] = (totals[opt.name] || 0) + parseInt(opt.value.replace('+', ''))
            })
            // Random Options
            item.detail?.randomOptions?.forEach((opt: any) => {
                totals[opt.name] = (totals[opt.name] || 0) + opt.value
            })
        })
        return totals
    }, [arcana])

    // Calculate Total Arcana Skills
    const arcanaSkills = useMemo(() => {
        if (!arcana) return {}
        const skills: Record<string, number> = {}
        arcana.forEach(item => {
            item.detail?.arcanas?.forEach((arc: any) => {
                if (arc.skill) {
                    skills[arc.skill] = (skills[arc.skill] || 0) + 1
                } else if (arc.name) {
                    skills[arc.name] = (skills[arc.name] || 0) + 1
                }
            })
        })
        return skills
    }, [arcana])

    // Calculate Total Breakthrough from equipment
    const totalBreakthrough = useMemo(() => {
        if (!equipment || !Array.isArray(equipment)) return 0
        return equipment.reduce((sum, item) => {
            const breakthrough = item?.breakthrough || item?.detail?.breakthrough || 0
            return sum + breakthrough
        }, 0)
    }, [equipment])

    // Calculate Average Item Level from equipment
    const calculatedItemLevel = useMemo(() => {
        // 먼저 character에서 item_level 확인
        if (character.item_level && character.item_level > 0) {
            return character.item_level
        }
        if (character.itemLevel && character.itemLevel > 0) {
            return character.itemLevel
        }

        // 장비에서 계산
        if (!equipment || !Array.isArray(equipment) || equipment.length === 0) return 0

        const itemsWithLevel = equipment.filter(item => item?.itemLevel && item.itemLevel > 0)
        if (itemsWithLevel.length === 0) return 0

        const totalLevel = itemsWithLevel.reduce((sum, item) => sum + (item.itemLevel || 0), 0)
        return Math.floor(totalLevel / itemsWithLevel.length)
    }, [character, equipment])

    // 디버그 데이터 생성
    const debugData = useMemo(() => {
        return {
            characterId: character?.characterId,
            characterName: character?.characterName || character?.name,
            calculatedCombatPower: combatPower,
            combatPowerResult: dualCombatPower,
            equipmentCount: equipment?.length || 0,
            equipment: equipment?.map((item: any) => ({
                slot: item.slot || item.slotPosName,
                name: item.name,
                slotPos: item.slotPos || item.raw?.slotPos,
                breakthrough: item.breakthrough || item.exceedLevel || item.raw?.exceedLevel,
                itemLevel: item.itemLevel,
                manastones: item.manastones || item.manastoneList,
                detail: item.detail ? {
                    mainStats: item.detail._raw?.mainStats || item.detail.mainStats,
                    subStats: item.detail._raw?.subStats || item.detail.subStats,
                    magicStoneStat: item.detail._raw?.magicStoneStat,
                    options: item.detail.options,
                    randomOptions: item.detail.randomOptions
                } : null
            })),
            titles: titles,
            daevanion: daevanion,
            stats: stats,
            equippedTitleId: equippedTitleId
        }
    }, [character, combatPower, dualCombatPower, equipment, titles, daevanion, stats, equippedTitleId])

    // 복사 함수
    const copyDebugData = () => {
        const jsonStr = JSON.stringify(debugData, null, 2)
        navigator.clipboard.writeText(jsonStr).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        })
    }

    return (
        <div className={styles.container}>
            {/* Debug Toggle Button */}
            <button
                onClick={() => setShowDebug(!showDebug)}
                style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    background: showDebug ? '#EF4444' : '#374151',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    zIndex: 100,
                    opacity: 0.8
                }}
            >
                {showDebug ? 'Close Debug' : 'Debug'}
            </button>

            {/* Debug Panel */}
            {showDebug && (
                <div style={{
                    position: 'absolute',
                    top: '40px',
                    right: '8px',
                    width: '400px',
                    maxHeight: '500px',
                    background: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    zIndex: 99,
                    overflow: 'hidden',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: '#111827',
                        borderBottom: '1px solid #374151'
                    }}>
                        <span style={{ color: '#FACC15', fontWeight: 600, fontSize: '12px' }}>
                            Debug Data (Combat Power: {formatNumber(combatPower)})
                        </span>
                        <button
                            onClick={copyDebugData}
                            style={{
                                padding: '4px 12px',
                                fontSize: '11px',
                                background: copied ? '#10B981' : '#3B82F6',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            {copied ? 'Copied!' : 'Copy JSON'}
                        </button>
                    </div>
                    <pre style={{
                        padding: '12px',
                        margin: 0,
                        fontSize: '10px',
                        color: '#9CA3AF',
                        overflow: 'auto',
                        maxHeight: '440px',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all'
                    }}>
                        {JSON.stringify(debugData, null, 2)}
                    </pre>
                </div>
            )}

            {/* 3D Character Showcase */}
            <div className={styles.showcaseWrapper}>
                <CharacterShowcase
                    imageUrl={character.character_image_url}
                    name={character.character_name || character.name || 'Unknown'}
                    server={character.server_name || character.server || 'Unknown'}
                    rank={character.rank || 0}
                    combatPower={pveCombatPower}
                    pvpCombatPower={pvpCombatPower}
                    tierImage={`/images/ranks/${tierInfo.tier.toLowerCase()}.png`}
                    job={character.class}
                    race={character.race}
                    level={character.level}
                    itemLevel={calculatedItemLevel}
                    totalBreakthrough={totalBreakthrough}
                />
            </div>

            {/* Arcana Section */}
            {arcana && arcana.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                    <div className={styles.sectionTitle}>
                        Arcana
                    </div>
                    <div className={styles.equipmentGrid}>
                        {arcana.slice(0, 5).map((item: any, index: number) => {
                            const gradeColors: Record<string, string> = {
                                'Common': '#9CA3AF',
                                'Rare': '#60A5FA',
                                'Legend': '#FBBF24',
                                'Unique': '#A78BFA',
                                'Epic': '#F472B6',
                                'Mythic': '#FACC15',
                            }
                            const gradeColor = gradeColors[item.grade] || '#9CA3AF'

                            return (
                                <div
                                    key={index}
                                    className={styles.itemSlot}
                                    style={{
                                        borderColor: hoveredArcana === item ? gradeColor : `${gradeColor}40`,
                                        transform: hoveredArcana === item ? 'scale(1.05)' : 'scale(1)',
                                        cursor: onArcanaClick ? 'pointer' : 'default'
                                    }}
                                    onClick={() => onArcanaClick?.(item)}
                                    onMouseEnter={() => setHoveredArcana(item)}
                                    onMouseLeave={() => setHoveredArcana(null)}
                                >
                                    {item.image && (
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    )}
                                    {item.enhancement && (
                                        <div style={{ position: 'absolute', bottom: '2px', right: '4px', fontSize: '10px', fontWeight: 'bold', color: gradeColor }}>
                                            {item.enhancement}
                                        </div>
                                    )}

                                    {/* Tooltip on hover */}
                                    {hoveredArcana === item && (
                                        <div style={{
                                            position: 'absolute',
                                            bottom: 'calc(100% + 8px)',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            width: '220px',
                                            background: 'rgba(15, 17, 23, 0.98)',
                                            border: `1px solid ${gradeColor}80`,
                                            borderRadius: '6px',
                                            padding: '8px',
                                            zIndex: 99999,
                                            boxShadow: '0 10px 25px rgba(0,0,0,0.8)',
                                            pointerEvents: 'none',
                                            textAlign: 'left'
                                        }}>
                                            {/* Arrow */}
                                            <div style={{
                                                position: 'absolute',
                                                top: '100%',
                                                left: '50%',
                                                transform: 'translateX(-50%) translateY(-1px)',
                                                width: 0,
                                                height: 0,
                                                borderLeft: '6px solid transparent',
                                                borderRight: '6px solid transparent',
                                                borderTop: `6px solid ${gradeColor}80`
                                            }}></div>

                                            {/* Header */}
                                            <div style={{ borderBottom: '1px solid #1F2433', paddingBottom: '6px', marginBottom: '6px' }}>
                                                <div style={{ color: gradeColor, fontSize: '0.85rem', fontWeight: 'bold', lineHeight: '1.2' }}>
                                                    {item.enhancement && <span style={{ marginRight: '4px' }}>{item.enhancement}</span>}
                                                    {item.name}
                                                </div>
                                                <div style={{ fontSize: '0.65rem', color: '#9CA3AF', marginTop: '2px' }}>
                                                    {item.category || item.slot}
                                                </div>
                                            </div>

                                            {/* Options */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {item.detail?.options && item.detail.options.map((opt: any, idx: number) => (
                                                    <div key={`opt-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#E5E7EB' }}>
                                                        <span style={{ color: '#9CA3AF' }}>{opt.name}</span>
                                                        <span>{opt.value}</span>
                                                    </div>
                                                ))}

                                                {item.detail?.randomOptions && item.detail.randomOptions.map((opt: any, idx: number) => (
                                                    <div key={`rnd-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#86EFAC' }}>
                                                        <span>{opt.name}</span>
                                                        <span>+{opt.value}</span>
                                                    </div>
                                                ))}

                                                {item.detail?.arcanas && item.detail.arcanas.length > 0 && (
                                                    <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px dashed #374151' }}>
                                                        <div style={{ fontSize: '0.65rem', color: '#F59E0B', fontWeight: 'bold', marginBottom: '3px' }}>
                                                            아르카나 효과
                                                        </div>
                                                        {item.detail.arcanas.map((arc: any, idx: number) => (
                                                            <div key={`arc-${idx}`} style={{ marginBottom: '4px' }}>
                                                                <div style={{ fontSize: '0.65rem', color: '#F59E0B', marginBottom: '1px' }}>
                                                                    {arc.name}
                                                                </div>
                                                                {arc.skill && (
                                                                    <div style={{ fontSize: '0.6rem', color: '#FCD34D', marginBottom: '1px' }}>
                                                                        {arc.skill}
                                                                    </div>
                                                                )}
                                                                {arc.skillDesc && (
                                                                    <div style={{ fontSize: '0.6rem', color: '#D4D4D8', whiteSpace: 'pre-wrap', lineHeight: '1.3' }}>
                                                                        {arc.skillDesc.substring(0, 100)}{arc.skillDesc.length > 100 ? '...' : ''}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Arcana Stats Total */}
                    {(Object.keys(arcanaTotals).length > 0 || Object.keys(arcanaSkills).length > 0) && (
                        <div className={styles.glassPanel} style={{ marginTop: '0.75rem', padding: '0.75rem' }}>
                            <div style={{ color: '#9CA3AF', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                                아르카나 합계
                            </div>

                            {/* Skills Section (위에 표시, 2열) */}
                            {Object.keys(arcanaSkills).length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem 0.5rem', marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px dashed #374151' }}>
                                    {Object.entries(arcanaSkills).map(([skillName, count], idx) => (
                                        <span key={idx} style={{ fontSize: '0.7rem', color: '#F59E0B' }}>
                                            {skillName}<span style={{ color: '#FCD34D' }}>+{count}</span>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Stats Section (아래에 표시) */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                {Object.entries(arcanaTotals).map(([statName, value], idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                        <span style={{ color: '#9CA3AF' }}>{statName}</span>
                                        <span style={{ color: '#EAB308', fontWeight: 'bold' }}>+{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
