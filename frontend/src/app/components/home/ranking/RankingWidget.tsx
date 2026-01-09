import { useState, useEffect } from 'react'
import Link from 'next/link'
import { RankingCharacter } from '@/types/character'
import { SERVER_MAP, SERVERS } from '@/app/constants/servers'

const CLASSES = ['검성', '수호성', '궁성', '살성', '마도성', '정령성', '치유성', '호법성']

type FilterMode = 'race' | 'server' | 'class'

interface RankingData {
    elyos: RankingCharacter[]
    asmodian: RankingCharacter[]
    server: RankingCharacter[]
    class: RankingCharacter[]
}

export default function RankingWidget() {
    const [filterMode, setFilterMode] = useState<FilterMode>('race')
    const [selectedServer, setSelectedServer] = useState<string>('1001')
    const [selectedClass, setSelectedClass] = useState<string>('검성')
    const [rankingData, setRankingData] = useState<RankingData>({
        elyos: [], asmodian: [], server: [], class: []
    })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Fetch data based on filter mode
    useEffect(() => {
        const fetchRanking = async () => {
            setLoading(true)
            setError(null)
            try {
                if (filterMode === 'race') {
                    // Fetch both races in parallel
                    const [elyosRes, asmodianRes] = await Promise.all([
                        fetch('/api/ranking?limit=5&type=cp&race=Elyos'),
                        fetch('/api/ranking?limit=5&type=cp&race=Asmodian')
                    ])
                    if (!elyosRes.ok || !asmodianRes.ok) throw new Error('서버 응답 오류')
                    const elyosJson = await elyosRes.json()
                    const asmodianJson = await asmodianRes.json()
                    setRankingData(prev => ({
                        ...prev,
                        elyos: elyosJson.data || [],
                        asmodian: asmodianJson.data || []
                    }))
                } else if (filterMode === 'server') {
                    const res = await fetch(`/api/ranking?limit=5&type=cp&server=${selectedServer}`)
                    if (!res.ok) throw new Error('서버 응답 오류')
                    const json = await res.json()
                    setRankingData(prev => ({ ...prev, server: json.data || [] }))
                } else if (filterMode === 'class') {
                    const res = await fetch(`/api/ranking?limit=50&type=cp&class=${encodeURIComponent(selectedClass)}`)
                    if (!res.ok) throw new Error('서버 응답 오류')
                    const json = await res.json()
                    setRankingData(prev => ({ ...prev, class: json.data || [] }))
                }
            } catch (err) {
                console.error("Failed to fetch ranking:", err)
                setError('랭킹 데이터를 불러올 수 없습니다')
            } finally {
                setLoading(false)
            }
        }
        fetchRanking()
    }, [filterMode, selectedServer, selectedClass])

    const renderRaceRanking = () => {
        const { elyos, asmodian } = rankingData
        return (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {/* Elyos Column */}
                <div>
                    <div style={{
                        fontSize: '0.75rem', fontWeight: 'bold', color: '#4BC0C0',
                        marginBottom: '0.5rem', padding: '0.25rem 0',
                        borderBottom: '1px solid rgba(75, 192, 192, 0.3)'
                    }}>천족 TOP 5</div>
                    {elyos.length === 0 ? (
                        <div style={{ color: 'var(--text-disabled)', fontSize: '0.8rem', padding: '0.5rem 0' }}>데이터 없음</div>
                    ) : elyos.map((char, idx) => (
                        <RankingMiniItem key={char.character_id} character={char} rank={idx + 1} raceColor="#4BC0C0" />
                    ))}
                </div>
                {/* Asmodian Column */}
                <div>
                    <div style={{
                        fontSize: '0.75rem', fontWeight: 'bold', color: '#FF6384',
                        marginBottom: '0.5rem', padding: '0.25rem 0',
                        borderBottom: '1px solid rgba(255, 99, 132, 0.3)'
                    }}>마족 TOP 5</div>
                    {asmodian.length === 0 ? (
                        <div style={{ color: 'var(--text-disabled)', fontSize: '0.8rem', padding: '0.5rem 0' }}>데이터 없음</div>
                    ) : asmodian.map((char, idx) => (
                        <RankingMiniItem key={char.character_id} character={char} rank={idx + 1} raceColor="#FF6384" />
                    ))}
                </div>
            </div>
        )
    }

    const renderServerRanking = () => {
        const { server } = rankingData
        return (
            <div>
                {/* Server Dropdown */}
                <select
                    value={selectedServer}
                    onChange={(e) => setSelectedServer(e.target.value)}
                    style={{
                        width: '100%', padding: '0.5rem',
                        background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
                        fontSize: '0.85rem', marginBottom: '0.75rem', cursor: 'pointer'
                    }}
                >
                    {SERVERS.map(s => (
                        <option key={s.id} value={s.id} style={{ background: '#1a1a1a' }}>{s.name}</option>
                    ))}
                </select>
                {/* Server Ranking List */}
                <div style={{
                    fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)',
                    marginBottom: '0.5rem', padding: '0.25rem 0',
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}>{SERVER_MAP[selectedServer]} TOP 5</div>
                {server.length === 0 ? (
                    <div style={{ color: 'var(--text-disabled)', fontSize: '0.8rem', padding: '0.5rem 0' }}>데이터 없음</div>
                ) : server.map((char, idx) => (
                    <RankingMiniItem key={char.character_id} character={char} rank={idx + 1} showClass />
                ))}
            </div>
        )
    }

    const renderClassRanking = () => {
        const { class: classData } = rankingData
        return (
            <div>
                {/* Class Tabs */}
                <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: '0.25rem',
                    marginBottom: '0.75rem'
                }}>
                    {CLASSES.map(cls => (
                        <button
                            key={cls}
                            onClick={() => setSelectedClass(cls)}
                            style={{
                                padding: '0.3rem 0.5rem', fontSize: '0.7rem',
                                borderRadius: '4px', cursor: 'pointer',
                                border: selectedClass === cls ? '1px solid var(--brand-red-main)' : '1px solid rgba(255,255,255,0.1)',
                                background: selectedClass === cls ? 'rgba(var(--brand-red-rgb), 0.2)' : 'transparent',
                                color: selectedClass === cls ? 'var(--brand-red-main)' : 'var(--text-secondary)',
                                fontWeight: selectedClass === cls ? 'bold' : 'normal',
                                transition: 'all 0.2s'
                            }}
                        >
                            {cls}
                        </button>
                    ))}
                </div>
                {/* Class Ranking List */}
                <div style={{
                    fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--brand-red-main)',
                    marginBottom: '0.5rem', padding: '0.25rem 0',
                    borderBottom: '1px solid rgba(var(--brand-red-rgb), 0.3)'
                }}>{selectedClass} 전투력 랭킹</div>
                <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    {classData.length === 0 ? (
                        <div style={{ color: 'var(--text-disabled)', fontSize: '0.8rem', padding: '0.5rem 0' }}>데이터 없음</div>
                    ) : classData.map((char, idx) => (
                        <RankingMiniItem key={char.character_id} character={char} rank={idx + 1} showServer />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <section style={{
            marginBottom: '1rem',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)',
            borderRadius: '12px', padding: '1rem',
            border: '1px solid rgba(255,255,255,0.05)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h2 style={{
                    fontSize: '0.85rem', fontWeight: 'bold', color: '#9CA3AF',
                    letterSpacing: '-0.02em', margin: 0
                }}>실시간 전투력 랭킹</h2>
                <Link href="/ranking" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                    전체보기 &gt;
                </Link>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }} role="tablist">
                {(['race', 'server', 'class'] as const).map((mode) => {
                    const labels = { race: '종족', server: '서버', class: '직업' }
                    return (
                        <button
                            key={mode}
                            role="tab"
                            aria-selected={filterMode === mode}
                            onClick={() => setFilterMode(mode)}
                            style={{
                                padding: '0.4rem 0.8rem', borderRadius: '16px', fontSize: '0.8rem',
                                background: filterMode === mode ? 'rgba(255,255,255,0.1)' : 'transparent',
                                border: filterMode === mode ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
                                color: filterMode === mode ? 'var(--text-main)' : 'var(--text-secondary)',
                                fontWeight: filterMode === mode ? 'bold' : 'normal',
                                cursor: 'pointer', transition: 'all 0.2s'
                            }}
                        >{labels[mode]}</button>
                    )
                })}
            </div>

            {/* Content */}
            <div>
                {loading ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                        <div style={{
                            width: '20px', height: '20px',
                            border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--brand-red-main)',
                            borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                            margin: '0 auto 0.4rem'
                        }} />
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>로딩중...</span>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                ) : error ? (
                    <div style={{
                        padding: '1.5rem', textAlign: 'center', color: '#f87171',
                        background: 'rgba(248, 113, 113, 0.1)', borderRadius: '8px', fontSize: '0.8rem'
                    }}>{error}</div>
                ) : (
                    <>
                        {filterMode === 'race' && renderRaceRanking()}
                        {filterMode === 'server' && renderServerRanking()}
                        {filterMode === 'class' && renderClassRanking()}
                    </>
                )}
            </div>
        </section>
    )
}

// Mini ranking item component
interface RankingMiniItemProps {
    character: RankingCharacter
    rank: number
    raceColor?: string
    showClass?: boolean
    showServer?: boolean
}

function RankingMiniItem({ character, rank, raceColor, showClass, showServer }: RankingMiniItemProps) {
    const isElyos = character.race_name?.toLowerCase() === 'elyos'
    const color = raceColor || (isElyos ? '#4BC0C0' : '#FF6384')
    const serverName = SERVER_MAP[character.server_id] || character.server_id

    return (
        <Link
            href={`/c/${encodeURIComponent(serverName)}/${encodeURIComponent(character.name)}`}
            style={{ textDecoration: 'none', display: 'block' }}
        >
            <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)',
                transition: 'background 0.2s', cursor: 'pointer'
            }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
                {/* Rank Badge */}
                <div style={{
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: rank <= 3 ? (rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32') : 'rgba(255,255,255,0.1)',
                    color: rank <= 3 ? '#000' : 'var(--text-secondary)',
                    fontSize: '0.65rem', fontWeight: 'bold',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                }}>{rank}</div>

                {/* Profile Image */}
                <div style={{
                    width: '24px', height: '24px', borderRadius: '50%', overflow: 'hidden',
                    border: `1.5px solid ${color}`, flexShrink: 0, background: '#222'
                }}>
                    <img
                        src={character.profile_image || '/placeholder-avatar.svg'}
                        alt={character.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-avatar.svg' }}
                    />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        color: 'var(--text-main)', fontSize: '0.8rem', fontWeight: '600',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>{character.name}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-disabled)' }}>
                        {showClass && character.class_name}
                        {showServer && serverName}
                        {!showClass && !showServer && (isElyos ? '천족' : '마족')}
                    </div>
                </div>

                {/* HITON Score */}
                <div style={{
                    fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--brand-red-main)',
                    flexShrink: 0
                }}>
                    {(character.noa_score || character.hiton_score || 0).toLocaleString()}
                </div>
            </div>
        </Link>
    )
}
