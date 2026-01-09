'use client'
import { useEffect, useState } from 'react'

interface ServerStat {
    server: string
    avg_power: number
    median_power: number
    count: number
}

interface ClassStat {
    class: string
    count: number
}

interface PowerDistribution {
    range: string
    count: number
}

interface StatsData {
    server_avg: ServerStat[]
    class_distribution: ClassStat[]
    power_distribution: PowerDistribution[]
    total_characters: number
    generated_at: string
}

export default function StatsPage() {
    const [stats, setStats] = useState<StatsData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

    useEffect(() => {
        setLoading(true)
        setError(null)

        fetch(`${API_BASE_URL}/api/stats`)
            .then(res => {
                if (!res.ok) {
                    throw new Error('통계 데이터를 불러올 수 없습니다.')
                }
                return res.json()
            })
            .then(data => {
                setStats(data)
                setLoading(false)
            })
            .catch(err => {
                setError(err.message)
                setLoading(false)
            })
    }, [])

    const formatDateTime = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    if (loading) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid var(--border)',
                    borderTop: '4px solid var(--primary)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 1rem'
                }} />
                <p style={{ color: 'var(--text-secondary)' }}>통계 데이터를 불러오는 중...</p>
                <style jsx>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        )
    }

    if (error || !stats) {
        return (
            <div className="card" style={{
                background: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--danger)',
                padding: '2rem',
                textAlign: 'center',
                border: '1px solid rgba(239, 68, 68, 0.3)'
            }}>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>⚠️ 데이터를 불러올 수 없습니다</h3>
                <p style={{ margin: '0 0 1rem 0' }}>{error || '알 수 없는 오류가 발생했습니다.'}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="btn"
                    style={{ background: 'var(--danger)' }}
                >
                    다시 시도
                </button>
            </div>
        )
    }

    return (
        <div>
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h1 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                    📊 전체 통계
                </h1>

                {/* 데이터 기준 안내 */}
                <div style={{
                    background: '#193055',
                    border: '1px solid #234375',
                    borderRadius: '6px',
                    padding: '1rem',
                    marginBottom: '1rem',
                    color: '#93c5fd'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
                        <strong style={{ color: 'var(--primary)' }}>현재 수집된 데이터 기준</strong>
                    </div>
                    <p style={{ margin: '0', fontSize: '0.9rem', lineHeight: '1.5' }}>
                        이 통계는 사이트에서 검색된 <strong>{stats.total_characters.toLocaleString()}명의 캐릭터</strong> 데이터를 기반으로 생성되었습니다.
                        <br />
                        <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                            마지막 갱신: {formatDateTime(stats.generated_at)}
                        </span>
                    </p>
                </div>
            </div>

            {/* 서버별 평균 전투력 */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', color: 'var(--text-main)' }}>
                    🎮 서버별 평균 전투력
                </h2>
                {stats.server_avg.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                        수집된 서버 데이터가 없습니다.
                    </p>
                ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {stats.server_avg.map((server, i) => {
                            const maxPower = Math.max(...stats.server_avg.map(s => s.avg_power))
                            const percentage = (server.avg_power / maxPower) * 100

                            return (
                                <div key={i} style={{
                                    background: 'var(--bg-main)',
                                    padding: '1rem',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <div>
                                            <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{server.server}</strong>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-disabled)', marginLeft: '0.5rem' }}>
                                                ({server.count.toLocaleString()}명)
                                            </span>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                                                {server.avg_power.toLocaleString()}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                중앙값: {server.median_power.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{
                                        background: 'var(--bg-secondary)',
                                        height: '8px',
                                        borderRadius: '4px',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            background: 'linear-gradient(90deg, var(--primary), var(--primary-hover))',
                                            height: '100%',
                                            width: `${percentage}%`,
                                            transition: 'width 0.5s ease'
                                        }} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* 직업 분포 */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', color: 'var(--text-main)' }}>
                    ⚔️ 직업 분포
                </h2>
                {stats.class_distribution.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                        수집된 직업 데이터가 없습니다.
                    </p>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                        {stats.class_distribution
                            .sort((a, b) => b.count - a.count)
                            .map((cls, i) => {
                                const totalChars = stats.class_distribution.reduce((sum, c) => sum + c.count, 0)
                                const percentage = ((cls.count / totalChars) * 100).toFixed(1)

                                return (
                                    <div key={i} style={{
                                        background: 'var(--bg-main)',
                                        padding: '1rem',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border)',
                                        textAlign: 'center'
                                    }}>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                            {cls.class}
                                        </div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '0.3rem' }}>
                                            {cls.count.toLocaleString()}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-disabled)' }}>
                                            {percentage}%
                                        </div>
                                    </div>
                                )
                            })}
                    </div>
                )}
            </div>

            {/* 상위 랭커 전투력 분포 */}
            <div className="card">
                <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', color: 'var(--text-main)' }}>
                    📈 상위 랭커 전투력 분포 (TOP 100)
                </h2>
                {stats.power_distribution.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                        수집된 전투력 데이터가 없습니다.
                    </p>
                ) : (
                    <div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {stats.power_distribution.map((dist, i) => {
                                const maxCount = Math.max(...stats.power_distribution.map(d => d.count))
                                const percentage = (dist.count / maxCount) * 100

                                return (
                                    <div key={i} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem'
                                    }}>
                                        <div style={{
                                            minWidth: '100px',
                                            fontSize: '0.9rem',
                                            color: 'var(--text-secondary)',
                                            textAlign: 'right'
                                        }}>
                                            {dist.range}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{
                                                background: 'var(--bg-secondary)',
                                                height: '32px',
                                                borderRadius: '4px',
                                                overflow: 'hidden',
                                                position: 'relative'
                                            }}>
                                                <div style={{
                                                    background: 'linear-gradient(90deg, var(--primary), var(--primary-hover))',
                                                    height: '100%',
                                                    width: `${percentage}%`,
                                                    transition: 'width 0.5s ease',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    paddingLeft: '0.5rem'
                                                }}>
                                                    <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'white' }}>
                                                        {dist.count}명
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
