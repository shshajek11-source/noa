'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import styles from './RankingMobile.module.css'
import { SERVER_MAP } from '../../constants/servers'
import { getValidScore } from '../../utils/ranking'
import { RankingCharacter } from '../../../types/character'

interface RankingMobileProps {
    type: 'combat' | 'content' | 'hiton' | 'cp' // hiton, cp는 하위 호환
}

export default function RankingMobile({ type }: RankingMobileProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [data, setData] = useState<RankingCharacter[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(false)
    const [isLoadingMore, setIsLoadingMore] = useState(false)

    // 타입 정규화
    const normalizedType = (type === 'hiton' || type === 'cp') ? 'combat' : type
    const isCombatTab = normalizedType === 'combat'

    // 필터 상태
    const [selectedServer, setSelectedServer] = useState('all')
    const [selectedRace, setSelectedRace] = useState('all')
    const [activeType, setActiveType] = useState<'combat' | 'content'>(normalizedType)

    // URL params에서 sort 값 읽기 (새로고침/공유 시 유지)
    const sortFromUrl = searchParams.get('sort') as 'pve' | 'pvp' | null
    const [sortBy, setSortBy] = useState<'pve' | 'pvp'>(sortFromUrl || 'pvp')

    // URL params 변경 시 sortBy 동기화
    useEffect(() => {
        const urlSort = searchParams.get('sort') as 'pve' | 'pvp' | null
        if (urlSort && urlSort !== sortBy) {
            setSortBy(urlSort)
        }
    }, [searchParams])

    // sortBy 변경 시 URL 업데이트
    const handleSortChange = (newSort: 'pve' | 'pvp') => {
        setSortBy(newSort)
        const params = new URLSearchParams(searchParams.toString())
        params.set('sort', newSort)
        router.push(`?${params.toString()}`, { scroll: false })
    }

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
        setData([])  // 이전 데이터 즉시 제거 → 로딩 스켈레톤 표시
        setPage(1)
        fetchRanking(1, true)
    }, [activeType, selectedServer, selectedRace, sortBy])

    const fetchRanking = async (pageNum: number, isReset: boolean = false) => {
        if (isReset) {
            setLoading(true)
        } else {
            setIsLoadingMore(true)
        }

        try {
            const params = new URLSearchParams()
            params.set('type', activeType)
            params.set('page', pageNum.toString())
            params.set('limit', '30')

            if (activeType === 'combat') {
                params.set('sort', sortBy)
            }

            if (selectedServer !== 'all') {
                params.set('server', selectedServer)
            }
            if (selectedRace !== 'all') {
                params.set('race', selectedRace)
            }

            const res = await fetch(`/api/ranking?${params.toString()}`)

            // HTTP 상태 확인 - 에러 시 기존 데이터 유지
            if (!res.ok) {
                console.error('[RankingMobile] API Error:', res.status)
                return
            }

            const json = await res.json()

            // 에러 응답 확인
            if (json.error) {
                console.error('[RankingMobile] API returned error:', json.error)
                return
            }

            // 데이터 처리
            if (json.data && Array.isArray(json.data)) {
                if (isReset) {
                    setData(json.data)
                } else {
                    setData(prev => [...prev, ...json.data])
                }

                const totalPages = json.meta?.totalPages || 0
                setHasMore(pageNum < totalPages)
                if (!isReset) setPage(pageNum)
            }
        } catch (error) {
            console.error('[RankingMobile] Failed to fetch:', error)
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

    const handleTypeChange = (newType: 'combat' | 'content') => {
        setActiveType(newType)
        if (newType === 'combat') {
            router.push('/ranking')
        } else {
            router.push('/ranking/content')
        }
    }

    return (
        <div className={styles.container}>
            {/* 랭킹 타입 탭 */}
            <div className={styles.typeTabs}>
                <button
                    className={`${styles.typeTab} ${activeType === 'combat' ? styles.typeTabActive : ''}`}
                    onClick={() => handleTypeChange('combat')}
                >
                    전투력
                </button>
                <button
                    className={`${styles.typeTab} ${activeType === 'content' ? styles.typeTabActive : ''}`}
                    onClick={() => handleTypeChange('content')}
                >
                    컨텐츠
                </button>
            </div>

            {/* PVP 정렬 (전투력 탭에서만) */}
            {activeType === 'combat' && (
                <div className={styles.sortToggle}>
                    <button
                        className={`${styles.sortBtn} ${styles.sortBtnActive}`}
                    >
                        PVP
                    </button>
                </div>
            )}

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
                                    {activeType === 'combat' ? (
                                        <>
                                            <div className={styles.scoreRow}>
                                                <span className={styles.scoreLabel}>PVE</span>
                                                <span
                                                    className={styles.scoreValue}
                                                    style={{ color: sortBy === 'pve' ? '#f59e0b' : '#4ade80' }}
                                                >
                                                    {(getValidScore(char, 'pve') || 0).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className={styles.scoreRow}>
                                                <span className={styles.scoreLabel}>PVP</span>
                                                <span
                                                    className={styles.scoreValue}
                                                    style={{ color: sortBy === 'pvp' ? '#f59e0b' : '#f87171' }}
                                                >
                                                    {(getValidScore(char, 'pvp') || 0).toLocaleString()}
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className={styles.scoreRow}>
                                            <span className={styles.scoreLabel}>AP</span>
                                            <span className={styles.scoreValue}>
                                                {(char.ranking_ap || 0).toLocaleString()}
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
