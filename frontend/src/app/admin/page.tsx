'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import DSCard from '../components/design-system/DSCard'
import DSButton from '../components/design-system/DSButton'
import DSBadge from '../components/design-system/DSBadge'
import AutoUpdatePanel from '../components/admin/AutoUpdatePanel'

interface Stats {
    totalCharacters: number
    todayAdded: number
    totalServers: number
    apiCalls: number
}

// Stat Card Component
function StatCard({ icon, label, value, badge, trend, loading }: {
    icon: string
    label: string
    value: string
    badge?: 'success' | 'warning' | 'primary'
    trend?: { value: string; up: boolean }
    loading?: boolean
}) {
    return (
        <div style={{
            background: 'linear-gradient(135deg, #111318 0%, #0D0F14 100%)',
            border: '1px solid var(--brand-red-muted)',
            borderRadius: '10px',
            padding: '1rem',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Glow Effect */}
            <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '100px',
                height: '100px',
                background: 'radial-gradient(circle, rgba(217, 43, 75, 0.08) 0%, transparent 70%)',
                pointerEvents: 'none'
            }} />

            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '0.75rem'
            }}>
                <span style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    fontWeight: 500
                }}>
                    {label}
                </span>
                <span style={{
                    fontSize: '1.5rem',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(217, 43, 75, 0.15)',
                    borderRadius: '8px',
                    border: '1px solid rgba(217, 43, 75, 0.3)'
                }}>
                    {icon}
                </span>
            </div>

            <div style={{
                fontSize: '1.75rem',
                fontWeight: 'bold',
                color: 'var(--brand-white)',
                marginBottom: '0.5rem',
                fontFamily: 'monospace'
            }}>
                {loading ? (
                    <span style={{ color: 'var(--text-disabled)' }}>...</span>
                ) : value}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {badge && (
                    <DSBadge variant={badge} size="sm">
                        {badge === 'success' ? '완료' : badge === 'warning' ? '대기' : '활성'}
                    </DSBadge>
                )}
                {trend && (
                    <span style={{
                        fontSize: '0.7rem',
                        color: trend.up ? '#34D399' : '#EF4444',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                    }}>
                        {trend.up ? '▲' : '▼'} {trend.value}
                    </span>
                )}
            </div>
        </div>
    )
}

// Quick Action Button
function QuickActionButton({ icon, label, href, variant = 'secondary', onClick }: {
    icon: string
    label: string
    href?: string
    variant?: 'primary' | 'secondary' | 'ghost'
    onClick?: () => void
}) {
    const content = (
        <button
            onClick={onClick}
            style={{
                width: '100%',
                padding: '0.75rem',
                background: variant === 'primary'
                    ? 'linear-gradient(135deg, var(--brand-red-main), var(--brand-red-dark))'
                    : variant === 'ghost'
                        ? 'transparent'
                        : 'rgba(217, 43, 75, 0.1)',
                border: `1px solid ${variant === 'ghost' ? 'var(--border)' : 'var(--brand-red-muted)'}`,
                borderRadius: '8px',
                color: variant === 'primary' ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s'
            }}
        >
            <span style={{ fontSize: '1rem' }}>{icon}</span>
            {label}
        </button>
    )

    if (href) {
        return (
            <Link href={href} style={{ textDecoration: 'none' }}>
                {content}
            </Link>
        )
    }
    return content
}

// System Status Item
function SystemStatusItem({ label, status }: { label: string; status: boolean }) {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.6rem 0.75rem',
            background: status ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
            borderRadius: '6px',
            border: `1px solid ${status ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
        }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {label}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <DSBadge variant={status ? 'success' : 'warning'} size="sm">
                    {status ? '정상' : '점검'}
                </DSBadge>
                <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: status ? 'var(--success)' : 'var(--danger)',
                    boxShadow: `0 0 8px ${status ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`
                }} />
            </div>
        </div>
    )
}

// Log Entry
function LogEntry({ type, time, message }: { type: 'info' | 'success' | 'error' | 'system'; time: string; message: string }) {
    const variants: Record<string, 'primary' | 'success' | 'warning' | 'dark'> = {
        info: 'primary',
        success: 'success',
        error: 'warning',
        system: 'dark'
    }
    const labels: Record<string, string> = {
        info: 'INFO',
        success: 'OK',
        error: 'ERR',
        system: 'SYS'
    }

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.5rem 0',
            fontSize: '0.75rem',
            borderBottom: '1px solid rgba(255,255,255,0.03)'
        }}>
            <DSBadge variant={variants[type]} size="sm">{labels[type]}</DSBadge>
            <span style={{ color: 'var(--text-disabled)', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                {time}
            </span>
            <span style={{ color: 'var(--text-main)', flex: 1 }}>{message}</span>
        </div>
    )
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats>({
        totalCharacters: 0,
        todayAdded: 0,
        totalServers: 42,
        apiCalls: 0
    })
    const [loading, setLoading] = useState(true)
    const [logs, setLogs] = useState<{ type: 'info' | 'success' | 'error' | 'system'; time: string; message: string }[]>([
        { type: 'success', time: new Date().toLocaleTimeString(), message: '관리자 대시보드 로드됨' },
        { type: 'system', time: new Date().toLocaleTimeString(), message: '시스템 시작됨' }
    ])

    useEffect(() => {
        fetchStats()
    }, [])

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/admin/bulk-update')
            const data = await res.json()
            setStats({
                totalCharacters: data.total || 0,
                todayAdded: data.updated || 0,
                totalServers: 42,
                apiCalls: 0
            })
            setLogs(prev => [
                { type: 'info', time: new Date().toLocaleTimeString(), message: '통계 데이터 새로고침됨' },
                ...prev.slice(0, 9)
            ])
        } catch (err) {
            console.error('Stats fetch error:', err)
            setLogs(prev => [
                { type: 'error', time: new Date().toLocaleTimeString(), message: '통계 데이터 로드 실패' },
                ...prev.slice(0, 9)
            ])
        } finally {
            setLoading(false)
        }
    }

    const statCardsData = [
        { label: '총 캐릭터', value: stats.totalCharacters.toLocaleString(), icon: '👥', badge: undefined, trend: undefined },
        { label: '업데이트 완료', value: stats.todayAdded.toLocaleString(), icon: '✅', badge: 'success' as const, trend: undefined },
        { label: '서버 수', value: String(stats.totalServers), icon: '🌐', badge: undefined, trend: undefined },
        { label: '대기 중', value: (stats.totalCharacters - stats.todayAdded).toLocaleString(), icon: '⏳', badge: 'warning' as const, trend: undefined },
    ]

    const systemStatusItems = [
        { label: 'Supabase Database', status: true },
        { label: 'API Server', status: true },
        { label: 'Official AION2 API', status: true },
    ]

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '0.75rem'
            }}>
                {statCardsData.map((card, idx) => (
                    <StatCard
                        key={idx}
                        icon={card.icon}
                        label={card.label}
                        value={card.value}
                        badge={card.badge}
                        trend={card.trend}
                        loading={loading}
                    />
                ))}
            </div>

            {/* Main Grid: 2 Columns */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem'
            }}>
                {/* Auto Update Panel */}
                <AutoUpdatePanel />

                {/* Right Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {/* Quick Actions */}
                    <DSCard title="빠른 액션" hoverEffect={false} style={{ padding: '1rem' }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '0.5rem'
                        }}>
                            <QuickActionButton icon="🔄" label="전체 크롤링" href="/admin/crawl" variant="primary" />
                            <QuickActionButton icon="📥" label="어비스만" href="/admin/crawl?type=abyss" variant="secondary" />
                            <QuickActionButton icon="🧹" label="캐시 정리" onClick={() => alert('준비 중')} variant="secondary" />
                            <QuickActionButton icon="📊" label="랭킹 보기" href="/ranking/noa" variant="ghost" />
                        </div>
                    </DSCard>

                    {/* System Status */}
                    <DSCard title="시스템 상태" hoverEffect={false} style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {systemStatusItems.map((item, idx) => (
                                <SystemStatusItem key={idx} label={item.label} status={item.status} />
                            ))}
                        </div>
                    </DSCard>
                </div>
            </div>

            {/* Activity Log */}
            <DSCard
                title="최근 활동"
                hoverEffect={false}
                style={{ padding: '1rem' }}
                action={
                    <DSButton variant="ghost" size="sm" onClick={fetchStats}>
                        🔃 새로고침
                    </DSButton>
                }
            >
                <div style={{
                    background: '#0D0F14',
                    borderRadius: '6px',
                    padding: '0.75rem',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    border: '1px solid var(--border)'
                }}>
                    {logs.map((log, idx) => (
                        <LogEntry key={idx} type={log.type} time={log.time} message={log.message} />
                    ))}
                </div>
            </DSCard>
        </div>
    )
}
