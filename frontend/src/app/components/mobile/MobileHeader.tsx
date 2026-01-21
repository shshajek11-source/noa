'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabaseApi, CharacterSearchResult } from '../../../lib/supabaseApi'
import { useAuth } from '@/context/AuthContext'
import SearchAutocomplete from '../SearchAutocomplete'
import styles from './MobileHeader.module.css'

export default function MobileHeader() {
    const router = useRouter()
    const pathname = usePathname()

    // Google 인증
    const { isAuthenticated, user, signInWithGoogle, signOut, isLoading } = useAuth()

    // --- State ---
    const [searchValue, setSearchValue] = useState('')
    const [results, setResults] = useState<CharacterSearchResult[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [showResults, setShowResults] = useState(false)
    const [searchWarning, setSearchWarning] = useState<string | undefined>(undefined)

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
        setShowResults(false) // 검색 후 자동완성 닫기
    }

    const handleResultSelect = (char: CharacterSearchResult) => {
        setShowResults(false)
        const raceVal = (char.race === 'Elyos' || char.race === '천족') ? 'elyos' : 'asmodian'
        router.push(`/c/${char.server}/${char.name}?race=${raceVal}`)
    }

    // 현재 활성화된 탭 확인
    const isActive = (path: string) => {
        if (path === '/' && pathname === '/') return true
        if (path !== '/' && pathname?.startsWith(path)) return true
        return false
    }

    return (
        <div className={styles.headerContainer}>
            {/* Header - 로고 중앙, 구글 로그인 오른쪽 */}
            <header className={styles.header}>
                <div className={styles.headerLeft} />
                <Link href="/" className={styles.logo}>
                    <span className={styles.logoSu}>SU</span>
                    <span className={styles.logoGo}>GO</span>
                </Link>
                {isLoading ? (
                    <div className={styles.googleLoginBtn} style={{ opacity: 0.6 }}>
                        <span>...</span>
                    </div>
                ) : isAuthenticated ? (
                    <button className={styles.googleLoginBtn} onClick={signOut}>
                        <span className={styles.userAvatar}>
                            {user?.email?.charAt(0).toUpperCase() || 'U'}
                        </span>
                        <span>로그아웃</span>
                    </button>
                ) : (
                    <button className={styles.googleLoginBtn} onClick={signInWithGoogle}>
                        <svg width="16" height="16" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        <span>로그인</span>
                    </button>
                )}
            </header>

            {/* 검색창 - 별도 줄 */}
            <div className={styles.searchRow}>
                <div className={styles.searchWrapper}>
                    <div className={styles.searchBar}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
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
            </div>

            {/* 메뉴 탭 */}
            <nav className={styles.menuTabs}>
                <Link href="/" className={`${styles.menuTab} ${isActive('/') ? styles.menuTabActive : ''}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    </svg>
                    <span>홈</span>
                </Link>
                <Link href="/ranking" className={`${styles.menuTab} ${isActive('/ranking') ? styles.menuTabActive : ''}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 20V10M12 20V4M6 20v-6" />
                    </svg>
                    <span>랭킹</span>
                </Link>
                <Link href="/party" className={`${styles.menuTab} ${isActive('/party') ? styles.menuTabActive : ''}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span>파티</span>
                </Link>
                <Link href="/ledger" className={`${styles.menuTab} ${isActive('/ledger') ? styles.menuTabActive : ''}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                    <span>가계부</span>
                </Link>
            </nav>
        </div>
    )
}
