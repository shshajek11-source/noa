'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useCharacterSearch } from '@/hooks/useCharacterSearch'
import { CharacterSearchResult } from '@/lib/supabaseApi'
import SearchAutocomplete from '../SearchAutocomplete'
import AdSenseBanner from '@/components/AdSenseBanner'
import styles from './HomeMobile.module.css'

// 서버 ID -> 이름 매핑
const SERVER_MAP: Record<string, string> = {
    '1001': '이스라펠',
    '1002': '지켈',
    '1003': '카이시넬',
    '1004': '마르쿠탄'
}

// 랭킹 캐릭터 타입
interface RankingCharacter {
    character_id: string
    name: string
    server_id: string
    race_name: string
    class_name: string
    noa_score?: number
    hiton_score?: number
    profile_image?: string
}

// 서버 통계 타입
interface ServerStats {
    elyosPercent: number
    asmodianPercent: number
    totalCharacters: number
    topClasses: { name: string; percent: number }[]
}

// 공지사항 타입
interface NewsItem {
    id: string
    title: string
    postedAt: string
    link: string
}

export default function HomeMobile() {
    const router = useRouter()
    const searchWrapperRef = useRef<HTMLDivElement>(null)

    // Auth Context - 대표 캐릭터 관리
    const { mainCharacter, setMainCharacter: setMainCharacterApi, isAuthenticated } = useAuth()

    // 대표 캐릭터 검색 훅
    const {
        query: mainCharQuery,
        setQuery: setMainCharQuery,
        results: mainCharResults,
        isSearching: isMainCharSearching,
        showResults: showMainCharResults,
        setShowResults: setShowMainCharResults,
        clearResults: clearMainCharResults
    } = useCharacterSearch({ debounceMs: 300, minLength: 1 })

    // --- State ---
    const [recentCharacters, setRecentCharacters] = useState<any[]>([])
    const [showMainCharSearch, setShowMainCharSearch] = useState(false)
    const [isSettingMainChar, setIsSettingMainChar] = useState(false)

    // API 데이터 State
    const [rankingData, setRankingData] = useState<RankingCharacter[]>([])
    const [rankingLoading, setRankingLoading] = useState(true)

    const [serverStats, setServerStats] = useState<ServerStats | null>(null)
    const [statsLoading, setStatsLoading] = useState(true)

    const [news, setNews] = useState<NewsItem[]>([])
    const [newsLoading, setNewsLoading] = useState(true)

    // --- Effects ---
    // localStorage 데이터 로드 (최근 검색만)
    useEffect(() => {
        const recent = localStorage.getItem('recent_characters')
        if (recent) setRecentCharacters(JSON.parse(recent))
    }, [])

    // 외부 클릭 시 검색창 닫기
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
                setShowMainCharResults(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [setShowMainCharResults])

    // 대표 캐릭터 선택 핸들러
    const handleSelectMainCharacter = async (char: CharacterSearchResult) => {
        setIsSettingMainChar(true)
        try {
            const characterData = {
                characterId: char.characterId,
                server: char.server,
                name: char.name.replace(/<\/?[^>]+(>|$)/g, ''),
                className: char.job || '',
                level: char.level || 0,
                race: char.race,
                item_level: char.item_level,
                pve_score: char.pve_score,
                pvp_score: char.pvp_score,
                imageUrl: char.imageUrl
            }

            if (isAuthenticated) {
                // 로그인 상태: API로 저장
                await setMainCharacterApi(characterData)
            } else {
                // 비로그인 상태: localStorage에 저장
                localStorage.setItem('main_character', JSON.stringify(characterData))
            }

            setShowMainCharSearch(false)
            setMainCharQuery('')
            clearMainCharResults()
        } catch (err) {
            console.error('[HomeMobile] Failed to set main character:', err)
            alert('대표 캐릭터 설정에 실패했습니다.')
        } finally {
            setIsSettingMainChar(false)
        }
    }

    // API 데이터 로드 (병렬)
    useEffect(() => {
        // 랭킹 데이터
        const fetchRanking = async () => {
            try {
                const res = await fetch('/api/ranking?limit=3&type=cp')
                if (res.ok) {
                    const json = await res.json()
                    setRankingData(json.data || [])
                }
            } catch (e) {
                console.error('[HomeMobile] Ranking fetch error:', e)
            } finally {
                setRankingLoading(false)
            }
        }

        // 서버 통계 데이터
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/stats/overview')
                if (res.ok) {
                    const json = await res.json()
                    if (json.totalCharacters !== undefined) {
                        setServerStats(json)
                    }
                }
            } catch (e) {
                console.error('[HomeMobile] Stats fetch error:', e)
            } finally {
                setStatsLoading(false)
            }
        }

        // 공지사항 데이터
        const fetchNews = async () => {
            try {
                const res = await fetch('/api/official-news?board=update_ko&size=3')
                if (res.ok) {
                    const json = await res.json()
                    if (json.success) {
                        setNews(json.items || [])
                    }
                }
            } catch (e) {
                console.error('[HomeMobile] News fetch error:', e)
            } finally {
                setNewsLoading(false)
            }
        }

        // 병렬 실행
        Promise.all([fetchRanking(), fetchStats(), fetchNews()])
    }, [])

    return (
        <div className={styles.container}>
            {/* Header & Menu Tabs -> Removed (Moved to Global Layout) */}

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
                    {rankingLoading ? (
                        <div className={styles.loadingState}>로딩중...</div>
                    ) : rankingData.length === 0 ? (
                        <div className={styles.emptyState}>데이터 없음</div>
                    ) : (
                        rankingData.map((char, idx) => {
                            const rank = idx + 1
                            const serverName = SERVER_MAP[char.server_id] || char.server_id
                            const isElyos = char.race_name?.toLowerCase() === 'elyos'
                            return (
                                <div
                                    key={char.character_id}
                                    className={styles.rankingItem}
                                    onClick={() => router.push(`/c/${encodeURIComponent(serverName)}/${encodeURIComponent(char.name)}`)}
                                >
                                    <div className={`${styles.rankBadge} ${rank === 1 ? styles.rankFirst : ''}`}>
                                        {rank}
                                    </div>
                                    <div className={styles.rankingInfo}>
                                        <span className={styles.rankingName}>{char.name}</span>
                                        <span className={styles.rankingMeta}>{serverName} · {isElyos ? '천족' : '마족'}</span>
                                    </div>
                                    <div className={styles.rankingScore}>
                                        <span className={styles.scoreLabel}>HITON</span>
                                        <span className={styles.scoreNum}>{(char.noa_score || char.hiton_score || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </section>

            {/* 서버 현황 */}
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>서버 현황</h3>
                    {serverStats && (
                        <span className={styles.statsMeta}>{serverStats.totalCharacters.toLocaleString()} 캐릭터</span>
                    )}
                </div>
                {statsLoading ? (
                    <div className={styles.loadingState}>로딩중...</div>
                ) : serverStats ? (
                    <>
                        <div className={styles.serverGrid}>
                            <div className={`${styles.serverCard} ${styles.serverElyos}`}>
                                <span className={styles.serverLabel}>천족</span>
                                <span className={styles.serverPercent}>{serverStats.elyosPercent}%</span>
                                <span className={styles.serverCount}>
                                    {Math.round(serverStats.totalCharacters * serverStats.elyosPercent / 100).toLocaleString()}명
                                </span>
                            </div>
                            <div className={`${styles.serverCard} ${styles.serverAsmo}`}>
                                <span className={styles.serverLabel}>마족</span>
                                <span className={styles.serverPercent}>{serverStats.asmodianPercent}%</span>
                                <span className={styles.serverCount}>
                                    {Math.round(serverStats.totalCharacters * serverStats.asmodianPercent / 100).toLocaleString()}명
                                </span>
                            </div>
                        </div>
                        {/* 비율 바 */}
                        <div className={styles.ratioBar}>
                            <div className={styles.ratioElyos} style={{ width: `${serverStats.elyosPercent}%` }} />
                            <div className={styles.ratioAsmo} style={{ width: `${serverStats.asmodianPercent}%` }} />
                        </div>
                        {/* 인기 직업 */}
                        {serverStats.topClasses && serverStats.topClasses.length > 0 && (
                            <div className={styles.topClasses}>
                                <span className={styles.topClassesLabel}>인기 직업</span>
                                <div className={styles.topClassesList}>
                                    {serverStats.topClasses.slice(0, 3).map((cls, idx) => (
                                        <span key={idx} className={styles.topClassItem}>
                                            {cls.name} {cls.percent}%
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className={styles.emptyState}>통계 데이터 없음</div>
                )}
            </section>

            {/* 공지사항 */}
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>공식 업데이트</h3>
                    <a
                        href="https://aion2.plaync.com/ko-kr/board/update/list"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.moreLink}
                    >
                        더보기
                    </a>
                </div>
                <div className={styles.noticeList}>
                    {newsLoading ? (
                        <div className={styles.loadingState}>로딩중...</div>
                    ) : news.length === 0 ? (
                        <div className={styles.emptyState}>공지 없음</div>
                    ) : (
                        news.map((item, i) => {
                            // 날짜 포맷: 2026-01-06 19:30:00.001 -> 01/06
                            const formatDate = (dateStr: string) => {
                                if (!dateStr) return ''
                                try {
                                    const date = new Date(dateStr.replace(' ', 'T'))
                                    const month = String(date.getMonth() + 1).padStart(2, '0')
                                    const day = String(date.getDate()).padStart(2, '0')
                                    return `${month}/${day}`
                                } catch {
                                    return dateStr.slice(5, 10).replace('-', '/')
                                }
                            }
                            return (
                                <a
                                    key={item.id}
                                    href={item.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.noticeItem}
                                >
                                    <span className={styles.noticeDate}>{formatDate(item.postedAt)}</span>
                                    <span className={styles.noticeText}>{item.title.replace(/\[안내\]\s*/g, '')}</span>
                                </a>
                            )
                        })
                    )}
                </div>
            </section>

            {/* 하단 광고 */}
            <section className={styles.adSection}>
                <AdSenseBanner
                    adFormat="horizontal"
                    style={{ marginTop: '16px' }}
                />
            </section>

            {/* 하단 여백 */}
            <div className={styles.bottomSpacer} />
        </div>
    )
}
