'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ExternalLink, Eye, RefreshCw } from 'lucide-react'
import styles from '@/app/Home.module.css'

interface NewsItem {
    id: string
    title: string
    summary: string
    thumbnailUrl: string | null
    postedAt: string
    viewCount: number
    link: string
    boardType: 'update' | 'notice'
}

export default function OfficialNewsFeed() {
    const [news, setNews] = useState<NewsItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchNews = async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/official-news?board=update_ko&size=3')
            if (!res.ok) throw new Error('Failed to fetch')
            const json = await res.json()
            if (json.success) {
                setNews(json.items)
            } else {
                throw new Error(json.error || 'Unknown error')
            }
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchNews()
    }, [])

    // Format date: 2026-01-06 19:30:00.001 -> 01/06
    const formatDate = (dateStr: string) => {
        if (!dateStr) return ''
        try {
            const date = new Date(dateStr.replace(' ', 'T'))
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            return `${month}/${day}`
        } catch {
            return dateStr.slice(5, 10).replace('-', '/')
        }
    }

    // Format view count: 210815 -> 21.0만
    const formatViewCount = (count: number) => {
        if (count >= 10000) {
            return `${(count / 10000).toFixed(1)}만`
        }
        return count.toLocaleString()
    }

    if (loading) {
        return (
            <section className={styles.sectionCard}>
                <div className={styles.loadingState}>
                    <div className={styles.loadingSpinner} />
                    <span>공식 소식 로딩중...</span>
                </div>
            </section>
        )
    }

    if (error) {
        return (
            <section className={styles.errorState}>
                <div style={{ color: 'var(--danger)', fontSize: '0.9rem', textAlign: 'center' }}>
                    공식 소식을 불러올 수 없습니다
                    <button
                        onClick={fetchNews}
                        className={styles.retryButton}
                    >
                        다시 시도
                    </button>
                </div>
            </section>
        )
    }

    return (
        <section className={styles.sectionCard}>
            {/* Header */}
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                    공식 업데이트
                </h2>
                <Link
                    href="https://aion2.plaync.com/ko-kr/board/update/list"
                    target="_blank"
                    className={styles.sectionLink}
                >
                    더보기 <ExternalLink size={12} />
                </Link>
            </div>

            {/* News List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {news.map((item) => (
                    <Link
                        key={item.id}
                        href={item.link}
                        target="_blank"
                        className={styles.newsItem}
                    >
                        {/* Date Badge */}
                        <div className={styles.newsDateBadge}>
                            {formatDate(item.postedAt)}
                        </div>

                        {/* Title */}
                        <div className={styles.newsTitle}>
                            {item.title.replace(/\[안내\]\s*/g, '')}
                        </div>

                        {/* View Count */}
                        <div className={styles.newsMeta}>
                            <Eye size={11} />
                            {formatViewCount(item.viewCount)}
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    )
}