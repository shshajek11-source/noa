'use client'

import { useState, useEffect, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams, useRouter } from 'next/navigation'
import CompareHeader from '@/app/components/compare/CompareHeader'
import CompareRadarChart, { RadarDataPoint } from '@/app/components/compare/CompareRadarChart'
import CompareStatGrid from '@/app/components/compare/CompareStatGrid'
import CompareEquipment from '@/app/components/compare/CompareEquipment'
import CompareInsight from '@/app/components/compare/CompareInsight'
import CompareSummary from '@/app/components/compare/CompareSummary'

// 모달 컴포넌트 지연 로딩 (클릭 시에만 로드)
const AddCharacterModal = dynamic(() => import('@/app/components/compare/AddCharacterModal'), { ssr: false })
import { ComparisonCharacter, ComparisonEquipmentItem } from '@/types/character'
import { CharacterSearchResult, getApiBaseUrl, SERVER_ID_TO_NAME } from '@/lib/supabaseApi'
import { SERVER_MAP } from '@/app/constants/servers'
import { Copy, Check, Share2 } from 'lucide-react'
import { MainCharacter, MAIN_CHARACTER_KEY } from '@/app/components/SearchBar'
import { aggregateStats } from '@/lib/statsAggregator'
import { calculateCombatPowerFromStats } from '@/lib/combatPower'

// 임시 비활성화 플래그 (메뉴에서만 숨김, 페이지는 접근 가능)
const DISABLED = false;

function DisabledPage() {
    return (
        <div style={{
            minHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            textAlign: 'center',
            background: 'linear-gradient(180deg, #0B0D12 0%, #1a1d24 100%)'
        }}>
            <div style={{
                fontSize: '64px',
                marginBottom: '24px'
            }}>🔧</div>
            <h1 style={{
                fontSize: '1.8rem',
                fontWeight: 700,
                color: '#E5E7EB',
                marginBottom: '12px'
            }}>캐릭터 비교 페이지 준비 중</h1>
            <p style={{
                fontSize: '1rem',
                color: '#9CA3AF',
                marginBottom: '32px',
                lineHeight: 1.6
            }}>
                더 나은 서비스를 위해 페이지를 개선하고 있습니다.<br />
                빠른 시일 내에 다시 찾아뵙겠습니다.
            </p>
            <a href="/" style={{
                padding: '12px 24px',
                background: '#FACC15',
                color: '#0B0D12',
                borderRadius: '8px',
                fontWeight: 600,
                textDecoration: 'none'
            }}>메인으로 돌아가기</a>
        </div>
    );
}

// 장비 데이터 매핑 함수
const mapEquipmentForComparison = (rawEquipment: any): ComparisonEquipmentItem[] => {
    if (!rawEquipment?.equipmentList) return []

    const gradeMap: Record<string, number> = {
        'Common': 1, 'Rare': 2, 'Legend': 3, 'Unique': 4, 'Epic': 5, 'Mythic': 6
    }

    return rawEquipment.equipmentList.map((item: any) => ({
        slot: item.slotPosName || item.slotName || '',
        name: item.name || item.itemName || '',
        enhancement: item.enchantLevel > 0 ? `+${item.enchantLevel}` : '',
        tier: gradeMap[item.grade] || item.gradeCode || 3,
        itemLevel: item.itemLevel || 0,
        grade: item.grade,
        image: item.icon || item.image,
        category: item.categoryName,
        breakthrough: item.exceedLevel || 0,
        soulEngraving: item.soulEngraving ? { grade: item.soulEngraving.grade, percentage: item.soulEngraving.value } : undefined,
        manastones: item.manastoneList?.map((m: any) => ({ type: m.name, value: m.point })) || []
    }))
}

function ComparePageContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const targetQuery = searchParams.get('targets') // format: characterId_serverId,characterId_serverId

    const [characters, setCharacters] = useState<ComparisonCharacter[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [mounted, setMounted] = useState(false)

    // 캐릭터 추가 모달 상태
    const [showAddModal, setShowAddModal] = useState(false)
    const [addingSlot, setAddingSlot] = useState<'A' | 'B'>('A')

    // 클라이언트 마운트 확인
    useEffect(() => {
        setMounted(true)
    }, [])

    // URL 공유 기능
    const handleShare = async () => {
        const url = window.location.href
        try {
            await navigator.clipboard.writeText(url)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy URL', err)
        }
    }

    // 대표캐릭터 자동 추가 (URL에 타겟이 없을 때)
    useEffect(() => {
        if (!mounted) return
        if (targetQuery) return // 이미 URL에 타겟이 있으면 스킵

        try {
            const saved = localStorage.getItem(MAIN_CHARACTER_KEY)
            if (saved) {
                const mainChar: MainCharacter = JSON.parse(saved)
                console.log('[Compare] Auto-adding main character:', mainChar.name)

                // 대표캐릭터를 첫 번째 타겟으로 URL에 추가
                const serverId = mainChar.server_id || 1001
                const newTarget = `${mainChar.characterId}_${serverId}`

                const url = new URL(window.location.href)
                url.searchParams.set('targets', newTarget)
                router.replace(url.pathname + url.search, { scroll: false })
            }
        } catch (e) {
            console.error('Failed to load main character for compare', e)
        }
    }, [mounted, targetQuery, router])

    useEffect(() => {
        if (!mounted) return

        const loadData = async () => {
            let targets: string[] = []

            if (targetQuery) {
                targets = targetQuery.split(',')
            } else {
                // Fallback: Check localStorage if no query param
                const saved = localStorage.getItem('compare_targets')
                if (saved) {
                    try {
                        const parsed = JSON.parse(saved)
                        if (Array.isArray(parsed) && parsed.length >= 2) {
                            targets = parsed.map((t: any) => `${t.characterId}_${t.serverId}`)
                        }
                    } catch (e) {
                        console.error("Failed to parse local storage targets", e)
                    }
                }
            }

            // Allow loading even with 0 or 1 target
            if (targets.length === 0) {
                setLoading(false)
                setCharacters([])
                return
            }

            setLoading(true)
            setError(null)
            try {
                const promises = targets.map(async (t) => {
                    const lastUnderscoreIndex = t.lastIndexOf('_')
                    if (lastUnderscoreIndex === -1) return null

                    const characterId = t.substring(0, lastUnderscoreIndex)
                    const serverId = t.substring(lastUnderscoreIndex + 1)

                    // 실제 API 호출
                    const res = await fetch(`${getApiBaseUrl()}/api/character?id=${encodeURIComponent(characterId)}&server=${serverId}`)

                    if (!res.ok) {
                        console.error(`Failed to fetch character: ${characterId}`)
                        return null
                    }

                    const detail = await res.json()
                    const profile = detail.profile || {}
                    const stats = detail.stats?.statList || []

                    // 스탯 매핑 헬퍼 - API 응답의 다양한 이름 형식 지원
                    const getStatValue = (...names: string[]): number => {
                        for (const name of names) {
                            const stat = stats.find((s: any) =>
                                s.name === name ||
                                s.name?.includes(name) ||
                                s.type === name
                            )
                            if (stat) {
                                const val = typeof stat.value === 'string'
                                    ? parseInt(stat.value.replace(/,/g, ''))
                                    : stat.value
                                if (val && val > 0) return val
                            }
                        }
                        return 0
                    }

                    // 장비 매핑
                    const equipment = mapEquipmentForComparison(detail.equipment)
                    const rawEquipList = detail.equipment?.equipmentList || []

                    // HITON 전투력 계산 (새 시스템)
                    const titles = detail.titles || { titleList: [] }
                    const daevanion = detail.daevanion || { boardList: [] }
                    const equippedTitleId = profile.titleId
                    const aggregatedStats = aggregateStats(rawEquipList, titles, daevanion, detail.stats, equippedTitleId)
                    const combatPowerResult = calculateCombatPowerFromStats(aggregatedStats, detail.stats)
                    const hitonCombatPower = combatPowerResult.totalScore

                    // 실제 API 스탯 추출 (statList의 name 기준)
                    const itemLevel = getStatValue('아이템레벨', 'ItemLevel')

                    // 기본 스탯
                    const str = getStatValue('위력', 'STR')
                    const dex = getStatValue('민첩', 'DEX')
                    const int = getStatValue('지식', 'INT')
                    const con = getStatValue('체력', 'CON')
                    const agi = getStatValue('정확', 'AGI')
                    const wis = getStatValue('의지', 'WIS')

                    // 대바니온 스탯
                    const justice = getStatValue('정의')
                    const freedom = getStatValue('자유')
                    const destruction = getStatValue('파괴')
                    const death = getStatValue('죽음')
                    const time = getStatValue('시간')
                    const life = getStatValue('생명')

                    return {
                        name: profile.characterName || '',
                        character_id: profile.characterId || characterId,
                        server_id: parseInt(serverId, 10) || 1001,
                        level: profile.characterLevel || 0,
                        class_name: profile.className || '',
                        race_name: profile.raceName || '',
                        profile_image: profile.profileImage || '/placeholder-avatar.svg',
                        guild_name: profile.guildName,

                        hiton_score: hitonCombatPower,
                        ranking_ap: 0,
                        ranking_gp: 0,
                        item_level: itemLevel || 0,
                        prev_rank: null,

                        // HITON 전투력 사용
                        combat_power: hitonCombatPower,

                        // 기본 스탯
                        hp: con,
                        mp: wis,
                        attack_power: str,
                        magic_boost: int,
                        accuracy: agi,
                        magic_accuracy: int,
                        crit_strike: dex,
                        magic_crit: int,
                        defense: con,
                        magic_resist: wis,
                        evasion: dex,
                        parry: agi,
                        block: 0,
                        pvp_attack: 0,
                        pvp_defense: 0,

                        // 대바니온 스탯 추가
                        daevanion_justice: justice,
                        daevanion_freedom: freedom,
                        daevanion_destruction: destruction,
                        daevanion_death: death,
                        daevanion_time: time,
                        daevanion_life: life,

                        equipment: equipment
                    }
                })

                const results = await Promise.all(promises)
                const validResults = results.filter(r => r !== null)
                setCharacters(validResults as ComparisonCharacter[])

            } catch (err) {
                console.error(err)
                setError("캐릭터 정보를 불러오는데 실패했습니다.")
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [targetQuery, mounted])

    // Generate Radar Data - 실제 있는 수치만 비교 (정규화된 비율로 표시)
    const generateRadarData = (): RadarDataPoint[] => {
        if (characters.length < 2) return []
        const charA = (characters[0] || {}) as unknown as Record<string, number>
        const charB = (characters[1] || {}) as unknown as Record<string, number>

        // 정규화된 레이더 차트 - 각 항목별로 최대값 대비 비율로 표시
        const createNormalizedPoint = (subject: string, key: string) => {
            const valA = charA[key] || 0
            const valB = charB[key] || 0
            // 둘 다 0이면 포함하지 않음
            if (valA === 0 && valB === 0) return null

            // 두 값 중 최대값을 기준으로 정규화 (100 기준)
            const maxVal = Math.max(valA, valB)
            return {
                subject,
                A: Math.round((valA / maxVal) * 100),
                B: Math.round((valB / maxVal) * 100),
                fullMark: 100
            }
        }

        const points = [
            createNormalizedPoint('HITON전투력', 'combat_power'),
            createNormalizedPoint('아이템레벨', 'item_level'),
            createNormalizedPoint('위력', 'attack_power'),
            createNormalizedPoint('정확', 'accuracy'),
            createNormalizedPoint('민첩', 'crit_strike'),
            createNormalizedPoint('레벨', 'level'),
        ]

        // 최소 3개 이상 있어야 레이더 차트 표시
        const validPoints = points.filter(p => p !== null) as RadarDataPoint[]
        return validPoints.length >= 3 ? validPoints : []
    }

    // 스켈레톤 로딩 UI
    if (loading) {
        return (
            <div style={{ paddingBottom: '4rem' }}>
                {/* 스켈레톤 헤더 */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    marginBottom: '3rem',
                    padding: '1rem 0'
                }}>
                    <div style={{ flex: 1, maxWidth: '45%' }}>
                        <div style={{
                            height: '140px',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '16px',
                            animation: 'pulse 1.5s ease-in-out infinite'
                        }} />
                    </div>
                    <div style={{
                        fontSize: '2.5rem',
                        fontWeight: 900,
                        color: 'rgba(255,255,255,0.2)'
                    }}>VS</div>
                    <div style={{ flex: 1, maxWidth: '45%' }}>
                        <div style={{
                            height: '140px',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '16px',
                            animation: 'pulse 1.5s ease-in-out infinite'
                        }} />
                    </div>
                </div>

                {/* 스켈레톤 콘텐츠 */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1.5fr)',
                    gap: '2rem',
                    maxWidth: '1200px',
                    margin: '0 auto'
                }}>
                    <div style={{
                        height: '400px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '16px',
                        animation: 'pulse 1.5s ease-in-out infinite'
                    }} />
                    <div style={{
                        height: '400px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '16px',
                        animation: 'pulse 1.5s ease-in-out infinite'
                    }} />
                </div>

                <style jsx>{`
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.5; }
                    }
                `}</style>
            </div>
        )
    }

    // 에러 UI
    if (error) {
        return (
            <div style={{
                minHeight: '60vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '2rem'
            }}>
                <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid #ef4444',
                    borderRadius: '16px',
                    padding: '2rem 3rem',
                    textAlign: 'center',
                    maxWidth: '500px'
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                    <h3 style={{ color: '#ef4444', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                        오류 발생
                    </h3>
                    <p style={{ color: '#9CA3AF', marginBottom: '1.5rem' }}>{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '0.5rem 1.5rem',
                            background: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 500
                        }}
                    >
                        다시 시도
                    </button>
                </div>
            </div>
        )
    }

    const normalizedCharA = characters[0] || null
    const normalizedCharB = characters[1] || null

    // Helper to add search result to comparison
    const handleAddCharacter = (char: CharacterSearchResult) => {
        // characterId와 serverId를 사용하여 타겟 생성
        const serverId = char.server_id || 1001
        const newTarget = `${char.characterId}_${serverId}`
        const currentTargets = targetQuery ? targetQuery.split(',') : []

        // Avoid duplicates
        if (currentTargets.includes(newTarget)) return

        // Limit to 2 for VS mode consistency
        if (currentTargets.length >= 2) {
            return;
        }

        const newTargets = [...currentTargets, newTarget]
        const newQuery = newTargets.join(',')

        // Update URL
        const url = new URL(window.location.href)
        url.searchParams.set('targets', newQuery)

        // Use Next.js router for client-side navigation without full reload
        router.replace(url.pathname + url.search, { scroll: false })
    }

    // Helper to remove character
    const handleRemoveCharacter = (index: number) => {
        const currentTargets = targetQuery ? targetQuery.split(',') : []
        if (index < 0 || index >= currentTargets.length) return

        const newTargets = [...currentTargets]
        newTargets.splice(index, 1)

        const url = new URL(window.location.href)
        if (newTargets.length > 0) {
            url.searchParams.set('targets', newTargets.join(','))
        } else {
            url.searchParams.delete('targets')
        }

        // Use Next.js router for client-side navigation without full reload
        router.replace(url.pathname + url.search, { scroll: false })
    }

    // 서버 ID를 서버 이름으로 변환
    const getServerName = (serverId: number): string => {
        return SERVER_MAP[String(serverId)] || `서버 ${serverId}`
    }

    const handleOpenAddModal = (slot: 'A' | 'B') => {
        setAddingSlot(slot)
        setShowAddModal(true)
    }

    const handleCharacterSelected = (char: CharacterSearchResult) => {
        handleAddCharacter(char)
        setShowAddModal(false)
    }

    return (
        <div style={{ paddingBottom: '2rem' }}>
            {/* 상단 툴바: 공유 버튼 */}
            {characters.length === 2 && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    maxWidth: '1200px',
                    margin: '0 auto 0.5rem auto'
                }}>
                    <button
                        onClick={handleShare}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            background: copied ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.1)',
                            border: `1px solid ${copied ? '#22c55e' : 'rgba(255,255,255,0.2)'}`,
                            borderRadius: '8px',
                            color: copied ? '#22c55e' : '#fff',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        {copied ? <Check size={16} /> : <Share2 size={16} />}
                        {copied ? '복사 완료!' : 'URL 공유'}
                    </button>
                </div>
            )}

            {/* 캐릭터 추가 모달 */}
            {showAddModal && (
                <AddCharacterModal
                    onClose={() => setShowAddModal(false)}
                    onSelect={handleCharacterSelected}
                    slot={addingSlot}
                />
            )}


            <CompareHeader
                charA={characters[0]}
                charB={characters[1]}
                onRemoveA={characters[0] ? () => handleRemoveCharacter(0) : undefined}
                onRemoveB={characters[1] ? () => handleRemoveCharacter(1) : undefined}
                onAddClickA={() => handleOpenAddModal('A')}
                onAddClickB={() => handleOpenAddModal('B')}
                getServerName={getServerName}
            />

            {/* 비교 결과 요약 - 두 캐릭터가 있을 때만 표시 */}
            {characters.length === 2 && (
                <>
                    <CompareSummary charA={characters[0]} charB={characters[1]} />
                    {/* <CompareInsight charA={characters[0]} charB={characters[1]} /> */}
                </>
            )}

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1.5fr)',
                gap: '2rem',
                alignItems: 'start',
                maxWidth: '1200px',
                margin: '0 auto'
            }}>
                {/* Visual Analysis (Radar) - 데이터가 있을 때만 표시 */}
                {generateRadarData().length > 0 && (
                    <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        border: '1px solid rgba(255,255,255,0.05)',
                        backdropFilter: 'blur(10px)'
                    }}>
                        <h3 style={{
                            margin: '0 0 1rem 0',
                            textAlign: 'center',
                            color: 'var(--brand-primary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            fontSize: '0.9rem'
                        }}>
                            전투 밸런스 분석
                        </h3>
                        <CompareRadarChart
                            data={generateRadarData()}
                            charAName={characters[0]?.name}
                            charBName={characters[1]?.name}
                            colorA={characters[0]?.race_name === 'Elyos' ? '#4BC0C0' : '#FF6384'}
                            colorB={characters[1]?.race_name === 'Elyos' ? '#4BC0C0' : '#FF6384'}
                        />
                    </div>
                )}

                {/* Detailed Stats */}
                <CompareStatGrid statsA={characters[0]} statsB={characters[1]} />
            </div>

            {/* Equipment Comparison */}
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <CompareEquipment charA={characters[0]} charB={characters[1]} />
            </div>

            <style jsx global>{`
                body {
                    background-color: #0b0c10;
                    background-image: radial-gradient(circle at 50% 0%, #1a1c29 0%, #0b0c10 70%);
                }
            `}</style>
        </div>
    )
}

export default function ComparePage() {
    if (DISABLED) {
        return <DisabledPage />;
    }

    return (
        <Suspense fallback={<div>Loading comparison...</div>}>
            <div style={{ paddingTop: '80px', paddingLeft: '1rem', paddingRight: '1rem' }}>
                <ComparePageContent />
            </div>
        </Suspense>
    )
}
