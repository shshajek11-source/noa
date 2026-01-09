'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RankingPage() {
    const [rankings, setRankings] = useState<any[]>([])
    const [generatedAt, setGeneratedAt] = useState<string | null>(null)
    const [server, setServer] = useState('')
    const [className, setClassName] = useState('')
    const [sort, setSort] = useState('power')
    const [limit, setLimit] = useState(10)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

    useEffect(() => {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        if (server) params.append('server', server)
        if (className) params.append('class', className)
        if (sort) params.append('type', sort)
        params.append('limit', limit.toString())

        fetch(`${API_BASE_URL}/api/rankings?${params.toString()}`)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`서버 응답 오류: ${res.status}`)
                }
                return res.json()
            })
            .then(data => {
                setRankings(data.items || [])
                setGeneratedAt(data.generated_at)
                setLoading(false)
            })
            .catch(err => {
                setError(err.message || '랭킹 데이터를 불러올 수 없습니다.')
                setLoading(false)
            })
    }, [server, className, sort, limit])

    const formatDateTime = (dateStr: string | null) => {
        if (!dateStr) return '알 수 없음'
        const date = new Date(dateStr)
        return date.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
    }

    return (
        <div className="card">
            <h1 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                전체 랭킹
            </h1>

            {/* Beta 서비스 안내 */}
            <div style={{
                background: 'rgba(234, 179, 8, 0.1)', // Yellow tint
                border: '1px solid rgba(234, 179, 8, 0.2)',
                borderRadius: '6px',
                padding: '1rem',
                marginBottom: '1rem',
                color: 'var(--primary)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>🧪</span>
                    <strong style={{ color: 'var(--primary)' }}>Beta 서비스</strong>
                </div>
                <p style={{ margin: '0', fontSize: '0.9rem', lineHeight: '1.5', color: 'var(--text-main)' }}>
                    현재 베타 운영 중입니다. 랭킹에 등재된 캐릭터만 검색 가능하며, 일부 기능에 제한이 있을 수 있습니다.
                </p>
            </div>

            {/* 신뢰도 및 설명 안내 (항상 표시) */}
            <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '1rem',
                marginBottom: '1.5rem',
                color: 'var(--text-main)'
            }}>
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', color: 'var(--text-main)' }}>
                    📊 랭킹 정보
                </p>
                <ul style={{ margin: '0', paddingLeft: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    <li><strong>랭킹 기준:</strong> {sort === 'power' ? '전투력순' : sort === 'level' ? '레벨순' : '최신 업데이트순'}</li>
                    <li><strong>집계 방식:</strong> 사이트에서 검색된 캐릭터만 기준으로 집계됩니다</li>
                    <li><strong>데이터 특성:</strong> 검색되지 않은 캐릭터는 랭킹에 포함되지 않습니다</li>
                    {generatedAt && (
                        <li>
                            <strong>마지막 갱신:</strong> {formatDateTime(generatedAt)}
                            <span style={{ fontSize: '0.85rem', marginLeft: '0.3rem', color: 'var(--text-disabled)' }}>
                                (로컬 시간 기준)
                            </span>
                        </li>
                    )}
                    <li style={{ fontSize: '0.85rem', color: 'var(--text-disabled)', marginTop: '0.3rem' }}>
                        * 비공식 데이터로 정확성을 보장하지 않습니다
                    </li>
                </ul>
            </div>

            {/* Filters */}
            <div style={{ marginBottom: '2rem' }}>
                {/* Server Tabs */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
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
                                color: (!server && s === 'all') || server === s ? 'var(--primary-text)' : 'var(--text-secondary)',
                                border: (!server && s === 'all') || server === s ? 'none' : '1px solid var(--border)'
                            }}
                        >
                            {s === 'all' ? '전체 서버' : s}
                        </button>
                    ))}
                </div>

                {/* Sub Filters */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <select
                            className="input"
                            value={className}
                            onChange={e => setClassName(e.target.value)}
                            style={{
                                padding: '0.4rem 2rem 0.4rem 0.8rem',
                                minWidth: '140px',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-main)',
                                border: '1px solid var(--border)'
                            }}
                        >
                            <option value="">전체 직업</option>
                            <optgroup label="전사">
                                <option value="Gladiator">소드윙 (Gladiator)</option>
                                <option value="Templar">실드윙 (Templar)</option>
                            </optgroup>
                            <optgroup label="정찰">
                                <option value="Ranger">보우윙 (Ranger)</option>
                                <option value="Assassin">섀도우윙 (Assassin)</option>
                            </optgroup>
                            <optgroup label="마법">
                                <option value="Sorcerer">스펠윙 (Sorcerer)</option>
                                <option value="Spirit Master">스피릿윙 (Spirit Master)</option>
                            </optgroup>
                            <optgroup label="치유">
                                <option value="Cleric">클레릭 (Cleric)</option>
                                <option value="Chanter">찬터 (Chanter)</option>
                            </optgroup>
                            <optgroup label="특수">
                                <option value="Gunner">건너 (Gunner)</option>
                                <option value="Songweaver">송스위버 (Songweaver)</option>
                                <option value="Aethertech">에테리얼테크 (Aethertech)</option>
                            </optgroup>
                        </select>
                        <select
                            className="input"
                            value={sort}
                            onChange={e => setSort(e.target.value)}
                            style={{
                                padding: '0.4rem 2rem 0.4rem 0.8rem',
                                minWidth: '120px',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-main)',
                                border: '1px solid var(--border)'
                            }}
                        >
                            <option value="power">전투력순</option>
                            <option value="level">레벨순</option>
                            <option value="updated_at">최신순</option>
                        </select>
                    </div>

                    {/* Quick Limit Buttons */}
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {[10, 50, 100].map(l => (
                            <button
                                key={l}
                                onClick={() => setLimit(l)}
                                style={{
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: '4px',
                                    border: '1px solid var(--border)',
                                    background: limit === l ? 'var(--primary)' : 'transparent',
                                    color: limit === l ? 'var(--primary-text)' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    fontWeight: limit === l ? '700' : '400',
                                    transition: 'all 0.2s'
                                }}
                            >
                                TOP {l}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 로딩 상태 */}
            {loading && (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        border: '4px solid var(--border)',
                        borderTop: '4px solid var(--primary)',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 1rem'
                    }} />
                    <p style={{ color: 'var(--text-secondary)' }}>랭킹 데이터를 불러오는 중...</p>
                    <style jsx>{`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}</style>
                </div>
            )}

            {/* 에러 상태 */}
            {error && !loading && (
                <div style={{
                    background: 'rgba(239, 68, 68, 0.1)', // var(--danger) 0.1
                    color: 'var(--danger)', // var(--danger)
                    padding: '1.5rem',
                    borderRadius: '6px',
                    textAlign: 'center',
                    border: '1px solid rgba(239, 68, 68, 0.3)'
                }}>
                    <h3 style={{ margin: '0 0 0.5rem 0' }}>⚠️ 오류 발생</h3>
                    <p style={{ margin: '0 0 1rem 0' }}>{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="btn"
                        style={{ background: 'var(--danger)', color: 'white' }}
                    >
                        다시 시도
                    </button>
                </div>
            )}

            {/* 빈 결과 */}
            {!loading && !error && rankings.length === 0 && (
                <div style={{
                    background: 'var(--bg-main)',
                    padding: '3rem',
                    borderRadius: '6px',
                    textAlign: 'center',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)'
                }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>🔍 검색 결과 없음</h3>
                    <p style={{ margin: 0 }}>
                        해당 조건에 맞는 캐릭터가 없습니다.<br />
                        필터를 변경하거나 캐릭터를 먼저 검색해보세요.
                    </p>
                </div>
            )}

            {/* 랭킹 테이블 */}
            {!loading && !error && rankings.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{
                                borderBottom: '2px solid var(--border)',
                                textAlign: 'left',
                            }}>
                                <th style={{ padding: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>순위</th>
                                <th style={{ padding: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>이름</th>
                                <th style={{ padding: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>서버</th>
                                <th style={{ padding: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>직업</th>
                                <th style={{ padding: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Lv</th>
                                <th style={{ padding: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>전투력</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rankings.map((r, i) => (
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
                                    onClick={() => router.push(`/c/${r.server}/${r.name}`)}
                                >
                                    <td style={{ padding: '0.75rem', fontWeight: '500' }}>
                                        {r.rank <= 3 ? (
                                            <span style={{
                                                fontSize: '1.2rem',
                                                fontWeight: 'bold'
                                            }}>
                                                {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : '🥉'}
                                            </span>
                                        ) : (
                                            <span style={{ color: 'var(--text-secondary)' }}>{r.rank}</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '0.75rem' }}>
                                        <span style={{
                                            color: 'var(--text-main)',
                                            fontWeight: '600',
                                            textDecoration: 'none'
                                        }}>
                                            {r.name}
                                        </span>
                                    </td>
                                    <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                                        {r.server || '-'}
                                    </td>
                                    <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                                        {r.class_name || r.class || '-'}
                                    </td>
                                    <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                                        {r.level > 0 ? r.level : '-'}
                                    </td>
                                    <td style={{ padding: '0.75rem', fontWeight: '600', color: 'var(--primary)' }}>
                                        {(r.power || 0) > 0 ? (r.power || 0).toLocaleString() : <span style={{ color: 'var(--text-disabled)' }}>-</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <p style={{
                        marginTop: '1.5rem',
                        fontSize: '0.85rem',
                        color: 'var(--text-disabled)',
                        textAlign: 'center'
                    }}>
                        총 {rankings.length}개 캐릭터 표시 중
                    </p>
                </div>
            )}
        </div>
    )
}
