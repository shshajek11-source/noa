'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Character {
    rank: number
    name: string
    server: string
    class: string
    level: number
    power: number
}

interface TierData {
    tiers: {
        S: Character[]
        A: Character[]
        B: Character[]
        C: Character[]
    }
    tier_thresholds: {
        S: number
        A: number
        B: number
        C: number
    }
    tier_counts: {
        S: number
        A: number
        B: number
        C: number
    }
    sample_size?: number
    total_characters: number
    server: string
    generated_at: string
}

export default function TiersPage() {
    const [tierData, setTierData] = useState<TierData | null>(null)
    const [server, setServer] = useState('')
    const [selectedTier, setSelectedTier] = useState<'S' | 'A' | 'B' | 'C'>('S')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

    useEffect(() => {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        if (server) params.append('server', server)

        fetch(`${API_BASE_URL}/api/tiers?${params.toString()}`)
            .then(res => {
                if (!res.ok) {
                    throw new Error('티어 데이터를 불러올 수 없습니다.')
                }
                return res.json()
            })
            .then(data => {
                setTierData(data)
                setLoading(false)
            })
            .catch(err => {
                setError(err.message)
                setLoading(false)
            })
    }, [server])

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

    const getTierColor = (tier: string) => {
        switch (tier) {
            case 'S': return '#FFD700' // Gold
            case 'A': return '#C0C0C0' // Silver
            case 'B': return '#CD7F32' // Bronze
            case 'C': return '#6B7280' // Gray
            default: return '#6B7280'
        }
    }

    const getTierBgColor = (tier: string) => {
        switch (tier) {
            case 'S': return 'rgba(255, 215, 0, 0.1)'
            case 'A': return 'rgba(192, 192, 192, 0.1)'
            case 'B': return 'rgba(205, 127, 50, 0.1)'
            case 'C': return 'rgba(107, 114, 128, 0.1)'
            default: return 'rgba(107, 114, 128, 0.1)'
        }
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
                <p style={{ color: 'var(--text-secondary)' }}>티어 데이터를 불러오는 중...</p>
                <style jsx>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        )
    }

    if (error || !tierData) {
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
            {/* Header */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h1 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                    🏅 티어 랭킹
                </h1>

                {/* Beta 안내 */}
                <div style={{
                    background: '#193055',
                    border: '1px solid #234375',
                    borderRadius: '6px',
                    padding: '1rem',
                    marginBottom: '1rem',
                    color: '#93c5fd'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>🧪</span>
                        <strong style={{ color: 'var(--primary)' }}>Beta 서비스 - 상대적 티어 시스템</strong>
                    </div>
                    <p style={{ margin: '0', fontSize: '0.9rem', lineHeight: '1.5' }}>
                        티어는 <strong>수집된 {tierData.sample_size?.toLocaleString() || tierData.total_characters.toLocaleString()}명</strong> 기준 상대적 분포로 결정됩니다.
                        <br />
                        <span style={{
                            fontSize: '0.85rem', opacity: 0.8
                        }}>
                            마지막 갱신: {formatDateTime(tierData.generated_at)}
                        </span>
                    </p>
                </div>

                {/* 티어 기준 설명 */}
                <div style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '1rem',
                    marginBottom: '1.5rem'
                }}>
                    <p style={{ margin: '0 0 0.8rem 0', fontWeight: 'bold', color: 'var(--primary)' }}>
                        📋 티어 분류 기준 (Percentile 기반)
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.8rem', fontSize: '0.9rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '4px',
                                background: getTierBgColor('S'),
                                border: `2px solid ${getTierColor('S')}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                color: getTierColor('S'),
                                fontSize: '0.8rem'
                            }}>S</div>
                            <span style={{ color: 'var(--text-secondary)' }}>
                                상위 5% <span style={{ fontSize: '0.85rem', color: 'var(--text-disabled)' }}>
                                    ({tierData.tier_thresholds.S.toLocaleString()}+)
                                </span>
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '4px',
                                background: getTierBgColor('A'),
                                border: `2px solid ${getTierColor('A')}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                color: getTierColor('A'),
                                fontSize: '0.8rem'
                            }}>A</div>
                            <span style={{ color: 'var(--text-secondary)' }}>
                                상위 5-15% <span style={{ fontSize: '0.85rem', color: 'var(--text-disabled)' }}>
                                    ({tierData.tier_thresholds.A.toLocaleString()}+)
                                </span>
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '4px',
                                background: getTierBgColor('B'),
                                border: `2px solid ${getTierColor('B')}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                color: getTierColor('B'),
                                fontSize: '0.8rem'
                            }}>B</div>
                            <span style={{ color: 'var(--text-secondary)' }}>
                                상위 15-35% <span style={{ fontSize: '0.85rem', color: 'var(--text-disabled)' }}>
                                    ({tierData.tier_thresholds.B.toLocaleString()}+)
                                </span>
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '4px',
                                background: getTierBgColor('C'),
                                border: `2px solid ${getTierColor('C')}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                color: getTierColor('C'),
                                fontSize: '0.8rem'
                            }}>C</div>
                            <span style={{ color: 'var(--text-secondary)' }}>
                                하위 65% (35%+)
                            </span>
                        </div>
                    </div>
                </div>

                {/* Server Filter */}
                <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {['all', 'Siel', 'Israphel', 'Nezakan', 'Zikel', 'Chantra'].map(s => (
                            <button
                                key={s}
                                onClick={() => setServer(s === 'all' ? '' : s)}
                                className={(!server && s === 'all') || server === s ? 'btn' : 'btn-outline'}
                                style={{
                                    padding: '0.5rem 1rem',
                                    whiteSpace: 'nowrap',
                                    fontSize: '0.9rem',
                                    background: (!server && s === 'all') || server === s ? 'var(--primary)' : 'transparent',
                                    color: (!server && s === 'all') || server === s ? 'white' : 'var(--text-secondary)',
                                    border: (!server && s === 'all') || server === s ? 'none' : '1px solid var(--border)'
                                }}
                            >
                                {s === 'all' ? '전체 서버' : s}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tier Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {(['S', 'A', 'B', 'C'] as const).map(tier => (
                    <button
                        key={tier}
                        onClick={() => setSelectedTier(tier)}
                        style={{
                            padding: '0.8rem 1.5rem',
                            borderRadius: '6px',
                            border: selectedTier === tier ? `2px solid ${getTierColor(tier)}` : '1px solid var(--border)',
                            background: selectedTier === tier ? getTierBgColor(tier) : 'var(--bg-secondary)',
                            color: selectedTier === tier ? getTierColor(tier) : 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            fontWeight: selectedTier === tier ? 'bold' : '400',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{tier}</span>
                        <span>티어</span>
                        <span style={{
                            fontSize: '0.85rem',
                            opacity: 0.8,
                            background: selectedTier === tier ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.05)',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px'
                        }}>
                            {tierData.tier_counts[tier]}명
                        </span>
                    </button>
                ))}
            </div>

            {/* Tier List */}
            <div className="card">
                <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: getTierColor(selectedTier) }}>
                    {selectedTier} 티어 캐릭터 ({tierData.tier_counts[selectedTier]}명)
                </h2>

                {tierData.tiers[selectedTier].length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                        {selectedTier} 티어에 해당하는 캐릭터가 없습니다.
                    </p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{
                                    borderBottom: '2px solid var(--border)',
                                    textAlign: 'left'
                                }}>
                                    <th style={{ padding: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}></th>
                                    <th style={{ padding: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>순위</th>
                                    <th style={{ padding: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>이름</th>
                                    <th style={{ padding: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>서버</th>
                                    <th style={{ padding: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>직업</th>
                                    <th style={{ padding: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Lv</th>
                                    <th style={{ padding: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>전투력</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tierData.tiers[selectedTier].map((char, i) => (
                                    <tr
                                        key={i}
                                        style={{
                                            borderBottom: '1px solid var(--border)',
                                            cursor: 'pointer',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'var(--bg-hover)'
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent'
                                        }}
                                        onClick={() => router.push(`/c/${char.server}/${char.name}`)}
                                    >
                                        <td style={{ padding: '0.5rem', width: '60px' }}>
                                            <div style={{
                                                width: '50px',
                                                height: '50px',
                                                borderRadius: '8px',
                                                background: 'linear-gradient(135deg, rgba(var(--primary-rgb, 59, 130, 246), 0.2) 0%, rgba(var(--primary-rgb, 59, 130, 246), 0.05) 100%)',
                                                border: '2px solid var(--border)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '1.5rem',
                                                color: 'var(--text-disabled)'
                                            }}>
                                                🎭
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.75rem' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>#{char.rank}</span>
                                        </td>
                                        <td style={{ padding: '0.75rem' }}>
                                            <span style={{
                                                color: 'var(--text-main)',
                                                fontWeight: '600'
                                            }}>
                                                {char.name}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                                            {char.server}
                                        </td>
                                        <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                                            {char.class}
                                        </td>
                                        <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                                            {char.level}
                                        </td>
                                        <td style={{ padding: '0.75rem', fontWeight: '600', color: getTierColor(selectedTier) }}>
                                            {char.power.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div >
    )
}
