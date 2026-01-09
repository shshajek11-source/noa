import { useState, useEffect } from 'react'

interface StatsData {
    elyosPercent: number
    asmodianPercent: number
    totalCharacters: number
    topClasses: { name: string; percent: number }[]
}

export default function ServerStatsDashboard() {
    const [stats, setStats] = useState<StatsData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true)
            setError(null)
            try {
                const res = await fetch('/api/stats/overview')
                if (!res.ok) throw new Error('서버 응답 오류')

                const json = await res.json()
                if (json.totalCharacters !== undefined) {
                    setStats(json)
                } else {
                    throw new Error('데이터 형식 오류')
                }
            } catch (e) {
                console.error(e)
                setError('통계를 불러올 수 없습니다')
            } finally {
                setLoading(false)
            }
        }
        fetchStats()
    }, [])

    // Loading State
    if (loading) {
        return (
            <section style={{
                marginBottom: '1rem',
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
                    <span style={{ color: 'var(--text-disabled)', fontSize: '0.85rem' }}>통계 로딩중...</span>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </section>
        )
    }

    // Error State
    if (error || !stats) {
        return (
            <section style={{
                marginBottom: '1rem',
                background: 'rgba(248, 113, 113, 0.1)',
                borderRadius: '12px',
                padding: '1.25rem',
                border: '1px solid rgba(248, 113, 113, 0.3)'
            }}>
                <div style={{ color: '#f87171', fontSize: '0.85rem', textAlign: 'center' }}>
                    {error || '통계 데이터를 불러올 수 없습니다'}
                </div>
            </section>
        )
    }

    return (
        <section style={{
            marginBottom: '1rem',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)',
            borderRadius: '12px',
            padding: '1.25rem',
            border: '1px solid rgba(255,255,255,0.05)'
        }}>
            <h2 style={{
                fontSize: '0.9rem',
                fontWeight: 'bold',
                color: '#9CA3AF',
                letterSpacing: '-0.02em',
                margin: 0,
                marginBottom: '1rem'
            }}>
                서버 통계 현황
            </h2>

            {/* Race Balance */}
            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                    <span style={{ color: '#4BC0C0' }}>천족 {stats.elyosPercent}%</span>
                    <span style={{ color: 'var(--text-disabled)' }}>전체 {stats.totalCharacters.toLocaleString()}명</span>
                    <span style={{ color: '#FF6384' }}>마족 {stats.asmodianPercent}%</span>
                </div>
                <div style={{ height: '6px', borderRadius: '3px', overflow: 'hidden', display: 'flex', background: 'rgba(255,255,255,0.05)' }}>
                    <div style={{ width: `${stats.elyosPercent}%`, background: '#4BC0C0', transition: 'width 0.5s' }} />
                    <div style={{ width: `${stats.asmodianPercent}%`, background: '#FF6384', transition: 'width 0.5s' }} />
                </div>
            </div>

            {/* Class Distribution - Mini */}
            <div>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>인기 직업 TOP 3</h4>
                {stats.topClasses && stats.topClasses.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {stats.topClasses.map((cls, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem' }}>
                                <div style={{ width: '60px', color: 'var(--text-main)', fontSize: '0.8rem' }}>{cls.name}</div>
                                <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${cls.percent}%`,
                                        height: '100%',
                                        background: 'var(--brand-red-muted)',
                                        transition: 'width 0.5s'
                                    }} />
                                </div>
                                <div style={{ width: '35px', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{cls.percent}%</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ color: 'var(--text-disabled)', fontSize: '0.8rem' }}>
                        직업 데이터가 없습니다
                    </div>
                )}
            </div>
        </section>
    )
}
