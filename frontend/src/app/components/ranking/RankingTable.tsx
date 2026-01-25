'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Trophy } from 'lucide-react'
import styles from './Ranking.module.css'
import { SERVER_MAP } from '../../constants/servers'
import { RankingCharacter } from '../../../types/character'

// 전투력 표시 유효성 검사 (45레벨 미만이거나 비정상 전투력인 경우 표시 안 함)
const getValidScore = (char: RankingCharacter, scoreType: 'pve' | 'pvp'): number | null => {
    const level = char.level || char.item_level || 0
    const isValidLevel = level >= 45
    const isAbnormalScore = char.pve_score === 177029 && char.pvp_score === 177029

    if (!isValidLevel || isAbnormalScore) return null

    if (scoreType === 'pve') {
        return char.pve_score || 0
    }
    return char.pvp_score || 0
}

interface RankingTableProps {
    type: 'combat' | 'content' | 'hiton' | 'cp' // hiton, cp는 하위 호환
}

const RankingSkeleton = () => (
    <div style={{ paddingBottom: '2rem' }}>
        <table className={styles.rankingTable}>
            <thead>
                <tr>
                    <th style={{ width: '60px', textAlign: 'center' }}>순위</th>
                    <th>캐릭터</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>서버/종족</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>아이템Lv</th>
                    <th style={{ width: '90px', textAlign: 'right' }}>PVE</th>
                    <th style={{ width: '90px', textAlign: 'right' }}>PVP</th>
                </tr>
            </thead>
            <tbody>
                {[...Array(10)].map((_, i) => (
                    <tr key={i}>
                        <td style={{ textAlign: 'center' }}>
                            <div className={`${styles.skeleton} ${styles.skeletonText}`} style={{ width: '20px', margin: '0 auto' }}></div>
                        </td>
                        <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div className={`${styles.skeleton} ${styles.skeletonCircle}`}></div>
                                <div style={{ flex: 1 }}>
                                    <div className={`${styles.skeleton} ${styles.skeletonText}`} style={{ width: '120px' }}></div>
                                    <div className={`${styles.skeleton} ${styles.skeletonTextShort}`}></div>
                                </div>
                            </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                            <div className={`${styles.skeleton} ${styles.skeletonText}`} style={{ width: '60px', margin: '0 auto' }}></div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                            <div className={`${styles.skeleton} ${styles.skeletonText}`} style={{ width: '40px', margin: '0 auto' }}></div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                            <div className={`${styles.skeleton} ${styles.skeletonText}`} style={{ width: '60px', marginLeft: 'auto' }}></div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                            <div className={`${styles.skeleton} ${styles.skeletonText}`} style={{ width: '60px', marginLeft: 'auto' }}></div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
)

export default function RankingTable({ type }: RankingTableProps) {
    const searchParams = useSearchParams()
    const [data, setData] = useState<RankingCharacter[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(false)
    const [isLoadingMore, setIsLoadingMore] = useState(false)

    // 타입 정규화 (hiton, cp → combat)
    const normalizedType = (type === 'hiton' || type === 'cp') ? 'combat' : type
    const isCombatTab = normalizedType === 'combat'

    // searchParams를 문자열로 변환하여 실제 값이 변경될 때만 트리거
    const searchParamsString = searchParams.toString()

    // Reset and fetch when filters change
    useEffect(() => {
        setPage(1)
        fetchRanking(1, true)
    }, [searchParamsString, normalizedType])

    const fetchRanking = async (pageNum: number, isReset: boolean = false) => {
        if (isReset) {
            setLoading(true)
        } else {
            setIsLoadingMore(true)
        }

        try {
            const params = new URLSearchParams(searchParams.toString())
            params.set('type', normalizedType)
            params.set('page', pageNum.toString())
            params.set('limit', '50')

            const res = await fetch(`/api/ranking?${params.toString()}`)
            const json = await res.json()

            if (json.data) {
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

    const getRankIcon = (index: number) => {
        const rank = index + 1
        if (rank === 1) return <Trophy className={`${styles.rankIcon} ${styles.rankIconGold}`} />
        if (rank === 2) return <Trophy className={`${styles.rankIcon} ${styles.rankIconSilver}`} />
        if (rank === 3) return <Trophy className={`${styles.rankIcon} ${styles.rankIconBronze}`} />
        return <span className={styles.rankNumber}>{rank}</span>
    }

    // 현재 정렬 기준
    const currentSort = searchParams.get('sort') || 'pve'

    if (loading && page === 1) {
        return <RankingSkeleton />
    }

    if (!data || data.length === 0) {
        return (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#6B7280' }}>
                <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>검색 결과가 없습니다.</div>
                <div style={{ fontSize: '0.9rem' }}>필터 설정을 변경해보세요.</div>
            </div>
        )
    }

    return (
        <div style={{ paddingBottom: '2rem' }}>
            {/* Desktop Table: Hidden on Mobile via CSS */}
            <div style={{ overflowX: 'auto', marginBottom: '1rem' }} className={styles.rankingTableWrapper}>
                <table className={styles.rankingTable}>
                    <thead>
                        <tr>
                            <th style={{ width: '60px', textAlign: 'center' }}>순위</th>
                            <th>캐릭터</th>
                            <th style={{ width: '100px', textAlign: 'center' }}>서버/종족</th>
                            {isCombatTab && <th style={{ width: '80px', textAlign: 'center' }}>아이템Lv</th>}
                            {isCombatTab && (
                                <>
                                    <th style={{ width: '90px', textAlign: 'right' }}>
                                        <span style={{ color: currentSort === 'pve' ? '#f59e0b' : undefined }}>PVE</span>
                                    </th>
                                    <th style={{ width: '90px', textAlign: 'right' }}>
                                        <span style={{ color: currentSort === 'pvp' ? '#f59e0b' : undefined }}>PVP</span>
                                    </th>
                                </>
                            )}
                            {!isCombatTab && <th style={{ textAlign: 'right' }}>어비스 포인트</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((char, idx) => {
                            return (
                                <tr
                                    key={`${char.character_id}_${idx}`}
                                    className={`
                                        ${idx === 0 ? styles.rankRow1 : ''}
                                        ${idx === 1 ? styles.rankRow2 : ''}
                                        ${idx === 2 ? styles.rankRow3 : ''}
                                    `}
                                >
                                    <td style={{ textAlign: 'center' }}>
                                        <div className={styles.rankCell}>
                                            {getRankIcon(idx)}
                                        </div>
                                    </td>
                                    <td>
                                        <Link
                                            href={`/c/${encodeURIComponent(SERVER_MAP[char.server_id] || char.server_id)}/${encodeURIComponent(char.name)}`}
                                            className={styles.charLink}
                                        >
                                            <div className={styles.charImageWrapper}>
                                                {char.profile_image ? (
                                                    <Image
                                                        src={char.profile_image}
                                                        alt={char.name}
                                                        width={48}
                                                        height={48}
                                                        className={styles.charImage}
                                                    />
                                                ) : (
                                                    <div className={styles.charImagePlaceholder}>
                                                        {char.name.substring(0, 1)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className={styles.charInfo}>
                                                <div className={styles.charName}>
                                                    {char.name}
                                                </div>
                                                <div className={styles.charDetail}>
                                                    Lv.{char.level} {char.class_name}
                                                </div>
                                            </div>
                                        </Link>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.9rem', color: '#E5E7EB' }}>
                                            {SERVER_MAP[char.server_id] || char.server_id}
                                        </div>
                                        <div
                                            className={`${styles.charDetail} ${char.race_name === 'Elyos' ? styles.elyos : styles.asmodian}`}
                                            style={{ justifyContent: 'center' }}
                                        >
                                            {char.race_name === 'Elyos' ? '천족' : '마족'}
                                        </div>
                                    </td>
                                    {isCombatTab && (
                                        <td style={{ textAlign: 'center' }}>
                                            <div className={styles.itemLevelValue}>
                                                {char.item_level ?? '-'}
                                            </div>
                                        </td>
                                    )}

                                    {isCombatTab ? (
                                        <>
                                            <td style={{ textAlign: 'right' }}>
                                                <div
                                                    className={styles.scoreValue}
                                                    style={{ color: currentSort === 'pve' ? '#f59e0b' : '#4ade80' }}
                                                >
                                                    {getValidScore(char, 'pve')?.toLocaleString() ?? '-'}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div
                                                    className={styles.scoreValue}
                                                    style={{ color: currentSort === 'pvp' ? '#f59e0b' : '#f87171' }}
                                                >
                                                    {getValidScore(char, 'pvp')?.toLocaleString() ?? '-'}
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <td style={{ textAlign: 'right' }}>
                                            <div className={styles.scoreValue}>
                                                {char.ranking_ap?.toLocaleString() || 0}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile List: Hidden on Desktop via CSS */}
            <div className={styles.mobileRankingList}>
                {data.map((char, idx) => {
                    const currentRank = idx + 1
                    const rankClass = currentRank === 1 ? styles.rank1 : currentRank === 2 ? styles.rank2 : currentRank === 3 ? styles.rank3 : ''
                    const raceClass = char.race_name === 'Elyos' ? styles.elyos : styles.asmodian

                    return (
                        <div key={`m-${char.character_id}_${idx}`} className={styles.mobileRankingCard}>
                            <div className={styles.cardHeader}>
                                <div className={styles.rankBadge}>
                                    <span className={`${styles.rankNumberMobile} ${rankClass}`}>#{currentRank}</span>
                                </div>
                            </div>

                            <Link
                                href={`/c/${encodeURIComponent(SERVER_MAP[char.server_id] || char.server_id)}/${encodeURIComponent(char.name)}`}
                                className={styles.cardBody}
                            >
                                <div className={styles.avatarMobile}>
                                    {char.profile_image ? (
                                        <Image src={char.profile_image} alt={char.name} width={56} height={56} style={{ objectFit: 'cover' }} />
                                    ) : (
                                        <div className={styles.charImagePlaceholder} style={{ fontSize: '1.5rem' }}>
                                            {char.name.substring(0, 1)}
                                        </div>
                                    )}
                                </div>
                                <div className={styles.infoMobile}>
                                    <div className={styles.nameMobile}>{char.name}</div>
                                    <div className={styles.metaMobile}>
                                        <span>{SERVER_MAP[char.server_id] || char.server_id}</span>
                                        <span className={styles.separator}>|</span>
                                        <span className={raceClass}>{char.race_name === 'Elyos' ? '천족' : '마족'}</span>
                                        <span className={styles.separator}>|</span>
                                        <span style={{ marginRight: '8px' }}>{char.class_name}</span>

                                        <div className={styles.inlineStats}>
                                            <span className={styles.statTag} style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)' }}>
                                                Lv.{char.item_level || '-'}
                                            </span>
                                            {isCombatTab ? (
                                                <>
                                                    <span className={styles.statTag} style={{
                                                        color: currentSort === 'pve' ? '#f59e0b' : '#4ade80',
                                                        background: currentSort === 'pve' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(74, 222, 128, 0.1)'
                                                    }}>
                                                        E {getValidScore(char, 'pve')?.toLocaleString() ?? '-'}
                                                    </span>
                                                    <span className={styles.statTag} style={{
                                                        color: currentSort === 'pvp' ? '#f59e0b' : '#f87171',
                                                        background: currentSort === 'pvp' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(248, 113, 113, 0.1)'
                                                    }}>
                                                        P {getValidScore(char, 'pvp')?.toLocaleString() ?? '-'}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className={styles.statTag} style={{ color: '#FACC15', background: 'rgba(250, 204, 21, 0.1)' }}>
                                                    AP {char.ranking_ap?.toLocaleString() || 0}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    )
                })}
            </div>

            {hasMore && (
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <button
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className={styles.loadMoreButton}
                    >
                        {isLoadingMore ? '불러오는 중...' : '더보기 (Next 50)'}
                    </button>
                </div>
            )}
        </div>
    )
}
