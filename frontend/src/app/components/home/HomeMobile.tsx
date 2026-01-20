'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import styles from '../../Home.module.css'
import { supabaseApi, CharacterSearchResult } from '../../../lib/supabaseApi'
import SearchAutocomplete from '../SearchAutocomplete'

export default function HomeMobile() {
    const router = useRouter()

    // --- State ---
    const [recentCharacters, setRecentCharacters] = useState<any[]>([])
    const [mainCharacter, setMainCharacter] = useState<any>(null)
    const [searchValue, setSearchValue] = useState('')
    const [results, setResults] = useState<CharacterSearchResult[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [showResults, setShowResults] = useState(false)
    const [searchWarning, setSearchWarning] = useState<string | undefined>(undefined)

    // --- Effects ---
    useEffect(() => {
        // Load Recent & Main Character
        const recent = localStorage.getItem('recent_characters')
        if (recent) setRecentCharacters(JSON.parse(recent))

        const main = localStorage.getItem('main_character')
        if (main) setMainCharacter(JSON.parse(main))
    }, [])

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchValue.trim().length >= 1) {
                performSearch(searchValue)
            } else {
                setResults([])
                setShowResults(false)
            }
        }, 300)
        return () => clearTimeout(timer)
    }, [searchValue])

    const performSearch = async (term: string) => {
        setIsSearching(true)
        setShowResults(true)
        setSearchWarning(undefined)

        try {
            // 외부 API 검색
            const res = await supabaseApi.searchCharacter(term)
            setResults(res.list)
            if (res.warning) setSearchWarning(res.warning)
        } catch (e) {
            console.error("Search failed", e)
        } finally {
            setIsSearching(false)
        }
    }

    const handleSearch = (term: string) => {
        if (!term.trim()) return
        router.push(`/c/all/${encodeURIComponent(term)}`)
    }

    const handleResultSelect = (char: CharacterSearchResult) => {
        setShowResults(false)
        const raceVal = (char.race === 'Elyos' || char.race === '천족') ? 'elyos' : 'asmodian'
        router.push(`/c/${char.server}/${char.name}?race=${raceVal}`)
    }

    return (
        <div style={{ paddingBottom: '80px', background: 'var(--bg-main)', minHeight: '100vh' }}>

            {/* 1. Sticky Header & Search */}
            <header className={styles.categoryHeader} style={{
                position: 'sticky', top: 0, zIndex: 100,
                padding: '12px 16px', background: 'rgba(22, 22, 24, 0.95)', backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border)'
            }}>
                {/* Logo */}
                <div style={{ fontWeight: 800, fontSize: '1.4rem', letterSpacing: '-0.5px', fontFamily: 'Rajdhani, sans-serif' }}>
                    <span style={{ color: 'var(--brand-orange)' }}>SU</span>
                    <span style={{ color: '#fff' }}>GO</span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-disabled)', marginLeft: '1px' }}>.gg</span>
                </div>
                {/* Search Bar (Compact) */}
                <div style={{ flex: 1 }}>
                    <div style={{
                        background: 'var(--bg-secondary)', borderRadius: '20px', padding: '8px 16px',
                        display: 'flex', alignItems: 'center', border: '1px solid var(--border)'
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-disabled)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input
                            type="text"
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            placeholder="캐릭터 검색..."
                            style={{
                                background: 'transparent', border: 'none', marginLeft: '8px',
                                color: 'var(--text-main)', width: '100%', fontSize: '0.9rem', outline: 'none'
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchValue)}
                            onFocus={() => searchValue.length > 0 && setShowResults(true)}
                        />
                    </div>

                    {/* Autocomplete Dropdown */}
                    {showResults && (
                        <div style={{ position: 'absolute', top: '100%', left: '16px', right: '16px', zIndex: 1000 }}>
                            <SearchAutocomplete
                                results={results}
                                isLoading={isSearching}
                                isVisible={showResults}
                                onSelect={handleResultSelect}
                                warning={searchWarning}
                            />
                        </div>
                    )}
                </div>
                {/* My Profile Icon */}
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>
                    </svg>
                </div>
            </header>

            {/* 2. Main Character Card (1/5 Height) */}
            <section style={{
                height: '20vh', minHeight: '160px', position: 'relative',
                margin: '16px', borderRadius: '16px', overflow: 'hidden',
                border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }}>
                {mainCharacter ? (
                    <div style={{ height: '100%', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(30,28,38,0.95), rgba(20,18,28,0.95))' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{mainCharacter.server}</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: '4px 0' }}>{mainCharacter.name}</div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <span className={styles.badge} style={{ background: 'var(--bg-hover)' }}>Lv.{mainCharacter.level}</span>
                            <span className={styles.badge} style={{ color: 'var(--brand-orange)' }}>PVP {mainCharacter.pvp || '0'}</span>
                        </div>
                    </div>
                ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>아직 대표 캐릭터가 없습니다</div>
                        <button style={{ padding: '8px 16px', borderRadius: '20px', background: 'var(--primary)', color: '#000', border: 'none', fontWeight: 700, fontSize: '0.85rem' }}>
                            설정하기
                        </button>
                    </div>
                )}
            </section>

            {/* 3. My Characters (Horizontal Scroll) */}
            <section style={{ padding: '0 16px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 700 }}>내 캐릭터</div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-disabled)' }}>편집</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
                    {/* Add Button */}
                    <div style={{ flexShrink: 0, width: '50px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '50px', height: '50px', borderRadius: '25px', border: '1px dashed var(--text-disabled)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-disabled)" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </div>
                    </div>

                    {recentCharacters.map((char: any, i: number) => (
                        <div key={i} style={{ flexShrink: 0, width: '50px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: '50px', height: '50px', borderRadius: '25px', background: '#333', overflow: 'hidden' }}>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {char.name}
                            </span>
                        </div>
                    ))}

                    {/* Dummy Data for Visual Test */}
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={`d-${i}`} style={{ flexShrink: 0, width: '50px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: '50px', height: '50px', borderRadius: '25px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}></div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-disabled)' }}>User{i}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* 4. Live Stream Slider */}
            <section style={{ padding: '0 16px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>치지직 라이브 <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>●</span></h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-disabled)' }}>더보기</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} style={{ flexShrink: 0, width: '160px', height: '90px', borderRadius: '8px', background: '#222', position: 'relative', border: '1px solid var(--border)', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                            </div>
                            <span style={{ position: 'absolute', bottom: '8px', left: '8px', fontSize: '0.75rem', fontWeight: 600, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>방송 제목 {i}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* 5. Live Ranking (Slider) */}
            <section style={{ padding: '0 16px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>실시간 랭킹</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-disabled)' }}>전체보기</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none' }}>
                    {[1, 2, 3].map(rank => (
                        <div key={rank} style={{
                            minWidth: '280px', flex: '0 0 auto',
                            background: 'var(--bg-secondary)', borderRadius: '12px', padding: '16px',
                            border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px'
                        }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '24px', background: rank === 1 ? 'var(--brand-orange)' : '#444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold' }}>
                                {rank}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--brand-orange)' }}>#{rank} 전체 랭킹</div>
                                <div style={{ fontWeight: 700, fontSize: '1rem' }}>지켈 / 포식자 / 닉네임</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>전투력 5,420</div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 6. Server Stats Dashboard */}
            <section style={{ padding: '0 16px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>서버 현황</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ background: 'rgba(45, 212, 191, 0.1)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(45, 212, 191, 0.2)' }}>
                        <div style={{ fontSize: '0.8rem', color: '#2DD4BF', marginBottom: '4px' }}>천족 우세</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>이스라펠</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>세금 2.4%</div>
                    </div>
                    <div style={{ background: 'rgba(167, 139, 250, 0.1)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(167, 139, 250, 0.2)' }}>
                        <div style={{ fontSize: '0.8rem', color: '#A78BFA', marginBottom: '4px' }}>마족 우세</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>지켈</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>세금 5.0%</div>
                    </div>
                    {/* More compact stats */}
                    <div style={{ gridColumn: 'span 2', background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>총 누적 접속자</span>
                        <span style={{ fontWeight: 700, fontFamily: 'Rajdhani', fontSize: '1.1rem' }}>12,402</span>
                    </div>
                </div>
            </section>

            {/* 7. Official Notices */}
            <section style={{ padding: '0 16px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>공식 공지사항</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Dummy Notices */}
                    {['[점검] 1월 22일 정기 점검 안내', '[이벤트] 오픈 기념 쿠폰 지급 안내', '[공지] 서버 안정화 작업 진행'].map((notice, i) => (
                        <div key={i} style={{
                            background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '8px',
                            border: '1px solid var(--border)', fontSize: '0.9rem', color: 'var(--text-main)',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}>
                            <span style={{
                                display: 'inline-block', width: '4px', height: '4px', borderRadius: '50%',
                                background: i === 0 ? 'var(--brand-orange)' : 'var(--text-disabled)'
                            }}></span>
                            {notice}
                        </div>
                    ))}
                </div>
            </section>

            {/* 8. Bottom Navigation */}
            <nav style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, height: '60px',
                background: 'rgba(22, 22, 24, 0.98)', borderTop: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 999,
                paddingBottom: 'env(safe-area-inset-bottom)'
            }}>
                {['홈', '랭킹', '가계부', '숙제', '더보기'].map((item, i) => {
                    const isActive = i === 0
                    const isRanking = item === '랭킹'
                    return (
                        <div
                            key={item}
                            onClick={() => {
                                if (item === '홈') router.push('/')
                                if (item === '랭킹') router.push('/ranking')
                            }}
                            style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                                opacity: isActive ? 1 : 0.5, cursor: 'pointer'
                            }}
                        >
                            <div style={{ width: '20px', height: '20px', background: isActive ? 'var(--brand-orange)' : '#888', borderRadius: '4px' }}></div>
                            <span style={{ fontSize: '0.7rem', color: isActive ? 'var(--brand-orange)' : 'var(--text-secondary)' }}>{item}</span>
                        </div>
                    )
                })}
            </nav>
        </div>
    )
}
