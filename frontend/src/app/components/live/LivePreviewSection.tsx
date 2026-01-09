'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { LiveCardData, LivePreviewResponse } from '@/types/live'
import { RefreshCw, Radio, User, Tv, AlertCircle } from 'lucide-react'

export default function LivePreviewSection() {
    const [platform, setPlatform] = useState<'all' | 'chzzk' | 'soop'>('chzzk')
    const [data, setData] = useState<LiveCardData[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [updatedAt, setUpdatedAt] = useState<number>(Date.now())
    const intervalRef = useRef<NodeJS.Timeout | null>(null)

    const fetchData = async (isBackground = false) => {
        if (!isBackground) setLoading(true)
        try {
            // Add timestamp to prevent browser cache
            const res = await fetch(`/api/live-previews?platform=${platform}&size=8&t=${Date.now()}`)
            if (!res.ok) {
                throw new Error('Failed to fetch live data')
            }
            const json: LivePreviewResponse = await res.json()

            if (json.error && !json.stale) {
                throw new Error(json.error)
            }

            setData(json.cards)
            setUpdatedAt(json.updatedAt)
            setError(null)
        } catch (err: any) {
            console.error(err)
            if (!isBackground) setError(err.message)
        } finally {
            if (!isBackground) setLoading(false)
        }
    }

    // Initial fetch and platform change
    useEffect(() => {
        fetchData()
    }, [platform])

    // Polling every 15s
    useEffect(() => {
        intervalRef.current = setInterval(() => {
            fetchData(true)
        }, 15000)

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [platform])

    const handlePlatformChange = (p: 'all' | 'chzzk' | 'soop') => {
        setPlatform(p)
    }

    return (
        <section style={{
            marginBottom: '3rem',
            padding: '1.5rem',
            background: 'var(--bg-secondary)', // Assuming these vars exist from context
            borderRadius: '12px',
            border: '1px solid var(--border)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        background: '#ef4444',
                        borderRadius: '50%',
                        boxShadow: '0 0 10px #ef4444'
                    }} />
                    <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
                        Live On Air
                    </h2>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', background: '#0f1219', padding: '0.3rem', borderRadius: '8px' }}>
                    {/* SOOP 임시 비활성화 - 'soop' 제거 */}
                    {(['chzzk', 'all'] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => handlePlatformChange(p)}
                            style={{
                                border: 'none',
                                background: platform === p ? 'var(--brand-red-main)' : 'transparent',
                                color: platform === p ? '#fff' : '#6B7280',
                                padding: '0.4rem 1rem',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                textTransform: 'uppercase',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem'
                            }}
                        >
                            {p === 'chzzk' && '치지직'}
                            {p === 'all' && '전체'}
                        </button>
                    ))}
                </div>
            </div>

            {loading && data.length === 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    {[...Array(4)].map((_, i) => (
                        <div key={i} style={{ height: '240px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', animation: 'pulse 1.5s infinite' }} />
                    ))}
                </div>
            ) : error ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#EF4444', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px' }}>
                    <AlertCircle style={{ marginBottom: '1rem', width: '48px', height: '48px' }} />
                    <p>{error}</p>
                    <button onClick={() => fetchData()} style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', background: '#EF4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        Retry
                    </button>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '1.5rem'
                }}>
                    <AnimatePresence>
                        {data.map((card) => (
                            <LiveCard key={`${card.platform}_${card.liveId}`} card={card} />
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {!loading && data.length === 0 && !error && (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#6B7280' }}>
                    <Tv style={{ width: '48px', height: '48px', marginBottom: '1rem', opacity: 0.5 }} />
                    <p>현재 방송 중인 채널이 없습니다.</p>
                </div>
            )}
        </section>
    )
}

function LiveCard({ card }: { card: LiveCardData }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
        >
            <Link
                href={card.link}
                target="_blank"
                style={{ textDecoration: 'none' }}
            >
                <div style={{
                    background: '#1F2937',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.05)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}>
                    {/* Thumbnail */}
                    <div style={{ position: 'relative', aspectRatio: '16/9' }}>
                        <Image
                            src={card.thumb || '/placeholder-thumb.png'}
                            alt={card.title}
                            fill
                            style={{ objectFit: 'cover' }}
                            unoptimized // Often needed for external CDN
                        />
                        <div style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            background: card.platform === 'chzzk' ? '#00FFA3' : '#0054FF',
                            color: card.platform === 'chzzk' ? '#000' : '#fff',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            zIndex: 10
                        }}>
                            {card.platform === 'chzzk' ? 'CHZZK' : 'SOOP'}
                        </div>
                        <div style={{
                            position: 'absolute',
                            bottom: '10px',
                            right: '10px',
                            background: 'rgba(0,0,0,0.7)',
                            color: '#fff',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            <User size={12} />
                            {card.viewers.toLocaleString()}
                        </div>
                    </div>

                    {/* Content */}
                    <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{
                            color: '#F3F4F6',
                            fontSize: '1rem',
                            margin: '0 0 0.5rem 0',
                            lineHeight: '1.4',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            fontWeight: 600
                        }}>
                            {card.title}
                        </h3>

                        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{
                                    color: '#9CA3AF',
                                    fontSize: '0.85rem',
                                    fontWeight: 500
                                }}>
                                    {card.channelName}
                                </span>
                            </div>
                        </div>

                        {card.category && (
                            <span style={{
                                display: 'inline-block',
                                marginTop: '0.8rem',
                                color: '#60A5FA',
                                fontSize: '0.8rem',
                                background: 'rgba(96, 165, 250, 0.1)',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                width: 'fit-content'
                            }}>
                                {card.category}
                            </span>
                        )}
                    </div>
                </div>
            </Link>
        </motion.div>
    )
}
