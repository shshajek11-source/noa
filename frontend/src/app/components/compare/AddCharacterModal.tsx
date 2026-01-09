'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Search, Loader2, Users } from 'lucide-react'
import { supabaseApi, CharacterSearchResult } from '@/lib/supabaseApi'

interface AddCharacterModalProps {
    onClose: () => void
    onSelect: (character: CharacterSearchResult) => void
    slot: 'A' | 'B'
}

type RaceFilter = 'all' | 'elyos' | 'asmodian'

export default function AddCharacterModal({ onClose, onSelect, slot }: AddCharacterModalProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [raceFilter, setRaceFilter] = useState<RaceFilter>('all')
    const [results, setResults] = useState<CharacterSearchResult[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    // 자동 포커스
    useEffect(() => {
        inputRef.current?.focus()
    }, [])

    // ESC 키로 닫기
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [onClose])

    // 검색 디바운스
    useEffect(() => {
        if (searchTerm.trim().length < 1) {
            setResults([])
            return
        }

        const timer = setTimeout(() => {
            performSearch(searchTerm)
        }, 300)

        return () => clearTimeout(timer)
    }, [searchTerm, raceFilter])

    const performSearch = async (term: string) => {
        setIsSearching(true)
        try {
            // 종족 필터 문자열: 'elyos' 또는 'asmodian'
            const raceStr = raceFilter === 'all' ? undefined : raceFilter

            const [localRes, liveRes] = await Promise.allSettled([
                supabaseApi.searchLocalCharacter(term, undefined, raceStr),
                supabaseApi.searchCharacter(term, undefined, raceStr, 1)
            ])

            const combined: CharacterSearchResult[] = []
            const seen = new Set<string>()

            const addResult = (res: CharacterSearchResult[]) => {
                res.forEach(r => {
                    // 종족 필터 적용 (로컬 결과에도)
                    if (raceFilter !== 'all') {
                        const isElyos = r.race === 'Elyos' || r.race === '천족'
                        if (raceFilter === 'elyos' && !isElyos) return
                        if (raceFilter === 'asmodian' && isElyos) return
                    }

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
            console.error('Search error', e)
        } finally {
            setIsSearching(false)
        }
    }

    const getRaceColor = (race?: string) => {
        if (race === 'Elyos' || race === '천족') return '#4BC0C0'
        if (race === 'Asmodian' || race === '마족') return '#FF6384'
        return '#9CA3AF'
    }

    const getRaceLabel = (race?: string) => {
        if (race === 'Elyos' || race === '천족') return '천족'
        if (race === 'Asmodian' || race === '마족') return '마족'
        return race || ''
    }

    return (
        <div
            style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.8)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000,
                padding: '1rem'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: '#1a1d24',
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '500px',
                    maxHeight: '80vh',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* 헤더 */}
                <div style={{
                    padding: '1.25rem 1.5rem',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Users size={20} style={{ color: '#FACC15' }} />
                        <span style={{ color: '#fff', fontWeight: 600, fontSize: '1.1rem' }}>
                            캐릭터 {slot === 'A' ? '1' : '2'} 선택
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#9CA3AF',
                            cursor: 'pointer',
                            padding: '4px'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* 종족 필터 */}
                <div style={{
                    padding: '1rem 1.5rem',
                    display: 'flex',
                    gap: '0.5rem',
                    borderBottom: '1px solid rgba(255,255,255,0.05)'
                }}>
                    {[
                        { value: 'all', label: '전체', color: '#9CA3AF' },
                        { value: 'elyos', label: '천족', color: '#4BC0C0' },
                        { value: 'asmodian', label: '마족', color: '#FF6384' }
                    ].map(option => (
                        <button
                            key={option.value}
                            onClick={() => setRaceFilter(option.value as RaceFilter)}
                            style={{
                                flex: 1,
                                padding: '0.6rem 1rem',
                                border: raceFilter === option.value
                                    ? `2px solid ${option.color}`
                                    : '2px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                background: raceFilter === option.value
                                    ? `${option.color}20`
                                    : 'transparent',
                                color: raceFilter === option.value ? option.color : '#9CA3AF',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                transition: 'all 0.2s'
                            }}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                {/* 검색 입력 */}
                <div style={{ padding: '1rem 1.5rem' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '10px',
                        padding: '0.75rem 1rem',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <Search size={18} style={{ color: '#6B7280', marginRight: '0.75rem' }} />
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="캐릭터명을 입력하세요..."
                            style={{
                                flex: 1,
                                background: 'transparent',
                                border: 'none',
                                color: '#fff',
                                fontSize: '1rem',
                                outline: 'none'
                            }}
                        />
                        {isSearching && <Loader2 size={18} className="animate-spin" style={{ color: '#FACC15' }} />}
                    </div>
                </div>

                {/* 검색 결과 */}
                <div style={{
                    maxHeight: '350px',
                    overflowY: 'auto',
                    padding: '0 1rem 1rem'
                }}>
                    {results.length === 0 && searchTerm && !isSearching && (
                        <div style={{
                            textAlign: 'center',
                            padding: '2rem',
                            color: '#6B7280'
                        }}>
                            검색 결과가 없습니다
                        </div>
                    )}

                    {results.length === 0 && !searchTerm && (
                        <div style={{
                            textAlign: 'center',
                            padding: '2rem',
                            color: '#6B7280'
                        }}>
                            캐릭터명을 검색해주세요
                        </div>
                    )}

                    {results.map((char, idx) => (
                        <div
                            key={char.characterId || `${char.server}-${char.name}-${idx}`}
                            onClick={() => onSelect(char)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                padding: '0.75rem 1rem',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                marginBottom: '0.5rem',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid transparent',
                                transition: 'all 0.15s'
                            }}
                            className="hover:bg-white/10 hover:border-white/20"
                        >
                            {/* 프로필 이미지 */}
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '10px',
                                overflow: 'hidden',
                                border: `2px solid ${getRaceColor(char.race)}`,
                                flexShrink: 0,
                                background: '#111'
                            }}>
                                {(char.imageUrl || char.profileImage) ? (
                                    <img
                                        src={char.imageUrl || char.profileImage}
                                        alt={char.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                    />
                                ) : (
                                    <div style={{
                                        width: '100%',
                                        height: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.25rem',
                                        color: '#6B7280'
                                    }}>
                                        {char.name?.[0] || '?'}
                                    </div>
                                )}
                            </div>

                            {/* 캐릭터 정보 */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    marginBottom: '0.25rem'
                                }}>
                                    <span style={{
                                        color: '#fff',
                                        fontWeight: 600,
                                        fontSize: '1rem',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {char.name}
                                    </span>
                                    <span style={{
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        background: `${getRaceColor(char.race)}30`,
                                        color: getRaceColor(char.race)
                                    }}>
                                        {getRaceLabel(char.race)}
                                    </span>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontSize: '0.8rem',
                                    color: '#9CA3AF'
                                }}>
                                    <span>Lv.{char.level || '?'}</span>
                                    <span>·</span>
                                    <span>{char.job || char.className || '직업 미상'}</span>
                                    <span>·</span>
                                    <span>{char.server}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
