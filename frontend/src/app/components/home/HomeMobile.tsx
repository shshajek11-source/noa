'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { supabaseApi, CharacterSearchResult } from '../../../lib/supabaseApi'
import SearchAutocomplete from '../SearchAutocomplete'
import styles from './HomeMobile.module.css'

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
        <div className={styles.container}>
            {/* Header - 일반 배치 (스크롤과 함께 움직임) */}
            <header className={styles.header}>
                <div className={styles.logo}>
                    <span className={styles.logoSu}>SU</span>
                    <span className={styles.logoGo}>GO</span>
                    <span className={styles.logoGg}>.gg</span>
                </div>
                <div className={styles.searchWrapper}>
                    <div className={styles.searchBar}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-disabled)" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="text"
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            placeholder="캐릭터 검색..."
                            className={styles.searchInput}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchValue)}
                            onFocus={() => searchValue.length > 0 && setShowResults(true)}
                        />
                    </div>
                    {showResults && (
                        <div className={styles.autocompleteWrapper}>
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
            </header>

            {/* 메뉴 탭 - 일반 배치 */}
            <nav className={styles.menuTabs}>
                <Link href="/" className={`${styles.menuTab} ${styles.menuTabActive}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    </svg>
                    <span>홈</span>
                </Link>
                <Link href="/ranking" className={styles.menuTab}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 20V10M12 20V4M6 20v-6" />
                    </svg>
                    <span>랭킹</span>
                </Link>
                <Link href="/party" className={styles.menuTab}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span>파티</span>
                </Link>
                <Link href="/ledger/mobile" className={styles.menuTab}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                    <span>가계부</span>
                </Link>
            </nav>

            {/* 대표 캐릭터 카드 */}
            <section className={styles.mainCharSection}>
                {mainCharacter ? (
                    <div
                        className={styles.mainCharCard}
                        onClick={() => router.push(`/c/${mainCharacter.server}/${mainCharacter.name}`)}
                    >
                        <div className={styles.mainCharInfo}>
                            <span className={styles.mainCharServer}>{mainCharacter.server}</span>
                            <h2 className={styles.mainCharName}>{mainCharacter.name}</h2>
                            <div className={styles.mainCharBadges}>
                                <span className={styles.badge}>Lv.{mainCharacter.level}</span>
                                <span className={styles.badgeHighlight}>{mainCharacter.className}</span>
                            </div>
                        </div>
                        <div className={styles.mainCharStats}>
                            <div className={styles.statItem}>
                                <span className={styles.statLabel}>PVE</span>
                                <span className={styles.statValue}>{mainCharacter.pve_score?.toLocaleString() || '-'}</span>
                            </div>
                            <div className={styles.statItem}>
                                <span className={styles.statLabel}>PVP</span>
                                <span className={styles.statValue}>{mainCharacter.pvp_score?.toLocaleString() || '-'}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className={styles.mainCharEmpty}>
                        <p>대표 캐릭터를 설정해보세요</p>
                        <span>캐릭터 검색 후 별 아이콘을 눌러 등록</span>
                    </div>
                )}
            </section>

            {/* 최근 검색 캐릭터 */}
            {recentCharacters.length > 0 && (
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h3 className={styles.sectionTitle}>최근 검색</h3>
                        <button
                            className={styles.clearBtn}
                            onClick={() => {
                                setRecentCharacters([])
                                localStorage.removeItem('recent_characters')
                            }}
                        >
                            전체 삭제
                        </button>
                    </div>
                    <div className={styles.recentList}>
                        {recentCharacters.slice(0, 5).map((char: any, i: number) => (
                            <div
                                key={i}
                                className={styles.recentItem}
                                onClick={() => router.push(`/c/${char.server}/${char.name}`)}
                            >
                                <div className={styles.recentAvatar}>
                                    {char.name?.charAt(0) || '?'}
                                </div>
                                <div className={styles.recentInfo}>
                                    <span className={styles.recentName}>{char.name}</span>
                                    <span className={styles.recentMeta}>{char.server} · Lv.{char.level}</span>
                                </div>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-disabled)" strokeWidth="2">
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* 실시간 랭킹 */}
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>실시간 랭킹</h3>
                    <Link href="/ranking" className={styles.moreLink}>전체보기</Link>
                </div>
                <div className={styles.rankingList}>
                    {[1, 2, 3].map(rank => (
                        <div key={rank} className={styles.rankingItem}>
                            <div className={`${styles.rankBadge} ${rank === 1 ? styles.rankFirst : ''}`}>
                                {rank}
                            </div>
                            <div className={styles.rankingInfo}>
                                <span className={styles.rankingName}>캐릭터명</span>
                                <span className={styles.rankingMeta}>지켈 · 포식자</span>
                            </div>
                            <div className={styles.rankingScore}>
                                <span className={styles.scoreLabel}>PVE</span>
                                <span className={styles.scoreNum}>5,420</span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 서버 현황 */}
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>서버 현황</h3>
                </div>
                <div className={styles.serverGrid}>
                    <div className={`${styles.serverCard} ${styles.serverElyos}`}>
                        <span className={styles.serverLabel}>천족 우세</span>
                        <span className={styles.serverName}>이스라펠</span>
                        <span className={styles.serverTax}>세금 2.4%</span>
                    </div>
                    <div className={`${styles.serverCard} ${styles.serverAsmo}`}>
                        <span className={styles.serverLabel}>마족 우세</span>
                        <span className={styles.serverName}>지켈</span>
                        <span className={styles.serverTax}>세금 5.0%</span>
                    </div>
                </div>
            </section>

            {/* 공지사항 */}
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>공식 공지</h3>
                </div>
                <div className={styles.noticeList}>
                    {['[점검] 1월 22일 정기 점검 안내', '[이벤트] 오픈 기념 쿠폰 지급', '[공지] 서버 안정화 작업'].map((notice, i) => (
                        <div key={i} className={styles.noticeItem}>
                            <span className={`${styles.noticeDot} ${i === 0 ? styles.noticeDotNew : ''}`} />
                            <span className={styles.noticeText}>{notice}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* 하단 여백 (광고 영역용) */}
            <div className={styles.bottomSpacer} />
        </div>
    )
}
