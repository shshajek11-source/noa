'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Search, ChevronDown } from 'lucide-react'
import { supabaseApi, CharacterSearchResult, SERVER_NAME_TO_ID } from '../../lib/supabaseApi'
import { MainCharacter, MAIN_CHARACTER_KEY } from './SearchBar'

interface MainCharacterModalProps {
    isOpen: boolean
    onClose: () => void
}

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

export default function MainCharacterModal({ isOpen, onClose }: MainCharacterModalProps) {
    const [race, setRace] = useState<'elyos' | 'asmodian'>('elyos')
    const [server, setServer] = useState('')
    const [name, setName] = useState('')
    const [isServerDropdownOpen, setIsServerDropdownOpen] = useState(false)
    const [isSearching, setIsSearching] = useState(false)
    const [results, setResults] = useState<CharacterSearchResult[]>([])
    const [showResults, setShowResults] = useState(false)

    const modalRef = useRef<HTMLDivElement>(null)
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const servers = race === 'elyos' ? ELYOS_SERVERS : ASMODIAN_SERVERS

    // 모달 외부 클릭 시 닫기
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen, onClose])

    // ESC 키로 닫기
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }

        if (isOpen) {
            document.addEventListener('keydown', handleEsc)
        }

        return () => {
            document.removeEventListener('keydown', handleEsc)
        }
    }, [isOpen, onClose])

    // 종족 변경 시 서버 초기화
    useEffect(() => {
        setServer('')
    }, [race])

    // 검색
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current)
        }

        if (name.trim().length < 1) {
            setResults([])
            setShowResults(false)
            return
        }

        searchTimeoutRef.current = setTimeout(async () => {
            setIsSearching(true)
            try {
                const serverId = server ? SERVER_NAME_TO_ID[server] : undefined
                const raceFilter = race === 'elyos' ? 'elyos' : 'asmodian'

                // 로컬 DB 검색 (서버 및 종족 필터 적용)
                const localResults = await supabaseApi.searchLocalCharacter(name.trim(), serverId, raceFilter)

                // 라이브 API 검색 (서버 및 종족 필터 적용)
                const liveResults = await supabaseApi.searchCharacter(name.trim(), serverId, raceFilter, 1)

                // 병합 및 중복 제거
                const allResults = [...localResults]
                const existingIds = new Set(localResults.map(r => r.characterId))

                for (const result of liveResults) {
                    if (!existingIds.has(result.characterId)) {
                        allResults.push(result)
                    }
                }

                // 서버 필터링 (선택된 경우)
                const filteredResults = serverId
                    ? allResults.filter(r => r.server_id === serverId || r.server === server)
                    : allResults

                // noa_score 기준 정렬
                filteredResults.sort((a, b) => (b.noa_score ?? 0) - (a.noa_score ?? 0))

                setResults(filteredResults.slice(0, 5))
                setShowResults(true)
            } catch (e) {
                console.error('Search failed', e)
            } finally {
                setIsSearching(false)
            }
        }, 300)

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current)
            }
        }
    }, [name, server, race])

    // 캐릭터 선택
    const handleSelect = async (char: CharacterSearchResult) => {
        let hitScore = char.noa_score
        let itemLevel = char.item_level

        if (!hitScore && char.characterId) {
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/characters?character_id=eq.${encodeURIComponent(char.characterId)}&select=noa_score,item_level`,
                    {
                        headers: {
                            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
                            'Content-Type': 'application/json'
                        }
                    }
                )
                if (res.ok) {
                    const dbData = await res.json()
                    if (dbData && dbData.length > 0) {
                        hitScore = dbData[0].noa_score
                        if (!itemLevel) itemLevel = dbData[0].item_level
                    }
                }
            } catch (e) {
                console.error('Failed to fetch hit_score', e)
            }
        }

        const mainChar: MainCharacter = {
            characterId: char.characterId,
            name: char.name.replace(/<\/?[^>]+(>|$)/g, ''),
            server: char.server,
            server_id: char.server_id,
            race: char.race,
            className: char.job || char.className,
            level: char.level,
            hit_score: hitScore,
            item_level: itemLevel,
            imageUrl: char.imageUrl || char.profileImage,
            setAt: Date.now()
        }

        try {
            localStorage.setItem(MAIN_CHARACTER_KEY, JSON.stringify(mainChar))
            window.dispatchEvent(new Event('mainCharacterChanged'))
            onClose()
        } catch (e) {
            console.error('Failed to set main character', e)
            alert('대표 캐릭터 설정에 실패했습니다.')
        }
    }

    if (!isOpen) return null

    return (
        <div
            ref={modalRef}
            style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                right: 0,
                width: '300px',
                background: 'var(--bg-secondary, #1f2937)',
                borderRadius: '12px',
                padding: '1rem',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
                border: '1px solid var(--border, #374151)',
                zIndex: 99999
            }}
        >
            {/* 말풍선 화살표 */}
            <div style={{
                position: 'absolute',
                top: '-8px',
                right: '24px',
                width: '14px',
                height: '14px',
                background: 'var(--bg-secondary, #1f2937)',
                border: '1px solid var(--border, #374151)',
                borderRight: 'none',
                borderBottom: 'none',
                transform: 'rotate(45deg)'
            }} />

            {/* 헤더 */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem'
            }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FACC15' }}>
                    대표 캐릭터 설정
                </span>
                <button
                    onClick={onClose}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        color: 'var(--text-secondary)'
                    }}
                >
                    <X size={16} />
                </button>
            </div>

            {/* 종족 선택 */}
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <button
                    onClick={() => setRace('elyos')}
                    style={{
                        flex: 1,
                        padding: '0.4rem',
                        borderRadius: '6px',
                        border: race === 'elyos' ? '1px solid #FACC15' : '1px solid var(--border)',
                        background: race === 'elyos' ? 'rgba(250, 204, 21, 0.15)' : 'transparent',
                        color: race === 'elyos' ? '#FACC15' : 'var(--text-secondary)',
                        fontWeight: race === 'elyos' ? 600 : 400,
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                    }}
                >
                    천족
                </button>
                <button
                    onClick={() => setRace('asmodian')}
                    style={{
                        flex: 1,
                        padding: '0.4rem',
                        borderRadius: '6px',
                        border: race === 'asmodian' ? '1px solid #FACC15' : '1px solid var(--border)',
                        background: race === 'asmodian' ? 'rgba(250, 204, 21, 0.15)' : 'transparent',
                        color: race === 'asmodian' ? '#FACC15' : 'var(--text-secondary)',
                        fontWeight: race === 'asmodian' ? 600 : 400,
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                    }}
                >
                    마족
                </button>
            </div>

            {/* 서버 선택 */}
            <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                <button
                    onClick={() => setIsServerDropdownOpen(!isServerDropdownOpen)}
                    style={{
                        width: '100%',
                        padding: '0.4rem 0.6rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-hover, #111827)',
                        color: server ? 'var(--text-main)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.75rem'
                    }}
                >
                    {server || '전체 서버'}
                    <ChevronDown size={14} style={{
                        transform: isServerDropdownOpen ? 'rotate(180deg)' : 'rotate(0)',
                        transition: 'transform 0.2s'
                    }} />
                </button>

                {isServerDropdownOpen && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        marginTop: '4px',
                        maxHeight: '120px',
                        overflowY: 'auto',
                        zIndex: 10
                    }}>
                        <div
                            onClick={() => { setServer(''); setIsServerDropdownOpen(false) }}
                            style={{
                                padding: '0.35rem 0.6rem',
                                cursor: 'pointer',
                                background: !server ? 'rgba(250, 204, 21, 0.1)' : 'transparent',
                                color: !server ? '#FACC15' : 'var(--text-main)',
                                fontSize: '0.7rem'
                            }}
                        >
                            전체 서버
                        </div>
                        {servers.map(s => (
                            <div
                                key={s}
                                onClick={() => { setServer(s); setIsServerDropdownOpen(false) }}
                                style={{
                                    padding: '0.35rem 0.6rem',
                                    cursor: 'pointer',
                                    background: server === s ? 'rgba(250, 204, 21, 0.1)' : 'transparent',
                                    color: server === s ? '#FACC15' : 'var(--text-main)',
                                    fontSize: '0.7rem'
                                }}
                                onMouseEnter={(e) => { if (server !== s) e.currentTarget.style.background = 'var(--bg-hover)' }}
                                onMouseLeave={(e) => { if (server !== s) e.currentTarget.style.background = 'transparent' }}
                            >
                                {s}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 캐릭터명 입력 */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--bg-hover, #111827)',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                padding: '0 0.5rem',
                marginBottom: '0.5rem'
            }}>
                <Search size={14} style={{ color: 'var(--text-secondary)' }} />
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="캐릭터명"
                    style={{
                        flex: 1,
                        padding: '0.4rem',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text-main)',
                        fontSize: '0.75rem',
                        outline: 'none'
                    }}
                />
                {isSearching && (
                    <div style={{
                        width: '12px',
                        height: '12px',
                        border: '2px solid var(--text-secondary)',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }} />
                )}
            </div>

            {/* 검색 결과 */}
            {showResults && results.length > 0 && (
                <div style={{
                    maxHeight: '150px',
                    overflowY: 'auto',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    background: 'var(--bg-main, #0B0D12)'
                }}>
                    {results.map((char) => (
                        <div
                            key={char.characterId}
                            onClick={() => handleSelect(char)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem',
                                cursor: 'pointer',
                                borderBottom: '1px solid var(--border)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                overflow: 'hidden',
                                background: '#374151',
                                flexShrink: 0
                            }}>
                                {char.imageUrl ? (
                                    <img src={char.imageUrl} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#9ca3af' }}>
                                        {char.name.replace(/<\/?[^>]+(>|$)/g, '').charAt(0)}
                                    </div>
                                )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                    {char.name.replace(/<\/?[^>]+(>|$)/g, '')}
                                </div>
                                <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
                                    {char.server} · {char.job || char.className}
                                </div>
                            </div>
                            {char.noa_score && char.noa_score > 0 && (
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--brand-red-main, #D92B4B)' }}>
                                    {char.noa_score.toLocaleString()}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* 검색 결과 없음 */}
            {showResults && results.length === 0 && name.trim().length >= 1 && !isSearching && (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.7rem' }}>
                    검색 결과가 없습니다
                </div>
            )}

            {/* 안내 문구 */}
            {!showResults && (
                <div style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.7rem' }}>
                    캐릭터명을 입력해주세요
                </div>
            )}

            <style jsx>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    )
}
