'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ExternalLink, Eye, RefreshCw } from 'lucide-react'

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
            <section style={{
                marginTop: '1.5rem',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)',
                borderRadius: '12px',
                padding: '1.25rem',
                border: '1px solid rgba(255,255,255,0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255,255,255,0.1)',
                        borderTopColor: 'var(--brand-red-main)',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                    }} />
                    <span style={{ color: 'var(--text-disabled)', fontSize: '0.85rem' }}>공식 소식 로딩중...</span>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </section>
        )
    }

    if (error) {
        return (
            <section style={{
                marginTop: '1.5rem',
                background: 'rgba(248, 113, 113, 0.1)',
                borderRadius: '12px',
                padding: '1.25rem',
                border: '1px solid rgba(248, 113, 113, 0.3)'
            }}>
                <div style={{ color: '#f87171', fontSize: '0.85rem', textAlign: 'center' }}>
                    공식 소식을 불러올 수 없습니다
                    <button
                        onClick={fetchNews}
                        style={{
                            marginLeft: '0.5rem',
                            background: 'none',
                            border: 'none',
                            color: '#f87171',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                        }}
                    >
                        다시 시도
                    </button>
                </div>
            </section>
        )
    }

    return (
        <section style={{
            marginTop: '1.5rem',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)',
            borderRadius: '12px',
            padding: '1.25rem',
            border: '1px solid rgba(255,255,255,0.05)'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem'
            }}>
                <h2 style={{
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    color: '#9CA3AF',
                    letterSpacing: '-0.02em',
                    margin: 0
                }}>
                    공식 업데이트
                </h2>
                <Link
                    href="https://aion2.plaync.com/ko-kr/board/update/list"
                    target="_blank"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: 'var(--text-secondary)',
                        fontSize: '0.75rem',
                        textDecoration: 'none'
                    }}
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
                        style={{ textDecoration: 'none' }}
                    >
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.6rem 0.75rem',
                            borderRadius: '8px',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.03)',
                            transition: 'all 0.15s ease',
                            cursor: 'pointer'
                        }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.03)'
                            }}
                        >
                            {/* Date Badge */}
                            <div style={{
                                minWidth: '40px',
                                padding: '2px 6px',
                                background: 'var(--brand-red-main)',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                color: '#fff',
                                textAlign: 'center'
                            }}>
                                {formatDate(item.postedAt)}
                            </div>

                            {/* Title */}
                            <div style={{
                                flex: 1,
                                fontSize: '0.85rem',
                                color: 'var(--text-main)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                lineHeight: 1.4
                            }}>
                                {item.title.replace(/\[안내\]\s*/g, '')}
                            </div>

                            {/* View Count */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.7rem',
                                color: 'var(--text-disabled)',
                                minWidth: '50px',
                                justifyContent: 'flex-end'
                            }}>
                                <Eye size={11} />
                                {formatViewCount(item.viewCount)}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    )
}
