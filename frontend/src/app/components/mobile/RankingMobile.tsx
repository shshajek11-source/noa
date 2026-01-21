'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import styles from './RankingMobile.module.css'
import { SERVER_MAP } from '../../constants/servers'
import { RankingCharacter } from '../../../types/character'

interface RankingMobileProps {
    type: 'hiton' | 'cp' | 'content'
}

export default function RankingMobile({ type }: RankingMobileProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [data, setData] = useState<RankingCharacter[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(false)
    const [isLoadingMore, setIsLoadingMore] = useState(false)

    // 필터 상태
    const [selectedServer, setSelectedServer] = useState('all')
    const [selectedRace, setSelectedRace] = useState('all')
    const [activeType, setActiveType] = useState(type)

    const servers = [
        { id: 'all', name: '전체 서버' },
        { id: '1', name: '지켈' },
        { id: '2', name: '이스라펠' },
        { id: '3', name: '아트레이아' },
    ]

    const races = [
        { id: 'all', name: '전체' },
        { id: 'Elyos', name: '천족' },
        { id: 'Asmodian', name: '마족' },
    ]

    useEffect(() => {
        setPage(1)
        fetchRanking(1, true)
    }, [activeType, selectedServer, selectedRace])

    const fetchRanking = async (pageNum: number, isReset: boolean = false) => {
        if (isReset) {
            setLoading(true)
        } else {
            setIsLoadingMore(true)
        }

        try {
            const params = new URLSearchParams()
            const apiType = activeType === 'hiton' ? 'noa' : activeType
            params.set('type', apiType)
            params.set('page', pageNum.toString())
            params.set('limit', '30')

            if (selectedServer !== 'all') {
                params.set('server', selectedServer)
            }
            if (selectedRace !== 'all') {
                params.set('race', selectedRace)
            }

            const res = await fetch(`/api/ranking?${params.toString()}`)
            const json = await res.json()

            if (json.data) {
                const mappedData = json.data.map((char: any) => ({
                    ...char,
                    hiton_score: char.pve_score || char.hiton_score,
                }))

                if (isReset) {
                    setData(mappedData)
                } else {
                    setData(prev => [...prev, ...mappedData])
                }

                const totalPages = json.meta?.totalPages || 0
                setHasMore(pageNum < totalPages)
                if (!isReset) setPage(pageNum)
            }
        } catch (error) {
            console.error('Failed to fetch ranking', error)
        } finally {
            setLoading(false)
            setIsLoadingMore(false)
        }
    }

    const handleLoadMore = () => {
        const nextPage = page + 1
        setPage(nextPage)
        fetchRanking(nextPage, false)
    }

    const handleTypeChange = (newType: 'hiton' | 'content') => {
        setActiveType(newType)
        if (newType === 'hiton') {
            router.push('/ranking/noa')
        } else {
            router.push('/ranking/content')
        }
    }

    const getScoreValue = (char: RankingCharacter) => {
        switch (activeType) {
            case 'hiton': return char.pve_score || char.hiton_score || 0
            case 'cp': return char.pve_score || char.combat_power || 0
            case 'content': return char.ranking_ap || 0
            default: return 0
        }
    }

    return (
        <div className={styles.container}>


            {/* 랭킹 타입 탭 */}
            <div className={styles.typeTabs}>
                <button
                    className={`${styles.typeTab} ${activeType === 'hiton' ? styles.typeTabActive : ''}`}
                    onClick={() => handleTypeChange('hiton')}
                >
                    PVE/PVP 전투력
                </button>
                <button
                    className={`${styles.typeTab} ${activeType === 'content' ? styles.typeTabActive : ''}`}
                    onClick={() => handleTypeChange('content')}
                >
                    콘텐츠 랭킹
                </button>
            </div>

            {/* 필터 */}
            <div className={styles.filterBar}>
                <select
                    value={selectedServer}
                    onChange={(e) => setSelectedServer(e.target.value)}
                    className={styles.filterSelect}
                >
                    {servers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
                <select
                    value={selectedRace}
                    onChange={(e) => setSelectedRace(e.target.value)}
                    className={styles.filterSelect}
                >
                    {races.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                </select>
            </div>

            {/* 랭킹 리스트 */}
            <div className={styles.rankingList}>
                {loading ? (
                    // 스켈레톤
                    [...Array(5)].map((_, i) => (
                        <div key={i} className={styles.rankingItem}>
                            <div className={styles.skeleton} style={{ width: '32px', height: '32px', borderRadius: '8px' }} />
                            <div style={{ flex: 1 }}>
                                <div className={styles.skeleton} style={{ width: '100px', height: '16px', marginBottom: '4px' }} />
                                <div className={styles.skeleton} style={{ width: '150px', height: '12px' }} />
                            </div>
                        </div>
                    ))
                ) : data.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p>검색 결과가 없습니다</p>
                        <span>필터 설정을 변경해보세요</span>
                    </div>
                ) : (
                    data.map((char, idx) => {
                        const rank = idx + 1
                        const isElyos = char.race_name === 'Elyos'

                        return (
                            <Link
                                key={`${char.character_id}_${idx}`}
                                href={`/c/${encodeURIComponent(SERVER_MAP[char.server_id] || char.server_id)}/${encodeURIComponent(char.name)}`}
                                className={styles.rankingItem}
                            >
                                <div className={`${styles.rankBadge} ${rank <= 3 ? styles[`rank${rank}`] : ''}`}>
                                    {rank}
                                </div>
                                <div className={styles.charAvatar}>
                                    {char.profile_image ? (
                                        <Image
                                            src={char.profile_image}
                                            alt={char.name}
                                            width={44}
                                            height={44}
                                            unoptimized
                                        />
                                    ) : (
                                        <span>{char.name.charAt(0)}</span>
                                    )}
                                </div>
                                <div className={styles.charInfo}>
                                    <div className={styles.charName}>{char.name}</div>
                                    <div className={styles.charMeta}>
                                        <span>{SERVER_MAP[char.server_id] || char.server_id}</span>
                                        <span className={styles.dot}>·</span>
                                        <span className={isElyos ? styles.elyos : styles.asmodian}>
                                            {isElyos ? '천족' : '마족'}
                                        </span>
                                        <span className={styles.dot}>·</span>
                                        <span>{char.class_name}</span>
                                    </div>
                                </div>
                                <div className={styles.charScore}>
                                    {activeType === 'hiton' ? (
                                        <>
                                            <div className={styles.scoreRow}>
                                                <span className={styles.scoreLabel}>PVE</span>
                                                <span className={styles.scoreValue} style={{ color: '#4ade80' }}>
                                                    {(char.pve_score || 0).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className={styles.scoreRow}>
                                                <span className={styles.scoreLabel}>PVP</span>
                                                <span className={styles.scoreValue} style={{ color: '#f87171' }}>
                                                    {(char.pvp_score || 0).toLocaleString()}
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className={styles.scoreRow}>
                                            <span className={styles.scoreLabel}>{activeType === 'cp' ? 'CP' : 'AP'}</span>
                                            <span className={styles.scoreValue}>
                                                {getScoreValue(char).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </Link>
                        )
                    })
                )}
            </div>

            {/* 더보기 버튼 */}
            {hasMore && !loading && (
                <div className={styles.loadMoreWrapper}>
                    <button
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className={styles.loadMoreBtn}
                    >
                        {isLoadingMore ? '불러오는 중...' : '더보기'}
                    </button>
                </div>
            )}

            {/* 하단 여백 (광고 영역용) */}
            <div className={styles.bottomSpacer} />
        </div>
    )
}
