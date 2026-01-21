'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronDown, X, Star, Check } from 'lucide-react' // Added Check
import SearchAutocomplete from './SearchAutocomplete'
import { supabaseApi, CharacterSearchResult, SERVER_NAME_TO_ID, SERVER_ID_TO_NAME } from '../../lib/supabaseApi'
import { useSyncContext } from '../../context/SyncContext'
import styles from './SearchBar.module.css' // Added CSS module import

// 최근 검색 캐릭터 타입
interface RecentSearch {
    characterId: string
    name: string
    server: string
    server_id?: number
    race: string
    pve_score?: number
    item_level?: number
    imageUrl?: string
    timestamp: number
}

// 대표 캐릭터 타입
export interface MainCharacter {
    characterId: string
    name: string
    server: string
    server_id?: number
    race: string
    className?: string
    level?: number
    hit_score?: number // 호환성 유지
    pve_score?: number
    pvp_score?: number
    item_level?: number
    imageUrl?: string
    setAt: number
}

// localStorage 키
const RECENT_SEARCHES_KEY = 'aion2_recent_searches'
export const MAIN_CHARACTER_KEY = 'aion2_main_character'
const MAX_RECENT_SEARCHES = 5

// Define servers
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

export default function SearchBar() {
    const router = useRouter()
    const { enqueueSync } = useSyncContext()

    // Search State
    const [race, setRace] = useState<'elyos' | 'asmodian'>('elyos')
    const [server, setServer] = useState('')
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // UI State
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)

    // Autocomplete State
    const [showResults, setShowResults] = useState(false)
    const [results, setResults] = useState<CharacterSearchResult[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [searchWarning, setSearchWarning] = useState<string | undefined>(undefined)
    const lastSearchTermRef = useRef<string>('')  // 재검색을 위한 마지막 검색어

    const wrapperRef = useRef<HTMLDivElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const suppressResultsRef = useRef(false)

    // 최근 검색 State
    const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([])

    // 대표 캐릭터 State
    const [mainCharacter, setMainCharacter] = useState<MainCharacter | null>(null)

    // localStorage에서 최근 검색 + 대표캐릭터 불러오기 + 검색어 초기화
    useEffect(() => {
        // 홈페이지 진입 시 검색어 초기화
        setName('')
        setShowResults(false)
        suppressResultsRef.current = false

        try {
            const saved = localStorage.getItem(RECENT_SEARCHES_KEY)
            console.log('[Recent Search] Loading from localStorage:', saved)
            if (saved) {
                const parsed = JSON.parse(saved)
                console.log('[Recent Search] Loaded:', parsed.length, 'items')
                setRecentSearches(parsed)
            }
        } catch (e) {
            console.error('Failed to load recent searches', e)
        }

        // 대표 캐릭터 불러오기
        try {
            const savedMain = localStorage.getItem(MAIN_CHARACTER_KEY)
            if (savedMain) {
                setMainCharacter(JSON.parse(savedMain))
            }
        } catch (e) {
            console.error('Failed to load main character', e)
        }
    }, [])

    // 최근 검색에 추가
    const addRecentSearch = (char: CharacterSearchResult) => {
        // characterId가 없으면 저장하지 않음
        if (!char.characterId) {
            console.warn('[Recent Search] Skipping - no characterId:', char.name)
            return
        }

        const cleanName = char.name.replace(/<\/?[^>]+(>|$)/g, '')
        const imageUrl = char.imageUrl || char.profileImage
        console.log('[Recent Search] Adding:', cleanName, 'characterId:', char.characterId, 'imageUrl:', imageUrl)

        const newRecent: RecentSearch = {
            characterId: char.characterId,
            name: cleanName,
            server: char.server,
            server_id: char.server_id,
            race: char.race,
            pve_score: char.pve_score,
            item_level: char.item_level,
            imageUrl: char.imageUrl || char.profileImage,
            timestamp: Date.now()
        }

        setRecentSearches(prev => {
            // 중복 제거
            const filtered = prev.filter(r => r.characterId !== char.characterId)
            // 맨 앞에 추가, 최대 5개
            const updated = [newRecent, ...filtered].slice(0, MAX_RECENT_SEARCHES)
            // localStorage 저장
            try {
                localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
                console.log('[Recent Search] Saved to localStorage:', updated.length, 'items')
            } catch (e) {
                console.error('Failed to save recent searches', e)
            }
            return updated
        })
    }

    // 최근 검색에서 삭제
    const removeRecentSearch = (characterId: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setRecentSearches(prev => {
            const updated = prev.filter(r => r.characterId !== characterId)
            try {
                localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
            } catch (e) {
                console.error('Failed to save recent searches', e)
            }
            return updated
        })
    }

    // 최근 검색 클릭
    const handleRecentClick = (recent: RecentSearch) => {
        let raceVal: 'elyos' | 'asmodian' = 'elyos'
        if (recent.race === 'Asmodian' || recent.race === '마족') raceVal = 'asmodian'
        const query = `?race=${raceVal}`
        router.push(`/c/${recent.server}/${recent.name}${query}`)
    }

    // 검색 키워드가 없으면 자동으로 전체 서버로 설정
    useEffect(() => {
        if (name.trim().length === 0) {
            setServer('')
        }
    }, [name])

    // Debounce Logic
    useEffect(() => {
        const timer = setTimeout(() => {
            if (suppressResultsRef.current) {
                setResults([])
                setShowResults(false)
                return
            }
            if (name.trim().length >= 1) {
                performHybridSearch(name)
            } else {
                setResults([])
                setShowResults(false)
            }
        }, 150)
        return () => clearTimeout(timer)
    }, [name, race, server])

    // Outside Click & Key Handler
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowResults(false)
            }
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
                wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false)
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setShowResults(false)
                setIsDropdownOpen(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        document.addEventListener("keydown", handleKeyDown)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
            document.removeEventListener("keydown", handleKeyDown)
        }
    }, [])

    // Dynamic Server List based on Race
    const currentServerList = race === 'elyos' ? ELYOS_SERVERS : ASMODIAN_SERVERS

    const effectiveRace = server ? race : undefined

    // Auto-select first server logic (Optional: Can keep empty to force selection)
    // Removed auto-select to let user choose explicitly or default to empty

    const performHybridSearch = async (searchTerm: string, forceFresh: boolean = false) => {
        setIsSearching(true)
        setShowResults(true)
        setIsDropdownOpen(false) // 검색 결과창 열면 서버 드롭다운 닫기
        setSearchWarning(undefined)  // 경고 초기화
        lastSearchTermRef.current = searchTerm  // 재검색을 위해 저장
        if (!forceFresh) setResults([])

        const serverId = server ? SERVER_NAME_TO_ID[server] : undefined
        const raceFilter = effectiveRace

        const normalizeName = (value: string) => value.replace(/<\/?[^>]+(>|$)/g, '').trim().toLowerCase()
        const buildKey = (value: CharacterSearchResult) => {
            if (value.characterId) return `id:${value.characterId}`
            const serverKey = value.server_id ?? value.server
            return `sv:${serverKey}|name:${normalizeName(value.name)}`
        }

        const updateResults = (newResults: CharacterSearchResult[]) => {
            setResults(prev => {
                const combined = [...prev]
                const seen = new Set(prev.map(p => buildKey(p)))

                const filtered = newResults.filter(r => {
                    // server_id (DB) 또는 serverId (API) 둘 다 지원
                    const charServerId = r.server_id ?? r.serverId
                    if (serverId && charServerId !== serverId) return false
                    if (raceFilter) {
                        const rRace = r.race.toLowerCase()
                        const selectedRace = raceFilter.toLowerCase()
                        const isElyos = rRace === 'elyos' || rRace === '천족'
                        const isAsmodian = rRace === 'asmodian' || rRace === '마족'
                        if (selectedRace === 'elyos' && !isElyos) return false
                        if (selectedRace === 'asmodian' && !isAsmodian) return false
                    }
                    return true
                })

                // Use Global Context to sync
                enqueueSync(filtered)

                filtered.forEach(r => {
                    const key = buildKey(r)
                    if (!seen.has(key)) {
                        combined.push(r)
                        seen.add(key)
                    }
                })
                return combined
            })
        }

        // Local DB 검색 (forceFresh가 아닐 때만)
        if (!forceFresh) {
            supabaseApi.searchLocalCharacter(searchTerm, serverId, raceFilter)
                .then(res => updateResults(res))
                .catch(e => console.error("Local search err", e))
        }

        // 외부 API 검색 (forceFresh 옵션 전달)
        supabaseApi.searchCharacter(searchTerm, serverId, raceFilter, 1, forceFresh)
            .then(res => {
                updateResults(res.list)
                // warning이 있으면 표시
                if (res.warning) {
                    setSearchWarning(res.warning)
                }
            })
            .catch(e => console.error("Live search err", e))
            .finally(() => setIsSearching(false))
    }

    // 외부에서 재검색 (forceFresh=true)
    const handleRefreshSearch = () => {
        if (lastSearchTermRef.current) {
            performHybridSearch(lastSearchTermRef.current, true)
        }
    }

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        suppressResultsRef.current = true
        setResults([])
        setShowResults(false)
        setIsDropdownOpen(false)
        if (!name.trim()) {
            setError('캐릭터명을 입력해주세요')
            return
        }

        // If server is selected, proceed as usual
        if (server) {
            setError('')
            setLoading(true)
            const query = race ? `?race=${race}` : ''
            setShowResults(false)
            router.push(`/c/${server}/${name}${query}`)
            setLoading(false)
            return
        }

        // If no server is selected (All Servers search)

        // 1. Check if we have results from the autocomplete
        if (results.length > 0) {
            const exactMatch = results.find(r => r.name === name) || results[0]
            setLoading(true)
            handleResultSelect(exactMatch)
            return
        }

        // 2. No results locally yet? Perform explicit global search
        setLoading(true)
        setError('')

        try {
            // Search globally (server=undefined)
            const searchResponse = await supabaseApi.searchCharacter(name, undefined, effectiveRace, 1)
            const searchResults = searchResponse.list

            if (searchResults && searchResults.length > 0) {
                if (searchResults.length === 1) {
                    // Single match -> Auto Navigate
                    handleResultSelect(searchResults[0])
                } else {
                    // Multiple matches -> Show results for user selection
                    setResults(searchResults)
                    setShowResults(true)
                    setLoading(false)
                    // Sync just in case
                    enqueueSync(searchResults)
                }
            } else {
                setError('검색 결과가 없습니다.')
                setLoading(false)
            }
        } catch (e) {
            console.error("Global search error", e)
            setError('검색 중 오류가 발생했습니다.')
            setLoading(false)
        }
    }

    const handleResultSelect = (char: CharacterSearchResult) => {
        suppressResultsRef.current = true
        setResults([])
        setShowResults(false)
        setIsDropdownOpen(false)

        // Use global queue for syncing the selected character too
        enqueueSync([char])

        // 최근 검색에 추가
        addRecentSearch(char)

        setServer(char.server)
        let raceVal: 'elyos' | 'asmodian' = race
        if (char.race === 'Elyos' || char.race === '천족') raceVal = 'elyos'
        if (char.race === 'Asmodian' || char.race === '마족') raceVal = 'asmodian'
        setRace(raceVal)
        setName(char.name)

        const query = raceVal ? `?race=${raceVal}` : ''
        setShowResults(false)
        router.push(`/c/${char.server}/${char.name}${query}`)
    }

    const toggleDropdown = () => {
        const newState = !isDropdownOpen
        setIsDropdownOpen(newState)
        // 서버 드롭다운 열면 검색 결과창 닫기
        if (newState) {
            setShowResults(false)
        }
    }

    const selectRace = (selectedRace: 'elyos' | 'asmodian') => {
        setRace(selectedRace)
        // Reset server if it doesn't exist in the new race list
        const newServerList = selectedRace === 'elyos' ? ELYOS_SERVERS : ASMODIAN_SERVERS
        if (server && !newServerList.includes(server)) {
            setServer('')
        }
    }

    const selectServer = (selectedServer: string) => {
        setServer(selectedServer)
        setIsDropdownOpen(false)
        setError('')
    }

    // Determine Trigger Button Class - styling now handled inline
    const triggerClass = ''

    // Display Text
    const triggerText = server
        ? `${race === 'elyos' ? '천족' : '마족'} | ${server}`
        : '전체 서버'

    return (
        <div className={`${styles.searchContainer} ${isDropdownOpen || showResults ? styles.focused : ''}`} ref={wrapperRef}>
            <div className={styles.searchWrapper}>
                {/* Server Selection Dropdown */}
                <div className={styles.serverDropdown} ref={dropdownRef}>
                    <button
                        className={`${styles.serverTrigger} ${server ? (race === 'elyos' ? styles.elyos : styles.asmodian) : ''}`}
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                        <span>{server || '전체 서버'}</span>
                        <ChevronDown size={14} className={isDropdownOpen ? 'rotate-180' : ''} style={{ transition: 'transform 0.2s' }} />
                    </button>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                        <div className={styles.dropdownMenu}>
                            {/* Race Select Tabs */}
                            <div className={styles.raceTabs}>
                                <div
                                    className={`${styles.raceTab} ${race === 'elyos' ? styles.activeElyos : ''}`}
                                    onClick={() => setRace('elyos')}
                                >
                                    천족
                                </div>
                                <div
                                    className={`${styles.raceTab} ${race === 'asmodian' ? styles.activeAsmodian : ''}`}
                                    onClick={() => setRace('asmodian')}
                                >
                                    마족
                                </div>
                            </div>

                            {/* Server List */}
                            <div className={styles.serverList}>
                                <div
                                    className={`${styles.serverItem} ${!server ? styles.selected : ''}`}
                                    onClick={() => {
                                        setServer('')
                                        setIsDropdownOpen(false)
                                    }}
                                >
                                    전체 서버
                                    {!server && <Check size={14} className={styles.checkIcon} />}
                                </div>
                                {currentServerList.map((srv) => (
                                    <div
                                        key={srv}
                                        className={`${styles.serverItem} ${server === srv ? styles.selected : ''}`}
                                        onClick={() => {
                                            setServer(srv)
                                            setIsDropdownOpen(false)
                                        }}
                                    >
                                        {srv}
                                        {server === srv && <Check size={14} className={styles.checkIcon} />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Field */}
                <div className={styles.inputWrapper}>
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="캐릭터 검색..."
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value)
                            setShowResults(true)
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                if (results.length > 0) {
                                    const first = results[0]
                                    let raceVal: 'elyos' | 'asmodian' = 'elyos'
                                    if (first.race.toLowerCase().includes('asmodian') || first.race === '마족') {
                                        raceVal = 'asmodian'
                                    }
                                    const query = `?race=${raceVal}`

                                    // 최근 검색어 저장 Logic
                                    addRecentSearch(first)

                                    const serverName = first.server_id ? SERVER_ID_TO_NAME[first.server_id] : first.server
                                    router.push(`/c/${serverName}/${first.name}${query}`)
                                    setShowResults(false)
                                } else {
                                    performHybridSearch(name)
                                }
                            }
                        }}
                    />
                    {name && (
                        <button
                            onClick={() => {
                                setName('')
                                setResults([])
                                setShowResults(false)
                                suppressResultsRef.current = true
                                setTimeout(() => suppressResultsRef.current = false, 350)
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--text-disabled)', cursor: 'pointer', display: 'flex' }}
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Search Button */}
                <button
                    className={styles.searchButton}
                    onClick={() => performHybridSearch(name)}
                    disabled={loading}
                >
                    <Search size={20} />
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div style={{
                    position: 'absolute',
                    top: '-40px',
                    left: '0',
                    background: 'rgba(239, 68, 68, 0.9)',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    backdropFilter: 'blur(4px)'
                }}>
                    {error}
                </div>
            )}

            {/* Results Autocomplete */}
            {showResults && (
                <div style={{ position: 'absolute', top: 'calc(100% + 12px)', left: 0, right: 0, zIndex: 100 }}>
                    <SearchAutocomplete
                        results={results}
                        isLoading={isSearching}
                        onSelect={(char) => {
                            handleResultSelect(char)
                        }}
                        warning={searchWarning}
                        isVisible={showResults}
                        onRefreshSearch={handleRefreshSearch}
                        onDetailsFetched={(updatedChar => {
                            setResults(prev => prev.map(r =>
                                r.characterId === updatedChar.characterId ? updatedChar : r
                            ))
                        })}
                    />
                </div>
            )}

            {/* Recent Search Tags */}
            {recentSearches.length > 0 && !showResults && (
                <div className={styles.recentTags}>
                    {recentSearches.map((recent) => (
                        <div
                            key={recent.characterId}
                            className={styles.recentTag}
                            onClick={() => handleRecentClick(recent)}
                        >
                            <img
                                src={recent.imageUrl || '/placeholder-avatar.svg'}
                                alt={recent.name}
                                className={styles.recentAvatar}
                                onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-avatar.svg' }}
                            />
                            <span className={styles.recentName}>{recent.name}</span>
                            <span
                                className={styles.recentDelete}
                                onClick={(e) => removeRecentSearch(recent.characterId, e)}
                            >
                                <X size={10} />
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
