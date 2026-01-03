'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Trophy } from 'lucide-react'
import styles from './Ranking.module.css'
import { SERVER_MAP } from '../../constants/servers'

interface RankingTableProps {
    type: 'noa' | 'cp' | 'content'
}

export default function RankingTable({ type }: RankingTableProps) {
    const searchParams = useSearchParams()
    const [data, setData] = useState<any[]>([])
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
            params.set('type', type)
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

                // Check if there are more pages
                const totalPages = json.meta?.totalPages || 0
                setHasMore(pageNum < totalPages)
                if (!isReset) setPage(pageNum) // Update current page state if not reset (reset sets it to 1 via effect/param)
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
        setPage(nextPage) // Update state
        fetchRanking(nextPage, false)
    }

    const getRankIcon = (index: number) => {
        const rank = index + 1
        if (rank === 1) return <Trophy className={`${styles.rankIcon} ${styles.rankIconGold}`} />
        if (rank === 2) return <Trophy className={`${styles.rankIcon} ${styles.rankIconSilver}`} />
        if (rank === 3) return <Trophy className={`${styles.rankIcon} ${styles.rankIconBronze}`} />
        return <span style={{ fontWeight: 'bold', color: '#6B7280' }}>{rank}</span>
    }

    const getScoreLabel = () => {
        switch (type) {
            case 'noa': return 'NOA 전투력'
            case 'cp': return '전투력'
            case 'content': return '어비스 포인트'
            default: return '점수'
        }
    }

    const getScoreValue = (char: any) => {
        switch (type) {
            case 'noa': return char.noa_score?.toLocaleString() || 0
            case 'cp': return char.combat_power?.toLocaleString() || 0
            case 'content': return char.ranking_ap?.toLocaleString() || 0
            default: return 0
        }
    }

    if (loading && page === 1) {
        return <div style={{ padding: '4rem', textAlign: 'center', color: '#6B7280' }}>데이터를 불러오는 중...</div>
    }

    if (!data || data.length === 0) {
        return <div style={{ padding: '4rem', textAlign: 'center', color: '#6B7280' }}>랭킹 데이터가 없습니다.</div>
    }

    return (
        <div style={{ paddingBottom: '2rem' }}>
            <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: '80px', textAlign: 'center' }}>순위</th>
                            <th>캐릭터</th>
                            <th>서버/종족</th>
                            <th style={{ textAlign: 'right' }}>{getScoreLabel()}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((char, idx) => (
                            <tr key={`${char.character_id}_${idx}`}>
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
                                                <img
                                                    src={char.profile_image}
                                                    alt={char.name}
                                                    className={styles.charImage}
                                                />
                                            ) : (
                                                <span style={{ fontSize: '10px', color: '#666' }}>IMG</span>
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
                                <td>
                                    <div style={{ fontSize: '0.9rem', color: '#E5E7EB' }}>
                                        {SERVER_MAP[char.server_id] || char.server_id}
                                    </div>
                                    <div className={`${styles.charDetail} ${char.race_name === 'Elyos' ? styles.elyos : styles.asmodian}`}>
                                        {char.race_name === 'Elyos' ? '천족' : '마족'}
                                    </div>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <div className={styles.scoreValue}>
                                        {getScoreValue(char)}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {hasMore && (
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <button
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        style={{
                            background: '#1f2937',
                            color: '#e5e7eb',
                            border: '1px solid #374151',
                            padding: '0.8rem 2rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            transition: 'all 0.2s'
                        }}
                    >
                        {isLoadingMore ? '불러오는 중...' : '더보기 (Next 50)'}
                    </button>
                </div>
            )}
        </div>
    )
}
