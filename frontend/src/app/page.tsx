'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search } from 'lucide-react'
import SearchBar from './components/SearchBar'

// Hardcoded server list for standalone operation
// Define servers by race
// Define servers by race
const ELYOS_SERVERS = [
    '시엘', '네자칸', '바이젤', '카이시넬', '유스티엘', '아리엘', '프레기온',
    '메스람타에다', '히타니에', '나니아', '타하바타', '루터스', '페르노스',
    '다미누', '카사카', '바카르마', '챈가룽', '코치룽', '이슈타르', '티아마트', '포에타'
]

const ASMODIAN_SERVERS = [
    '지켈', '트리니엘', '루미엘', '마르쿠탄', '아스펠', '에레슈키갈', '브리트라',
    '네몬', '하달', '루드라', '울고른', '무닌', '오다르', '젠카카', '크로메데',
    '콰이링', '바바룽', '파프니르', '인드나흐', '이스할겐'
]

// Combined list for fallback or searching
// Combined list for fallback or searching
const ALL_SERVERS = Array.from(new Set([...ELYOS_SERVERS, ...ASMODIAN_SERVERS]))

export default function Home() {
    // State
    const router = useRouter() // router is used in RankingPreview below, so we leave it if needed there? No, inside subcomponents. But 'wrapper' might need it. Actually Home component doesn't seem to use it anymore if I remove handleSearch. But wait, I see subcomponents defined in same file. 
    // RankingPreview uses its own hook. Home doesn't need router anymore if SearchBar handles search navigation.

    // Cleanup unused vars
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

    useEffect(() => {
        // Any other initialization if needed
    }, [])

    return (
        <main>
            {/* Hero Section */}
            <section style={{
                textAlign: 'center',
                padding: '4rem 0',
                marginBottom: '2rem'
            }}>
                <h1 style={{
                    fontSize: '2.5rem',
                    fontWeight: '800',
                    marginBottom: '1rem',
                    color: 'white'
                }}>
                    NO<span style={{ color: '#facc15' }}>A</span> - 아이온 2 정보 검색 사이트
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem' }}>
                    실시간 랭킹, 캐릭터 정보, 전투력 분석을 가장 빠르게 확인하세요.
                </p>

                <div
                    style={{
                        background: 'rgba(250, 204, 21, 0.1)', /* Yellow tint */
                        border: '1px solid rgba(250, 204, 21, 0.2)',
                        borderRadius: '6px',
                        padding: '1rem',
                        marginBottom: '2rem',
                        maxWidth: '600px',
                        margin: '0 auto 2.5rem auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.8rem',
                        color: 'var(--primary)'
                    }}
                >
                    <span style={{ fontSize: '1.2rem' }}>📢</span>
                    <span style={{ fontSize: '0.9rem' }}>
                        현재 <strong>랭킹(TOP 1000)</strong>에 등재된 캐릭터만 검색 가능합니다.<br />
                        <span style={{ opacity: 0.8, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>(베타 기간 제한사항)</span>
                    </span>
                </div>

                {/* Search Box Component */}
                <SearchBar />
            </section>

            {/* Menu Cards Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1.5rem',
                maxWidth: '1200px',
                margin: '0 auto 3rem auto',
                padding: '0 1rem'
            }}>
                {[
                    { name: '랭킹', href: '/ranking', image: '/menu/1.jpg' },
                    { name: '티어', href: '/tiers', image: '/menu/2.jpg' },
                    { name: '통계', href: '/stats', image: '/menu/3.jpg' },
                    { name: '서버', href: '/servers', image: '/menu/4.jpg' },
                    { name: '비교', href: '/compare', image: '/menu/5.jpg' }
                ].map((menu, i) => (
                    <Link
                        key={i}
                        href={menu.href}
                        style={{
                            position: 'relative',
                            aspectRatio: '1',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            textDecoration: 'none',
                            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                            cursor: 'pointer',
                            backgroundImage: `url(${menu.image})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)'
                            e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.4)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0) scale(1)'
                            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)'
                        }}
                    >
                        {/* Blur overlay behind text */}
                        <div style={{
                            position: 'absolute',
                            bottom: '0',
                            left: '0',
                            right: '0',
                            padding: '1.5rem 1rem',
                            background: 'rgba(0, 0, 0, 0.4)',
                            backdropFilter: 'blur(10px)',
                            WebkitBackdropFilter: 'blur(10px)',
                            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                            <h3 style={{
                                margin: 0,
                                fontSize: '1.3rem',
                                fontWeight: '700',
                                color: 'white',
                                textAlign: 'center',
                                textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'
                            }}>
                                {menu.name}
                            </h3>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Dashboard Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '3rem' }}>
                <RankingPreview />
                <RecentSearches />
            </div>

            {/* Server Top Characters */}
            <ServerTopCharacters />

            <PopularKeywords />
        </main>
    )
}

function RankingPreview() {
    const [rankings, setRankings] = useState<any[]>([])
    const router = useRouter()
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/rankings?limit=10`)
            .then(res => res.json())
            .then(data => setRankings(data.items || []))
            .catch(console.error)
    }, [])

    if (!rankings.length) {
        return (
            <div className="card">
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-disabled)' }}>
                    아직 랭킹 데이터가 없습니다
                </div>
            </div>
        )
    }

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', paddingBottom: '0.8rem', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>🏆 실시간 랭킹 (TOP 10)</h3>
                <button onClick={() => router.push('/ranking')} className="btn-outline" style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }}>
                    전체보기
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                {rankings.map((char, i) => (
                    <div
                        key={i}
                        onClick={() => router.push(`/c/${char.server}/${char.name}`)}
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '0.8rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            transition: 'background 0.2s',
                            background: i === 0 ? 'rgba(250, 204, 21, 0.1)' : 'transparent', // Yellow highlight
                            borderLeft: i === 0 ? '3px solid var(--primary)' : '3px solid transparent'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--bg-hover)'
                            if (i !== 0) e.currentTarget.style.borderLeft = '3px solid var(--text-secondary)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = i === 0 ? 'rgba(250, 204, 21, 0.1)' : 'transparent'
                            if (i !== 0) e.currentTarget.style.borderLeft = '3px solid transparent'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{
                                width: '24px',
                                fontWeight: 'bold',
                                color: i < 3 ? 'var(--primary)' : 'var(--text-secondary)'
                            }}>{i + 1}</span>
                            <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>{char.name}</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>{char.server}</span>
                        </div>
                        <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>
                            {char.power.toLocaleString()}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function RecentSearches() {
    const [recents, setRecents] = useState<any[]>([])
    const router = useRouter()
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/characters/recent?limit=5`)
            .then(res => res.json())
            .then(data => setRecents(data || []))
            .catch(console.error)
    }, [])

    if (!recents.length) return null

    return (
        <div className="card">
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '1.2rem', paddingBottom: '0.8rem', borderBottom: '1px solid var(--border)' }}>
                ⏱️ 최근 업데이트
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {recents.slice(0, 5).map((char, i) => (
                    <div
                        key={i}
                        onClick={() => router.push(`/c/${char.server}/${char.name}`)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.8rem',
                            background: 'var(--bg-main)',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--primary)'
                            e.currentTarget.style.transform = 'translateX(5px)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border)'
                            e.currentTarget.style.transform = 'translateX(0)'
                        }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{char.name}</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{char.server} | {char.class}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>{char.power.toLocaleString()}</span>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-disabled)' }}>Lv.{char.level}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function PopularKeywords() {
    const [keywords, setKeywords] = useState<{ keyword: string, count: number }[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

    useEffect(() => {
        setLoading(true)
        setError(null)

        fetch(`${API_BASE_URL}/api/search/popular?limit=5`)
            .then(res => {
                if (!res.ok) {
                    throw new Error('인기 검색어를 불러올 수 없습니다')
                }
                return res.json()
            })
            .then(data => {
                setKeywords(data || [])
                setLoading(false)
            })
            .catch(err => {
                setError(err.message)
                setLoading(false)
            })
    }, [])

    // 로딩 중이거나 에러가 있으면 표시하지 않음
    if (loading || error || keywords.length === 0) {
        return null
    }

    return (
        <div style={{ maxWidth: '500px', margin: '2rem auto 0', textAlign: 'left' }}>
            <h3 style={{
                fontSize: '0.9rem',
                color: 'var(--text-muted)',
                marginBottom: '0.5rem'
            }}>
                🔥 인기 검색어
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {keywords.map((k, i) => {
                    const [s, n] = k.keyword.split(':')
                    return (
                        <button
                            key={i}
                            onClick={() => router.push(`/c/${s}/${n}`)}
                            className="badge"
                            style={{
                                cursor: 'pointer',
                                border: 'none',
                                background: 'var(--surface-active)',
                                transition: 'transform 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)'
                            }}
                        >
                            {k.keyword}
                            <span style={{
                                fontSize: '0.75rem',
                                marginLeft: '0.3rem',
                                opacity: 0.7
                            }}>
                                ({k.count})
                            </span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

function ServerTopCharacters() {
    const [serverData, setServerData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/rankings/by-server?limit_per_server=3`)
            .then(res => res.json())
            .then(data => {
                setServerData(data.data)
                setLoading(false)
            })
            .catch(err => {
                console.error(err)
                setLoading(false)
            })
    }, [])

    if (loading) return null

    if (!serverData || Object.keys(serverData).length === 0) {
        return (
            <div className="card" style={{ marginBottom: '3rem' }}>
                <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem 0', color: 'var(--text-main)' }}>
                    🌐 서버별 TOP 3
                </h3>
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-disabled)' }}>
                    아직 서버별 데이터가 없습니다
                </div>
            </div>
        )
    }

    return (
        <div className="card" style={{ marginBottom: '3rem' }}>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 1.5rem 0', color: 'var(--text-main)' }}>
                🌐 서버별 TOP 3 캐릭터
            </h3>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1rem'
            }}>
                {Object.entries(serverData).map(([server, characters]: [string, any]) => (
                    <div
                        key={server}
                        style={{
                            background: 'var(--bg-main)',
                            padding: '1rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border)'
                        }}
                    >
                        <div style={{
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            marginBottom: '0.8rem',
                            color: 'var(--primary)',
                            borderBottom: '1px solid var(--border)',
                            paddingBottom: '0.5rem'
                        }}>
                            {server}
                        </div>
                        {characters && characters.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {characters.map((char: any, i: number) => (
                                    <div
                                        key={i}
                                        onClick={() => router.push(`/c/${char.server}/${char.name}`)}
                                        style={{
                                            padding: '0.5rem',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            transition: 'background 0.2s',
                                            fontSize: '0.85rem'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <span style={{
                                                    color: i === 0 ? 'var(--primary)' : 'var(--text-secondary)',
                                                    marginRight: '0.5rem',
                                                    fontWeight: 'bold'
                                                }}>{i + 1}.</span>
                                                <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>{char.name}</span>
                                            </div>
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                                {char.power.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-disabled)', fontSize: '0.8rem' }}>
                                데이터 없음
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div >
    )
}

