import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from '@/app/Home.module.css'
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
            <div className={styles.rankingGrid}>
                {/* Elyos Column */}
                <div>
                    <div className={`${styles.rankingColumnHeader} ${styles.elyosHeader}`}>
                        천족 TOP 5
                    </div>
                    {elyos.length === 0 ? (
                        <div className={styles.loadingState}>데이터 없음</div>
                    ) : elyos.map((char, idx) => (
                        <RankingMiniItem key={char.character_id} character={char} rank={idx + 1} raceColor="var(--elyos)" />
                    ))}
                </div>
                {/* Asmodian Column */}
                <div>
                    <div className={`${styles.rankingColumnHeader} ${styles.asmodianHeader}`}>
                        마족 TOP 5
                    </div>
                    {asmodian.length === 0 ? (
                        <div className={styles.loadingState}>데이터 없음</div>
                    ) : asmodian.map((char, idx) => (
                        <RankingMiniItem key={char.character_id} character={char} rank={idx + 1} raceColor="var(--asmodian)" />
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
                        width: '100%', padding: '0.6rem 0.8rem',
                        background: '#0a0a0a', color: 'var(--text-main)',
                        border: '1px solid #222', borderRadius: '8px',
                        fontSize: '0.9rem', marginBottom: '1rem', cursor: 'pointer',
                        outline: 'none'
                    }}
                >
                    {SERVERS.map(s => (
                        <option key={s.id} value={s.id} style={{ background: '#1a1a1a' }}>{s.name}</option>
                    ))}
                </select>
                {/* Server Ranking List */}
                <div className={styles.rankingColumnHeader} style={{ color: 'var(--text-secondary)' }}>
                    {SERVER_MAP[selectedServer]} TOP 5
                </div>
                {server.length === 0 ? (
                    <div className={styles.loadingState}>데이터 없음</div>
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
                                padding: '0.3rem 0.5rem', fontSize: '0.8rem',
                                borderRadius: '4px', cursor: 'pointer',
                                border: selectedClass === cls ? '1px solid #f59e0b' : '1px solid #222',
                                background: selectedClass === cls ? '#111' : '#0a0a0a',
                                color: selectedClass === cls ? '#f59e0b' : '#9CA3AF',
                                fontWeight: selectedClass === cls ? '800' : '500',
                                transition: 'all 0.2s',
                                fontFamily: 'Rajdhani, sans-serif'
                            }}
                        >
                            {cls}
                        </button>
                    ))}
                </div>
                {/* Class Ranking List */}
                <div className={styles.rankingColumnHeader} style={{ color: '#f59e0b', borderBottomColor: '#333' }}>
                    {selectedClass} 전투력 랭킹
                </div>
                <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    {classData.length === 0 ? (
                        <div className={styles.loadingState}>데이터 없음</div>
                    ) : classData.map((char, idx) => (
                        <RankingMiniItem key={char.character_id} character={char} rank={idx + 1} showServer />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>실시간 전투력 랭킹</h2>
                <Link href="/ranking" className={styles.sectionLink}>
                    전체보기 &gt;
                </Link>
            </div>

            {/* Filter Tabs */}
            <div className={styles.tabList} role="tablist">
                {(['race', 'server', 'class'] as const).map((mode) => {
                    const labels = { race: '종족', server: '서버', class: '직업' }
                    return (
                        <button
                            key={mode}
                            role="tab"
                            aria-selected={filterMode === mode}
                            onClick={() => setFilterMode(mode)}
                            className={`${styles.tabButton} ${filterMode === mode ? styles.tabButtonActive : ''}`}
                        >{labels[mode]}</button>
                    )
                })}
            </div>

            {/* Content */}
            <div>
                {loading ? (
                    <div className={styles.loadingState}>
                        <div className={styles.loadingSpinner} />
                        <span>로딩중...</span>
                    </div>
                ) : error ? (
                    <div className={styles.errorState}>{error}</div>
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
    const color = raceColor || (isElyos ? 'var(--elyos)' : 'var(--asmodian)')
    const serverName = SERVER_MAP[character.server_id] || character.server_id

    return (
        <Link
            href={`/c/${encodeURIComponent(serverName)}/${encodeURIComponent(character.name)}`}
            className={styles.rankingItem}
        >
            {/* Rank Badge */}
            <div className={`${styles.rankBadge} ${rank === 1 ? styles.rankTop1 : rank === 2 ? styles.rankTop2 : rank === 3 ? styles.rankTop3 : ''}`}>
                {rank}
            </div>

            {/* Profile Image */}
            <div className={styles.charImage} style={{ borderColor: color }}>
                <img
                    src={character.profile_image || '/placeholder-avatar.svg'}
                    alt={character.name}
                    onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-avatar.svg' }}
                />
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div className={styles.charName}>{character.name}</div>
                <div className={styles.charMeta}>
                    {showClass && character.class_name}
                    {showServer && serverName}
                    {!showClass && !showServer && (isElyos ? '천족' : '마족')}
                </div>
            </div>

            {/* HITON Score */}
            <div className={styles.charScore}>
                {(character.pve_score || character.hiton_score || 0).toLocaleString()}
            </div>
        </Link>
    )
}