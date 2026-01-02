'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import SearchAutocomplete from './SearchAutocomplete'
import { supabaseApi, CharacterSearchResult } from '../../lib/supabaseApi'

// Define servers (Reused from page.tsx logic, ideally centralize this)
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

    // Search State
    const [race, setRace] = useState('elyos')
    const [server, setServer] = useState('')
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false) // For main search button submission
    const [error, setError] = useState('')

    // Autocomplete State
    const [showResults, setShowResults] = useState(false)
    const [results, setResults] = useState<CharacterSearchResult[]>([])
    const [isSearching, setIsSearching] = useState(false) // For autocomplete loading indicator

    const wrapperRef = useRef<HTMLDivElement>(null)

    // Debounce Logic
    useEffect(() => {
        const timer = setTimeout(() => {
            if (name.trim().length >= 1) {
                performHybridSearch(name)
            } else {
                setResults([])
                setShowResults(false)
            }
        }, 300) // 300ms debounce

        return () => clearTimeout(timer)
    }, [name, race, server]) // Re-run if any constraint changes, though mainly name

    // Outside Click Handler to close dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowResults(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    // Dynamic Server List
    const currentServerList = race === 'elyos' ? ELYOS_SERVERS : ASMODIAN_SERVERS

    // Auto-select first server when race changes
    useEffect(() => {
        if (server && !currentServerList.includes(server)) {
            setServer(currentServerList[0] || '')
        } else if (!server && currentServerList.length > 0) {
            setServer(currentServerList[0])
        }
    }, [race, server, currentServerList])

    const performHybridSearch = async (searchTerm: string) => {
        setIsSearching(true)
        setShowResults(true)
        setResults([])

        // Helper to update results with deduplication
        const updateResults = (newResults: CharacterSearchResult[]) => {
            setResults(prev => {
                const combined = [...prev]
                const seen = new Set(prev.map(p => `${p.server}_${p.name}`))

                newResults.forEach(r => {
                    const key = `${r.server}_${r.name}`
                    if (!seen.has(key)) {
                        combined.push(r)
                        seen.add(key)
                    }
                })
                return combined
            })
        }

        // Trigger Local Search
        supabaseApi.searchLocalCharacter(searchTerm)
            .then(res => updateResults(res))
            .catch(e => console.error("Local search err", e))

        // Trigger Live Search
        supabaseApi.searchCharacter(searchTerm, undefined, undefined, 1)
            .then(res => updateResults(res))
            .catch(e => console.error("Live search err", e))
            .finally(() => setIsSearching(false)) // Stop spinner when Live finishes (longest)
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (!validateSearch()) return

        executeSearch(server, name, race)
    }

    const validateSearch = () => {
        setError('')
        if (!name.trim()) {
            setError('캐릭터명을 입력해주세요')
            return false
        }
        if (!server) {
            setError('서버를 선택해주세요')
            return false
        }
        return true
    }

    const executeSearch = (srv: string, charName: string, raceVal: string) => {
        setLoading(true)
        const query = raceVal ? `?race=${raceVal}` : ''
        setShowResults(false)
        router.push(`/c/${srv}/${charName}${query}`)
        setLoading(false)
    }

    const handleResultSelect = (char: CharacterSearchResult) => {
        // Populate fields and search
        setServer(char.server)

        // Infer race from character data if possible
        let raceVal = race
        if (char.race === 'Elyos' || char.race === '천족') raceVal = 'elyos'
        if (char.race === 'Asmodian' || char.race === '마족') raceVal = 'asmodian'
        setRace(raceVal)

        setName(char.name)
        executeSearch(char.server, char.name, raceVal)
    }

    return (
        <section ref={wrapperRef} style={{ maxWidth: '750px', margin: '0 auto', position: 'relative' }}>
            {/* Search Form Container */}
            <form
                onSubmit={handleSearch}
                style={{
                    display: 'flex',
                    width: '100%',
                    gap: '0.5rem',
                    background: 'var(--bg-secondary)',
                    backgroundColor: '#1f2937',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    border: '1px solid #374151',
                    position: 'relative',
                    zIndex: 20
                }}
            >
                <select
                    className="input"
                    value={server}
                    onChange={(e) => setServer(e.target.value)}
                    style={{
                        width: '120px',
                        background: 'transparent',
                        color: 'white',
                        border: 'none',
                        borderRight: '1px solid #374151',
                        borderRadius: 0,
                        cursor: 'pointer',
                        outline: 'none',
                        padding: '0.5rem'
                    }}
                >
                    <option value="" style={{ color: 'black' }}>서버 선택</option>
                    {currentServerList.map(s => (
                        <option key={s} value={s} style={{ color: 'black' }}>
                            {s}
                        </option>
                    ))}
                </select>

                <select
                    className="input"
                    value={race}
                    onChange={(e) => setRace(e.target.value)}
                    style={{
                        width: '100px',
                        background: 'transparent',
                        color: 'white',
                        border: 'none',
                        borderRight: '1px solid #374151',
                        borderRadius: 0,
                        cursor: 'pointer',
                        outline: 'none',
                        padding: '0.5rem'
                    }}
                >
                    <option value="" style={{ color: 'black' }}>전체 종족</option>
                    <option value="elyos" style={{ color: 'black' }}>천족</option>
                    <option value="asmodian" style={{ color: 'black' }}>마족</option>
                </select>

                <input
                    type="text"
                    placeholder="캐릭터명을 입력하세요"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onFocus={() => {
                        if (name.length >= 1) setShowResults(true)
                    }}
                    style={{
                        flex: 1,
                        border: 'none',
                        background: 'transparent',
                        fontSize: '1rem',
                        color: 'white',
                        outline: 'none',
                        padding: '0 0.5rem'
                    }}
                />

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        padding: '0 2rem',
                        background: '#eab308', /* Yellow-500 */
                        color: 'black',
                        fontWeight: 'bold',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#ca8a04'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#eab308'}
                >
                    {loading ? '검색 중...' : '검색'}
                </button>
            </form>

            {/* Error Message */}
            {error && (
                <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '6px',
                    color: '#ef4444',
                    fontSize: '0.9rem',
                    textAlign: 'center'
                }}>
                    {error}
                </div>
            )}

            {/* Autocomplete Dropdown */}
            <SearchAutocomplete
                results={results}
                isVisible={showResults}
                isLoading={isSearching}
                onSelect={handleResultSelect}
            />
        </section>
    )
}
