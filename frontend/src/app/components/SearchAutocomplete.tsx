'use client'

import { CharacterSearchResult, supabaseApi } from '../../lib/supabaseApi'
import { Loader2 } from 'lucide-react'
import { useState, useMemo, useEffect, useRef } from 'react'
import Image from 'next/image'

const normalizeName = (value: string) => value.replace(/<\/?[^>]+(>|$)/g, '').trim()

// 숫자 포맷팅 (1000 -> 1,000)
const formatNumber = (num: number | undefined) => {
    if (num === undefined || num === null) return '-'
    return num.toLocaleString()
}

// Avatar Component to handle image errors independently
const CharacterAvatar = ({ char }: { char: CharacterSearchResult }) => {
    const [imgError, setImgError] = useState(false)
    const [isLoaded, setIsLoaded] = useState(false)

    const isElyos = char.race === 'Elyos' || char.race === '천족'

    // Fallback content (First letter of name)
    const fallbackContent = (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#9CA3AF',
            background: '#1f2937'
        }}>
            {char.name.charAt(0)}
        </div>
    )

    return (
        <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            overflow: 'hidden',
            border: `2px solid ${isElyos ? '#3b82f6' : '#ef4444'}`,
            background: '#111318',
            position: 'relative',
            flexShrink: 0
        }}>
            {!imgError && char.imageUrl ? (
                <>
                    <Image
                        src={char.imageUrl}
                        alt={char.name}
                        width={40}
                        height={40}
                        style={{
                            objectFit: 'cover',
                            opacity: isLoaded ? 1 : 0,
                            transition: 'opacity 0.2s'
                        }}
                        onLoad={() => setIsLoaded(true)}
                        onError={() => setImgError(true)}
                        unoptimized={false}
                    />
                    {!isLoaded && fallbackContent}
                </>
            ) : fallbackContent}
        </div>
    )
}

interface SearchAutocompleteProps {
    results: CharacterSearchResult[]
    isVisible: boolean
    isLoading: boolean
    onSelect: (character: CharacterSearchResult) => void
    onDetailsFetched?: (updatedChar: CharacterSearchResult) => void
    warning?: string  // API 경고 메시지
    onRefreshSearch?: () => void  // 외부 재검색 콜백
}

// 동시 조회 제한 (Rate Limit 방지)
const MAX_CONCURRENT_FETCHES = 3

export default function SearchAutocomplete({ results, isVisible, isLoading, onSelect, onDetailsFetched, warning, onRefreshSearch }: SearchAutocompleteProps) {
    // 이미 조회 요청한 characterId 추적
    const fetchedIdsRef = useRef<Set<string>>(new Set())
    // 현재 조회 중인 characterId 추적
    const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())

    // 백그라운드 상세 조회 로직 (noa_score 없는 캐릭터 자동 조회)
    useEffect(() => {
        if (!isVisible || results.length === 0 || !onDetailsFetched) return

        // 상세 조회가 필요한 캐릭터 필터링:
        // - noa_score가 없는 경우 (DB/API 무관하게 모두 조회)
        // - 이미 조회 요청 안 한 경우
        const needsFetch = results.filter(char =>
            char.characterId &&
            char.server_id &&
            !char.noa_score &&  // noa_score가 없는 경우
            !fetchedIdsRef.current.has(char.characterId)
        )

        if (needsFetch.length === 0) return

        let cancelled = false

        const fetchSequentially = async () => {
            // 짧은 대기 후 조회 시작
            await new Promise(resolve => setTimeout(resolve, 500))
            if (cancelled) return

            // 전체 순차 조회 (데이터 축적 목적)
            for (const char of needsFetch) {
                if (cancelled) break
                if (fetchedIdsRef.current.has(char.characterId)) continue

                fetchedIdsRef.current.add(char.characterId)
                setLoadingIds(prev => new Set(prev).add(char.characterId))

                try {
                    const detail = await supabaseApi.fetchCharacterDetailForSearch(char.characterId, char.server_id!)
                    if (cancelled) break
                    if (detail) {
                        onDetailsFetched({
                            ...char,
                            item_level: detail.item_level,
                            job: detail.className || char.job,
                            noa_score: detail.noa_score
                        })
                    }
                } catch (e) {
                    console.error(`[Background Detail] Failed: ${char.name}`, e)
                } finally {
                    setLoadingIds(prev => {
                        const next = new Set(prev)
                        next.delete(char.characterId)
                        return next
                    })
                }
            }
        }

        fetchSequentially()

        return () => {
            cancelled = true
        }
    }, [results, isVisible, onDetailsFetched])

    // 검색 결과가 바뀌면 조회 기록 초기화
    useEffect(() => {
        fetchedIdsRef.current.clear()
    }, [results.length])

    // noa_score 기준 내림차순 정렬
    const sortedResults = useMemo(() => {
        return [...results].sort((a, b) => {
            const scoreA = a.noa_score ?? 0
            const scoreB = b.noa_score ?? 0
            return scoreB - scoreA
        })
    }, [results])

    if (!isVisible && !isLoading) return null
    if (!isVisible && isLoading && results.length === 0) return null

    return (
        <div
            style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '8px',
                background: '#111318',
                border: '1px solid #1f2937',
                borderRadius: '12px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
                zIndex: 99999,
                overflow: 'hidden',
                maxHeight: '400px',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* Header */}
            <div style={{
                padding: '8px 16px',
                fontSize: '11px',
                fontWeight: '600',
                color: '#9ca3af',
                background: '#0f1115',
                borderBottom: '1px solid #1f2937',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span>검색 결과 {sortedResults.length > 0 && `(${sortedResults.length})`}</span>
                {isLoading && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24' }}>
                        <Loader2 className="animate-spin" size={12} />
                        <span>검색 중...</span>
                    </div>
                )}
            </div>

            {/* Warning Message */}
            {warning && (
                <div style={{
                    padding: '6px 16px',
                    fontSize: '11px',
                    color: '#fbbf24',
                    background: 'rgba(251, 191, 36, 0.1)',
                    borderBottom: '1px solid #1f2937',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}>
                    <span>⚠️</span>
                    <span>{warning}</span>
                    {onRefreshSearch && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onRefreshSearch()
                            }}
                            style={{
                                marginLeft: 'auto',
                                padding: '2px 8px',
                                fontSize: '10px',
                                color: '#fbbf24',
                                background: 'rgba(251, 191, 36, 0.2)',
                                border: '1px solid rgba(251, 191, 36, 0.3)',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            재검색
                        </button>
                    )}
                </div>
            )}

            {/* Results Grid - 2열 */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '6px',
                padding: '8px',
                overflowY: 'auto'
            }}>
                {sortedResults.map((char) => {
                    const isElyos = char.race === 'Elyos' || char.race === '천족'

                    return (
                        <div
                            key={char.characterId ? `id:${char.characterId}` : `sv:${char.server}|name:${normalizeName(char.name)}`}
                            onClick={() => onSelect(char)}
                            style={{
                                background: '#1a1d24',
                                border: '1px solid #2a2f3a',
                                borderRadius: '8px',
                                padding: '8px 10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#242830'
                                e.currentTarget.style.borderColor = '#3a3f4a'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#1a1d24'
                                e.currentTarget.style.borderColor = '#2a2f3a'
                            }}
                        >
                            {/* 왼쪽: 프로필 이미지 */}
                            <CharacterAvatar char={char} />

                            {/* 오른쪽: 캐릭터 정보 */}
                            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                {/* 1행: 캐릭터명 + HITON 점수 */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <span
                                        style={{
                                            color: '#fff',
                                            fontWeight: '600',
                                            fontSize: '13px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {char.name.replace(/<\/?[^>]+(>|$)/g, '')}
                                    </span>
                                    {/* PVE/PVP 전투력 표시 */}
                                    {(char.pve_score || char.noa_score) && (
                                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0, fontSize: '11px' }}>
                                            <span style={{ color: '#4ade80', fontWeight: '600' }}>
                                                E {formatNumber(char.pve_score || char.noa_score)}
                                            </span>
                                            {char.pvp_score !== undefined && char.pvp_score > 0 && (
                                                <span style={{ color: '#f87171', fontWeight: '600' }}>
                                                    P {formatNumber(char.pvp_score)}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* 2행: 종족 | 서버 | 아이템레벨 */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    marginTop: '3px',
                                    fontSize: '11px',
                                    color: '#9ca3af'
                                }}>
                                    <span style={{
                                        color: isElyos ? '#60a5fa' : '#f87171',
                                        fontWeight: '500'
                                    }}>
                                        {isElyos ? '천족' : '마족'}
                                    </span>
                                    <span style={{ color: '#4b5563' }}>|</span>
                                    <span>{char.server}</span>
                                    {char.item_level !== undefined && char.item_level > 0 ? (
                                        <>
                                            <span style={{ color: '#4b5563' }}>|</span>
                                            <span style={{ color: '#a78bfa' }}>
                                                IL.{char.item_level}
                                            </span>
                                        </>
                                    ) : loadingIds.has(char.characterId) && (
                                        <Loader2 className="animate-spin" size={10} style={{ color: '#6b7280', marginLeft: '4px' }} />
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}

                {sortedResults.length === 0 && !isLoading && (
                    <div style={{
                        gridColumn: '1 / -1',
                        padding: '24px',
                        textAlign: 'center',
                        color: '#6b7280',
                        fontSize: '13px'
                    }}>
                        <div>검색 결과가 없습니다.</div>
                        {onRefreshSearch && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onRefreshSearch()
                                }}
                                style={{
                                    marginTop: '12px',
                                    padding: '8px 16px',
                                    fontSize: '12px',
                                    color: '#fbbf24',
                                    background: 'rgba(251, 191, 36, 0.15)',
                                    border: '1px solid rgba(251, 191, 36, 0.3)',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                            >
                                외부에서 재검색
                            </button>
                        )}
                    </div>
                )}
            </div>

        </div>
    )
}
