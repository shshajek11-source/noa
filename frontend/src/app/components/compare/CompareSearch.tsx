'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Loader2 } from 'lucide-react'
import SearchAutocomplete from '../SearchAutocomplete'
import { supabaseApi, CharacterSearchResult } from '../../../lib/supabaseApi'

interface CompareSearchProps {
    onSelect: (character: CharacterSearchResult) => void
    placeholder?: string
}

export default function CompareSearch({ onSelect, placeholder = "캐릭터 검색..." }: CompareSearchProps) {
    const [name, setName] = useState('')
    const [results, setResults] = useState<CharacterSearchResult[]>([])
    const [showResults, setShowResults] = useState(false)
    const [isSearching, setIsSearching] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)

    // Debounce Logic
    useEffect(() => {
        const timer = setTimeout(() => {
            if (name.trim().length >= 1) {
                performSearch(name)
            } else {
                setResults([])
                setShowResults(false)
            }
        }, 300)
        return () => clearTimeout(timer)
    }, [name])

    // Outside Click Handler
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowResults(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const performSearch = async (searchTerm: string) => {
        setIsSearching(true)
        setShowResults(true)
        setResults([])

        try {
            // Search locally and live
            const [localRes, liveRes] = await Promise.allSettled([
                supabaseApi.searchLocalCharacter(searchTerm),
                supabaseApi.searchCharacter(searchTerm, undefined, undefined, 1)
            ])

            const combined: CharacterSearchResult[] = []
            const seen = new Set<string>()

            const addResult = (res: CharacterSearchResult[]) => {
                res.forEach(r => {
                    const key = r.characterId || `${r.server}-${r.name}`
                    if (!seen.has(key)) {
                        seen.add(key)
                        combined.push(r)
                    }
                })
            }

            if (localRes.status === 'fulfilled') addResult(localRes.value)
            if (liveRes.status === 'fulfilled') addResult(liveRes.value)

            setResults(combined)
        } catch (e) {
            console.error("Search error", e)
        } finally {
            setIsSearching(false)
        }
    }

    const handleSelect = (char: CharacterSearchResult) => {
        setName('')
        setResults([])
        setShowResults(false)
        onSelect(char)
    }

    return (
        <div ref={wrapperRef} style={{ position: 'relative', width: '100%', zIndex: showResults ? 99999 : 60 }}>
            {/* Input Container with Glassmorphism */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(17, 24, 39, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '0.4rem 1rem',
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(8px)',
                boxShadow: isSearching || showResults ? '0 0 0 2px rgba(59, 130, 246, 0.5)' : 'none'
            }}>
                <Search size={18} style={{ color: '#9CA3AF', marginRight: '0.75rem' }} />
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onFocus={() => { if (name.length >= 1) setShowResults(true) }}
                    placeholder={placeholder}
                    style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        color: 'white',
                        fontSize: '0.95rem',
                        outline: 'none',
                    }}
                />
                {isSearching && <Loader2 size={16} className="animate-spin" style={{ color: '#3B82F6', marginLeft: '0.75rem' }} />}
            </div>

            {/* Reuse SearchAutocomplete but styled/positioned for this context is tricky because SearchAutocomplete has fixed styles. 
                However, SearchAutocomplete accepts results and onSelect.
                Let's use it but we might need to override some position styles if it's too rigid. 
                Looking at SearchAutocomplete code: it has absolute positioning 'top: 100%'. 
                It should work fine here as long as the parent has 'relative'.
            */}
            <SearchAutocomplete
                results={results}
                isVisible={showResults}
                isLoading={isSearching}
                onSelect={handleSelect}
            />
        </div>
    )
}
