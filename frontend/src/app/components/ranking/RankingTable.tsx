'use client'

import { useEffect, useState, memo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Trophy, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react'
import styles from './Ranking.module.css'
import { SERVER_MAP } from '../../constants/servers'
import { RankingCharacter } from '../../../types/character'


interface RankingTableProps {
    type: 'hiton' | 'cp' | 'content'
}

// 순위 변동 계산
interface RankChange {
    type: 'up' | 'down' | 'same' | 'new'
    amount?: number
}

const getRankChange = (currentRank: number, prevRank?: number | null): RankChange => {
    if (prevRank === null || prevRank === undefined) {
        return { type: 'new' }
    }
    if (prevRank === currentRank) {
        return { type: 'same' }
    }
    if (prevRank > currentRank) {
        return { type: 'up', amount: prevRank - currentRank }
    }
    return { type: 'down', amount: currentRank - prevRank }
}



const RankingSkeleton = () => (
    <div style={{ paddingBottom: '2rem' }}>
        <table className={styles.rankingTable}>
            <thead>
                <tr>
                    <th style={{ width: '60px', textAlign: 'center' }}>변동</th>
                    <th style={{ width: '60px', textAlign: 'center' }}>순위</th>
                    <th>캐릭터</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>서버/종족</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>아이템Lv</th>
                    <th style={{ width: '120px', textAlign: 'right' }}>HITON 전투력</th>
                </tr>
            </thead>
            <tbody>
                {[...Array(10)].map((_, i) => (
                    <tr key={i}>
                        <td style={{ textAlign: 'center' }}>
                            <div className={`${styles.skeleton} ${styles.skeletonText}`} style={{ width: '30px', margin: '0 auto' }}></div>
                        </td>
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
                            <div className={`${styles.skeleton} ${styles.skeletonText}`} style={{ width: '80px', marginLeft: 'auto' }}></div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
)

// 변동 셀 컴포넌트
const RankChangeCell = memo(function RankChangeCell({ change, prevRank, currentRank }: { change: RankChange, prevRank?: number | null, currentRank: number }) {
    const [showTooltip, setShowTooltip] = useState(false)

    const getChangeDisplay = () => {
        switch (change.type) {
            case 'up':
                return (
                    <div className={`${styles.rankChange} ${styles.rankChangeUp}`}>
                        <TrendingUp size={14} />
                        <span>{change.amount}</span>
                    </div>
                )
            case 'down':
                return (
                    <div className={`${styles.rankChange} ${styles.rankChangeDown}`}>
                        <TrendingDown size={14} />
                        <span>{change.amount}</span>
                    </div>
                )
            case 'new':
                return (
                    <div className={`${styles.rankChange} ${styles.rankChangeNew}`}>
                        <span>NEW</span>
                    </div>
                )
            default:
                return (
                    <div className={`${styles.rankChange} ${styles.rankChangeSame}`}>
                        <Minus size={14} />
                    </div>
                )
        }
    }

    const getTooltipText = () => {
        if (change.type === 'new') return '신규 진입'
        if (change.type === 'same') return '변동 없음'
        if (change.type === 'up') return `어제 ${prevRank}위 → 오늘 ${currentRank}위`
        return `어제 ${prevRank}위 → 오늘 ${currentRank}위`
    }

    return (
        <div
            className={styles.rankChangeWrapper}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            {getChangeDisplay()}
            {showTooltip && (
                <div className={styles.rankChangeTooltip}>
                    {getTooltipText()}
                </div>
            )}
        </div>
    )
})



export default function RankingTable({ type }: RankingTableProps) {
    const searchParams = useSearchParams()
    const [data, setData] = useState<RankingCharacter[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(false)
    const [isLoadingMore, setIsLoadingMore] = useState(false)

    // Reset and fetch when filters change
    useEffect(() => {
        setPage(1)
        fetchRanking(1, true)
    }, [searchParams, type])

    const fetchRanking = async (pageNum: number, isReset: boolean = false) => {
        if (isReset) {
            setLoading(true)
        } else {
            setIsLoadingMore(true)
        }

        try {
            const params = new URLSearchParams(searchParams.toString())
            // noa → hiton 매핑 (API 호환성)
            const apiType = type === 'hiton' ? 'noa' : type
            params.set('type', apiType)
            params.set('page', pageNum.toString())
            params.set('limit', '50')

            const res = await fetch(`/api/ranking?${params.toString()}`)
            const json = await res.json()

            if (json.data) {
                // noa_score를 hiton_score로 매핑
                const mappedData = json.data.map((char: any) => ({
                    ...char,
                    hiton_score: char.noa_score || char.hiton_score,
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

    const getRankIcon = (index: number) => {
        const rank = index + 1
        if (rank === 1) return <Trophy className={`${styles.rankIcon} ${styles.rankIconGold}`} />
        if (rank === 2) return <Trophy className={`${styles.rankIcon} ${styles.rankIconSilver}`} />
        if (rank === 3) return <Trophy className={`${styles.rankIcon} ${styles.rankIconBronze}`} />
        return <span className={styles.rankNumber}>{rank}</span>
    }

    // HITON 탭인 경우에만 확장 컬럼 표시
    const isHitonTab = type === 'hiton'

    const getScoreValue = (char: RankingCharacter) => {
        switch (type) {
            case 'hiton': return char.hiton_score?.toLocaleString() || 0
            case 'cp': return char.combat_power?.toLocaleString() || 0
            case 'content': return char.ranking_ap?.toLocaleString() || 0
            default: return 0
        }
    }

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
            <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
                <table className={styles.rankingTable}>
                    <thead>
                        <tr>
                            {isHitonTab && <th style={{ width: '60px', textAlign: 'center' }}>변동</th>}
                            <th style={{ width: '60px', textAlign: 'center' }}>순위</th>
                            <th>캐릭터</th>
                            <th style={{ width: '100px', textAlign: 'center' }}>서버/종족</th>
                            {isHitonTab && <th style={{ width: '80px', textAlign: 'center' }}>아이템Lv</th>}
                            {isHitonTab && (
                                <>
                                    <th style={{ width: '90px', textAlign: 'right' }}>PVE</th>
                                    <th style={{ width: '90px', textAlign: 'right' }}>PVP</th>
                                </>
                            )}
                            {!isHitonTab && <th style={{ textAlign: 'right' }}>{type === 'cp' ? '전투력' : '어비스 포인트'}</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((char, idx) => {
                            const currentRank = idx + 1
                            const rankChange = getRankChange(currentRank, char.prev_rank)
                            // 1등 전투력 기준으로 티어 계산 (상대 평가)
                            const topPower = data[0]?.hiton_score || char.hiton_score || 1

                            return (
                                <tr
                                    key={`${char.character_id}_${idx}`}
                                    className={`
                                        ${idx === 0 ? styles.rankRow1 : ''}
                                        ${idx === 1 ? styles.rankRow2 : ''}
                                        ${idx === 2 ? styles.rankRow3 : ''}
                                        ${idx === 2 ? styles.rankRow3 : ''}
                                    `}
                                >
                                    {isHitonTab && (
                                        <td style={{ textAlign: 'center' }}>
                                            <RankChangeCell
                                                change={rankChange}
                                                prevRank={char.prev_rank}
                                                currentRank={currentRank}
                                            />
                                        </td>
                                    )}
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
                                        <div className={`${styles.charDetail} ${char.race_name === 'Elyos' ? styles.elyos : styles.asmodian}`}>
                                            {char.race_name === 'Elyos' ? '천족' : '마족'}
                                        </div>
                                    </td>
                                    {isHitonTab && (
                                        <td style={{ textAlign: 'center' }}>
                                            <div className={styles.itemLevelValue}>
                                                {char.item_level ?? '-'}
                                            </div>
                                        </td>
                                    )}

                                    {isHitonTab ? (
                                        <>
                                            <td style={{ textAlign: 'right' }}>
                                                <div className={styles.scoreValue} style={{ color: '#4ade80' }}>
                                                    {(char.pve_score || char.hiton_score || 0).toLocaleString()}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div className={styles.scoreValue} style={{ color: '#f87171' }}>
                                                    {char.pvp_score?.toLocaleString() || '-'}
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <td style={{ textAlign: 'right' }}>
                                            <div className={styles.scoreValue}>
                                                {getScoreValue(char)}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
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
