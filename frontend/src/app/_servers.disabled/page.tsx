'use client'
import { useEffect, useState } from 'react'

interface ServerData {
    server: string
    avg_power: number
    max_power: number
    total_characters: number
    top_100_count: number
    top_500_count: number
    search_count: number
}

interface ServerCompareData {
    servers: ServerData[]
    generated_at: string
}

export default function ServerComparePage() {
    const [data, setData] = useState<ServerCompareData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

    useEffect(() => {
        setLoading(true)
        setError(null)

        fetch(`${API_BASE_URL}/api/servers/compare`)
            .then(res => {
                if (!res.ok) {
                    throw new Error('서버 비교 데이터를 불러올 수 없습니다.')
                }
                return res.json()
            })
            .then(data => {
                setData(data)
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
                <p style={{ color: 'var(--text-secondary)' }}>서버 비교 데이터를 불러오는 중...</p>
                <style jsx>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        )
    }

    if (error || !data || data.servers.length === 0) {
        return (
            <div className="card" style={{
                background: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--danger)',
                padding: '2rem',
                textAlign: 'center',
                border: '1px solid rgba(239, 68, 68, 0.3)'
            }}>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>⚠️ 데이터를 불러올 수 없습니다</h3>
                <p style={{ margin: '0 0 1rem 0' }}>
                    {error || '수집된 서버 데이터가 없습니다. 캐릭터를 검색하여 데이터를 축적해주세요.'}
                </p>
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

    // Sort servers by avg_power for consistent display
    const sortedServers = [...data.servers].sort((a, b) => b.avg_power - a.avg_power)

    return (
        <div>
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h1 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                    🌐 서버 비교
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
                        이 비교는 사이트에서 검색된 캐릭터 데이터를 기반으로 생성되었습니다.
                        <br />
                        <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                            마지막 갱신: {formatDateTime(data.generated_at)}
                        </span>
                    </p>
                </div>
            </div>

            {/* 서버별 평균 전투력 비교 */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', color: 'var(--text-main)' }}>
                    ⚡ 서버별 평균 전투력
                </h2>
                {sortedServers.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                        수집된 데이터가 없습니다.
                    </p>
                ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {sortedServers.map((server, i) => {
                            const maxAvgPower = Math.max(...sortedServers.map(s => s.avg_power))
                            const percentage = (server.avg_power / maxAvgPower) * 100
                            const isTop = i === 0

                            return (
                                <div key={i} style={{
                                    background: isTop ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-main)',
                                    padding: '1.2rem',
                                    borderRadius: '6px',
                                    border: isTop ? '2px solid var(--primary)' : '1px solid var(--border)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {isTop && <span style={{ fontSize: '1.2rem' }}>👑</span>}
                                            <strong style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>
                                                {server.server}
                                            </strong>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-disabled)' }}>
                                                ({server.total_characters.toLocaleString()}명)
                                            </span>
                                        </div>
                                        <strong style={{ fontSize: '1.2rem', color: isTop ? 'var(--primary)' : 'var(--text-main)' }}>
                                            {server.avg_power.toLocaleString()}
                                        </strong>
                                    </div>
                                    <div style={{
                                        background: 'var(--bg-secondary)',
                                        height: '10px',
                                        borderRadius: '5px',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            background: isTop ? 'linear-gradient(90deg, var(--primary), var(--primary-hover))' : 'linear-gradient(90deg, #6B7280, #9CA3AF)',
                                            height: '100%',
                                            width: `${percentage}%`,
                                            transition: 'width 0.5s ease'
                                        }} />
                                    </div>
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>최고 전투력: {server.max_power.toLocaleString()}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* 랭킹 TOP 캐릭터 수 비교 */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', color: 'var(--text-main)' }}>
                    🏆 랭킹 TOP 캐릭터 분포
                </h2>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                                <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)' }}>서버</th>
                                <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)', textAlign: 'center' }}>TOP 100</th>
                                <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)', textAlign: 'center' }}>TOP 500</th>
                                <th style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-secondary)', textAlign: 'center' }}>전체 캐릭터</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedServers.map((server, i) => {
                                const top100Max = Math.max(...sortedServers.map(s => s.top_100_count))
                                const top500Max = Math.max(...sortedServers.map(s => s.top_500_count))

                                return (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '1rem', fontWeight: '600', color: 'var(--text-main)' }}>
                                            {server.server}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <span style={{
                                                fontWeight: server.top_100_count === top100Max ? 'bold' : '400',
                                                color: server.top_100_count === top100Max ? 'var(--primary)' : 'var(--text-main)'
                                            }}>
                                                {server.top_100_count}명
                                            </span>
                                            {server.top_100_count === top100Max && (
                                                <span style={{ marginLeft: '0.3rem', fontSize: '0.8rem' }}>👑</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <span style={{
                                                fontWeight: server.top_500_count === top500Max ? 'bold' : '400',
                                                color: server.top_500_count === top500Max ? 'var(--primary)' : 'var(--text-main)'
                                            }}>
                                                {server.top_500_count}명
                                            </span>
                                            {server.top_500_count === top500Max && (
                                                <span style={{ marginLeft: '0.3rem', fontSize: '0.8rem' }}>👑</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                            {server.total_characters.toLocaleString()}명
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 서버 활성도 지표 */}
            <div className="card">
                <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', color: 'var(--text-main)' }}>
                    📊 서버 활성도 (검색량 기준)
                </h2>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    사이트 내 캐릭터 검색량을 기준으로 한 서버별 활성도 지표입니다.
                </p>
                {sortedServers.filter(s => s.search_count > 0).length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '2rem',
                        background: 'var(--bg-main)',
                        borderRadius: '6px',
                        border: '1px solid var(--border)'
                    }}>
                        <p style={{ color: 'var(--text-secondary)', margin: '0' }}>
                            아직 검색 데이터가 충분하지 않습니다.
                            <br />
                            캐릭터를 검색하여 활성도 데이터를 축적해주세요.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {sortedServers
                            .sort((a, b) => b.search_count - a.search_count)
                            .map((server, i) => {
                                if (server.search_count === 0) return null

                                const maxSearchCount = Math.max(...sortedServers.map(s => s.search_count))
                                const percentage = (server.search_count / maxSearchCount) * 100
                                const isTop = i === 0

                                return (
                                    <div key={i} style={{
                                        background: 'var(--bg-main)',
                                        padding: '1rem',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {isTop && <span style={{ fontSize: '1.2rem' }}>🔥</span>}
                                                <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>
                                                    {server.server}
                                                </strong>
                                            </div>
                                            <strong style={{ fontSize: '1.1rem', color: isTop ? 'var(--primary)' : 'var(--text-main)' }}>
                                                {server.search_count.toLocaleString()} 검색
                                            </strong>
                                        </div>
                                        <div style={{
                                            background: 'var(--bg-secondary)',
                                            height: '8px',
                                            borderRadius: '4px',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                background: isTop ? 'linear-gradient(90deg, #f59e0b, #f97316)' : 'linear-gradient(90deg, #6B7280, #9CA3AF)',
                                                height: '100%',
                                                width: `${percentage}%`,
                                                transition: 'width 0.5s ease'
                                            }} />
                                        </div>
                                    </div>
                                )
                            }).filter(Boolean)}
                    </div>
                )}
            </div>
        </div>
    )
}
