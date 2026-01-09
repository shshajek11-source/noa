'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronDown, X, Star } from 'lucide-react'
import SearchAutocomplete from './SearchAutocomplete'
import { supabaseApi, CharacterSearchResult, SERVER_NAME_TO_ID } from '../../lib/supabaseApi'
import { useSyncContext } from '../../context/SyncContext'

// 최근 검색 캐릭터 타입
interface RecentSearch {
    characterId: string
    name: string
    server: string
    server_id?: number
    race: string
    noa_score?: number
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
    hit_score?: number
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
            noa_score: char.noa_score,
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
        }, 300)
        return () => clearTimeout(timer)
    }, [name, race, server])

    // Outside Click Handler
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowResults(false)
                // Don't close server dropdown here if user clicked inside it
            }
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
                wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    // Dynamic Server List based on Race
    const currentServerList = race === 'elyos' ? ELYOS_SERVERS : ASMODIAN_SERVERS

    const effectiveRace = server ? race : undefined

    // Auto-select first server logic (Optional: Can keep empty to force selection)
    // Removed auto-select to let user choose explicitly or default to empty

    const performHybridSearch = async (searchTerm: string) => {
        setIsSearching(true)
        setShowResults(true)
        setIsDropdownOpen(false) // 검색 결과창 열면 서버 드롭다운 닫기
        setResults([])

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
                    if (serverId && r.server_id !== serverId) return false
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

        supabaseApi.searchLocalCharacter(searchTerm, serverId, raceFilter)
            .then(res => updateResults(res))
            .catch(e => console.error("Local search err", e))

        supabaseApi.searchCharacter(searchTerm, serverId, raceFilter, 1)
            .then(res => {
                updateResults(res)
            })
            .catch(e => console.error("Live search err", e))
            .finally(() => setIsSearching(false))
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
            const searchResults = await supabaseApi.searchCharacter(name, undefined, effectiveRace, 1)

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
        <div
            ref={wrapperRef}
            style={{
                width: '100%',
                maxWidth: '800px',
                margin: '0 auto',
                position: 'relative',
                zIndex: (isDropdownOpen || showResults) ? 9999 : 100
            }}
        >
            <form
                onSubmit={handleSearch}
                style={{
                    position: 'relative',
                    zIndex: 10
                }}
            >
                {/* Gradient Border Container (From DSSearchBar) */}
                <div
                    style={{
                        padding: '2px',
                        borderRadius: '50px',
                        background: (name.length > 0) // Simplified focus check
                            ? 'linear-gradient(90deg, var(--brand-red-main), #F59E0B, var(--brand-red-main))'
                            : 'var(--border)',
                        backgroundSize: '200% 100%',
                        transition: 'all 0.3s ease',
                        animation: (name.length > 0) ? 'gradientMove 3s linear infinite' : 'none'
                    }}
                >
                    {/* Inner Input Container */}
                    <div style={{
                        background: '#0B0D12',
                        borderRadius: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0.2rem',
                        position: 'relative',
                        height: '50px'
                    }}>

                        {/* Server Select Button */}
                        <div style={{ position: 'relative' }} ref={dropdownRef}>
                            <button
                                type="button"
                                onClick={toggleDropdown}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-main)',
                                    padding: '0 1rem 0 1.5rem',
                                    height: '100%',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {triggerText}
                                <ChevronDown size={14} style={{ opacity: 0.7, transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                            </button>

                            {/* Dropdown Menu (Existing Logic Adapted) */}
                            {isDropdownOpen && (
                                <div style={{
                                    position: 'absolute',
                                    top: '120%',
                                    left: '0.5rem',
                                    minWidth: '180px',
                                    background: '#1F2937',
                                    border: '1px solid var(--border-light)',
                                    borderRadius: '8px',
                                    padding: '0.5rem',
                                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.5rem',
                                    zIndex: 99999
                                }}>
                                    {/* Race Toggle Actions */}
                                    <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                                        <button
                                            type="button"
                                            onClick={() => selectRace('elyos')}
                                            style={{
                                                flex: 1,
                                                padding: '6px',
                                                fontSize: '0.75rem',
                                                borderRadius: '4px',
                                                border: race === 'elyos' ? '1px solid #10B981' : '1px solid var(--border)',
                                                color: race === 'elyos' ? '#10B981' : 'var(--text-secondary)',
                                                background: race === 'elyos' ? 'rgba(16,185,129,0.1)' : 'transparent',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            천족
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => selectRace('asmodian')}
                                            style={{
                                                flex: 1,
                                                padding: '6px',
                                                fontSize: '0.75rem',
                                                borderRadius: '4px',
                                                border: race === 'asmodian' ? '1px solid #EF4444' : '1px solid var(--border)',
                                                color: race === 'asmodian' ? '#EF4444' : 'var(--text-secondary)',
                                                background: race === 'asmodian' ? 'rgba(239,68,68,0.1)' : 'transparent',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            마족
                                        </button>
                                    </div>

                                    {/* Server List */}
                                    <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        {currentServerList.map(srv => (
                                            <button
                                                key={srv}
                                                type="button"
                                                onClick={() => selectServer(srv)}
                                                style={{
                                                    padding: '6px 10px',
                                                    textAlign: 'left',
                                                    background: server === srv ? 'rgba(255,255,255,0.05)' : 'transparent',
                                                    color: server === srv ? 'white' : 'var(--text-secondary)',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    borderRadius: '4px',
                                                    fontSize: '0.85rem'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                onMouseLeave={(e) => { if (server !== srv) e.currentTarget.style.background = 'transparent' }}
                                            >
                                                {srv}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Divider */}
                        <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 0.5rem' }}></div>

                        {/* Input Field */}
                        <input
                            type="text"
                            placeholder="캐릭터명을 입력하세요"
                            value={name}
                            onChange={(e) => {
                                suppressResultsRef.current = false
                                setName(e.target.value)
                            }}
                            onFocus={() => {
                                setIsDropdownOpen(false) // 입력창 포커스 시 서버 드롭다운 닫기
                                if (!suppressResultsRef.current && name.length >= 1) setShowResults(true)
                            }}
                            style={{
                                flex: 1,
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-main)',
                                fontSize: '1rem',
                                outline: 'none',
                                padding: '0 0.5rem'
                            }}
                        />

                        {/* Search Button (Icon Only) */}
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                background: 'var(--brand-red-main)',
                                border: 'none',
                                borderRadius: '50%',
                                color: 'white',
                                width: '42px',
                                height: '42px',
                                margin: '4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'transform 0.1s, background 0.2s',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--brand-red-dark)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--brand-red-main)'}
                            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <Search size={20} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>

                {/* Global Styles for Gradient Animation */}
                <style jsx global>{`
                    @keyframes gradientMove {
                        0% { background-position: 0% 50%; }
                        50% { background-position: 100% 50%; }
                        100% { background-position: 0% 50%; }
                    }
                `}</style>
            </form>

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

            {/* Integrated Dropdown Panel is now above inside the input container */}

            {/* Autocomplete Dropdown */}
            <SearchAutocomplete
                results={results}
                isVisible={showResults}
                isLoading={isSearching}
                onSelect={handleResultSelect}
            />

            {/* 최근 검색 캐릭터 - 검색창이 비어있고 드롭다운이 닫혀있을 때만 표시 */}
            {!showResults && !isDropdownOpen && recentSearches.length > 0 && name.trim().length === 0 && (
                <div style={{
                    marginTop: '0.5rem',
                    display: 'grid',
                    gridTemplateColumns: `repeat(${Math.min(recentSearches.length, 5)}, 1fr)`,
                    gap: '0.4rem',
                    width: '100%',
                    maxWidth: '800px'
                }}>
                    {recentSearches.map((recent) => (
                        <div
                            key={recent.characterId}
                            onClick={() => handleRecentClick(recent)}
                            style={{
                                position: 'relative',
                                background: 'rgba(31, 41, 55, 0.9)',
                                borderRadius: '8px',
                                padding: '0.35rem 0.5rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: '0.4rem',
                                transform: 'translateY(0)',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)'
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)'
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)'
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)'
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                            }}
                        >
                            {/* 프로필 이미지 */}
                            <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                overflow: 'hidden',
                                flexShrink: 0,
                                background: '#374151'
                            }}>
                                {recent.imageUrl ? (
                                    <img
                                        src={recent.imageUrl}
                                        alt={recent.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <div style={{
                                        width: '100%',
                                        height: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.7rem',
                                        color: '#9ca3af'
                                    }}>
                                        {recent.name.charAt(0)}
                                    </div>
                                )}
                            </div>

                            {/* 캐릭터 정보 */}
                            <div style={{
                                flex: 1,
                                minWidth: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0'
                            }}>
                                <span style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    color: '#f3f4f6',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    lineHeight: 1.2
                                }}>
                                    {recent.name}
                                </span>
                                <span style={{
                                    fontSize: '0.55rem',
                                    color: '#9ca3af',
                                    lineHeight: 1.2
                                }}>
                                    {recent.server}
                                    {(recent.noa_score || recent.item_level) && ' · '}
                                    {recent.item_level ? `IL ${recent.item_level}` : ''}
                                    {recent.item_level && recent.noa_score ? ' · ' : ''}
                                    {recent.noa_score ? (
                                        <span style={{ color: 'var(--brand-red-main, #D92B4B)', fontWeight: 600 }}>
                                            {recent.noa_score.toLocaleString()}
                                        </span>
                                    ) : ''}
                                </span>
                            </div>

                            {/* X 버튼 */}
                            <button
                                onClick={(e) => removeRecentSearch(recent.characterId, e)}
                                style={{
                                    width: '14px',
                                    height: '14px',
                                    borderRadius: '50%',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 0,
                                    transition: 'all 0.15s ease',
                                    opacity: 0.4,
                                    flexShrink: 0
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.8)'
                                    e.currentTarget.style.opacity = '1'
                                    const svg = e.currentTarget.querySelector('svg')
                                    if (svg) (svg as SVGElement).style.color = 'white'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent'
                                    e.currentTarget.style.opacity = '0.4'
                                    const svg = e.currentTarget.querySelector('svg')
                                    if (svg) (svg as SVGElement).style.color = '#6b7280'
                                }}
                            >
                                <X size={10} style={{ color: '#6b7280' }} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
