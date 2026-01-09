'use client'

import { useState, useEffect } from 'react'
import { Users } from 'lucide-react'

interface LiveStream {
    liveId: number | string
    liveTitle: string
    status: string
    liveImageUrl: string
    concurrentUserCount: number
    channel: {
        channelId: string
        channelName: string
        channelImageUrl: string
    }
}

interface StreamingSliderProps {
    platform: 'chzzk' | 'soop'
}

export default function StreamingSlider({ platform }: StreamingSliderProps) {
    const [streams, setStreams] = useState<LiveStream[]>([])
    const [loading, setLoading] = useState(true)
    const [isPaused, setIsPaused] = useState(false)

    // Platform config
    const accentColor = platform === 'chzzk' ? '#00FFA3' : '#1E90FF'
    const platformName = platform === 'chzzk' ? '치지직' : '숲(SOOP)'

    useEffect(() => {
        const fetchStreams = async () => {
            setLoading(true)
            try {
                const res = await fetch(`/api/${platform}/live`)
                const json = await res.json()
                if (json.success) {
                    const validStreams = (json.data || []).map((s: LiveStream) => {
                        if (!s.channel) return null
                        return {
                            ...s,
                            channel: {
                                channelId: s.channel.channelId || 'unknown',
                                channelName: s.channel.channelName || 'Unknown Channel',
                                channelImageUrl: s.channel.channelImageUrl || '/placeholder-stream.jpg'
                            }
                        }
                    }).filter(Boolean) as LiveStream[]

                    // Duplicate streams for seamless loop if we have few
                    if (validStreams.length > 0 && validStreams.length < 8) {
                        setStreams([...validStreams, ...validStreams, ...validStreams])
                    } else {
                        setStreams(validStreams)
                    }
                }
            } catch (err) {
                console.error(`Failed to load ${platform} streams`, err)
            } finally {
                setLoading(false)
            }
        }

        fetchStreams()
        const interval = setInterval(fetchStreams, 60000)
        return () => clearInterval(interval)
    }, [platform])

    if (loading) return (
        <div style={{
            height: '120px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div style={{ color: '#6B7280', fontSize: '0.75rem' }}>로딩 중...</div>
        </div>
    )

    if (streams.length === 0) return (
        <div style={{
            height: '120px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6B7280',
            fontSize: '0.75rem'
        }}>
            현재 방송 중인 채널이 없습니다
        </div>
    )

    return (
        <div style={{ position: 'relative' }}>
            {/* Platform Label */}
            <div style={{
                fontSize: '0.7rem',
                fontWeight: 'bold',
                color: accentColor,
                marginBottom: '6px'
            }}>
                {platformName}
            </div>

            {/* Marquee Container */}
            <div
                style={{
                    position: 'relative',
                    overflow: 'hidden',
                    // Edge fade effect
                    maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)'
                }}
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
            >
                {/* Sliding Track */}
                <div
                    style={{
                        display: 'flex',
                        gap: '12px',
                        width: 'max-content',
                        animation: `marquee-slide 270s linear infinite`,
                        animationPlayState: isPaused ? 'paused' : 'running'
                    }}
                >
                    {/* Render streams twice for seamless loop */}
                    {[...streams, ...streams].map((stream, idx) => (
                        <a
                            key={`${platform}-${stream.liveId}-${idx}`}
                            href={platform === 'chzzk'
                                ? `https://chzzk.naver.com/live/${stream?.channel?.channelId}`
                                : `https://play.afreecatv.com/${stream?.channel?.channelName}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                position: 'relative',
                                width: '180px',
                                height: '100px',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                flexShrink: 0,
                                cursor: 'pointer',
                                textDecoration: 'none',
                                transition: 'transform 0.2s'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.transform = 'scale(1.05)'
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.transform = 'scale(1)'
                            }}
                        >
                            {/* Thumbnail */}
                            <img
                                src={stream.liveImageUrl?.replace('{type}', '360') || '/placeholder-stream.jpg'}
                                alt={stream.liveTitle}
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/placeholder-stream.jpg'
                                }}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    background: '#1a1a1a'
                                }}
                            />

                            {/* Overlay Gradient */}
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 50%)'
                            }} />

                            {/* LIVE Badge */}
                            <div style={{
                                position: 'absolute',
                                top: '6px',
                                left: '6px',
                                background: '#EF4444',
                                color: 'white',
                                fontSize: '0.6rem',
                                fontWeight: 'bold',
                                padding: '2px 5px',
                                borderRadius: '3px'
                            }}>
                                LIVE
                            </div>

                            {/* Content Overlay */}
                            <div style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                right: 0,
                                padding: '8px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px'
                            }}>
                                <div style={{
                                    color: '#fff',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {stream.channel.channelName}
                                </div>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    color: accentColor,
                                    fontSize: '0.65rem'
                                }}>
                                    <Users size={10} />
                                    {stream.concurrentUserCount?.toLocaleString() || 0}
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
            </div>

            {/* CSS Animation */}
            <style jsx>{`
                @keyframes marquee-slide {
                    0% {
                        transform: translateX(-50%);
                    }
                    100% {
                        transform: translateX(0);
                    }
                }
            `}</style>
        </div>
    )
}
