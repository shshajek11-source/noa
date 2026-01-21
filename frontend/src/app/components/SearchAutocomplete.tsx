'use client'

import { CharacterSearchResult, supabaseApi } from '../../lib/supabaseApi'
import { Loader2 } from 'lucide-react'
import { useState, useMemo, useEffect, useRef } from 'react'
import Image from 'next/image'
import styles from './SearchAutocomplete.module.css'

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
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#9CA3AF',
            background: '#1f2937'
        }}>
            {char.name.charAt(0)}
        </div>
    )

    return (
        <div className={`${styles.avatarContainer} ${isElyos ? styles.elyosBorder : styles.asmodianBorder}`}>
            {!imgError && char.imageUrl ? (
                <>
                    <Image
                        src={char.imageUrl}
                        alt={char.name}
                        width={44}
                        height={44}
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

export default function SearchAutocomplete({ results, isVisible, isLoading, onSelect, onDetailsFetched, warning, onRefreshSearch }: SearchAutocompleteProps) {
    const fetchedIdsRef = useRef<Set<string>>(new Set())
    const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
    const [selectedRace, setSelectedRace] = useState<'all' | 'Elyos' | 'Asmodian'>('all')

    // 디버그 로그
    const [debugLogs, setDebugLogs] = useState<string[]>([])
    const [showDebug, setShowDebug] = useState(false)
    const addDebugLog = (msg: string) => {
        const timestamp = new Date().toLocaleTimeString()
        setDebugLogs(prev => [...prev.slice(-50), `[${timestamp}] ${msg}`])
    }
    const copyDebugLogs = () => {
        const text = debugLogs.join('\n')
        navigator.clipboard.writeText(text)
        alert('디버그 로그가 복사되었습니다!')
    }

    // 백그라운드 상세 조회 로직
    useEffect(() => {
        if (!isVisible || results.length === 0 || !onDetailsFetched) return

        const needsFetch = results.filter(char => {
            const hasCharId = !!char.characterId
            const hasServerId = !!(char.server_id || char.serverId)
            const hasPveScore = !!char.pve_score
            const alreadyFetched = fetchedIdsRef.current.has(char.characterId)
            return hasCharId && hasServerId && !hasPveScore && !alreadyFetched
        })

        if (needsFetch.length === 0) return

        let cancelled = false

        const fetchParallel = async () => {
            await new Promise(resolve => setTimeout(resolve, 50))
            if (cancelled) return

            const BATCH_SIZE = 5
            for (let i = 0; i < needsFetch.length; i += BATCH_SIZE) {
                if (cancelled) break

                const batch = needsFetch.slice(i, i + BATCH_SIZE).filter(
                    char => !fetchedIdsRef.current.has(char.characterId)
                )

                if (batch.length === 0) continue

                batch.forEach(char => {
                    fetchedIdsRef.current.add(char.characterId)
                    setLoadingIds(prev => new Set(prev).add(char.characterId))
                })

                const fetchResults = await Promise.allSettled(
                    batch.map(async (char) => {
                        const serverId = char.server_id || char.serverId!
                        try {
                            const detail = await supabaseApi.fetchCharacterDetailForSearch(char.characterId, serverId)
                            return { char, detail, error: null }
                        } catch (e: any) {
                            return { char, detail: null, error: e }
                        }
                    })
                )

                for (const result of fetchResults) {
                    if (cancelled) break
                    if (result.status === 'fulfilled') {
                        const { char, detail, error } = result.value
                        if (error) {
                            addDebugLog(`ERROR: ${char.name} → ${error.message || error}`)
                        } else if (detail) {
                            onDetailsFetched({
                                ...char,
                                item_level: detail.item_level,
                                job: detail.className || char.job,
                                pve_score: detail.pve_score,
                                pvp_score: detail.pvp_score
                            })
                        }
                        setLoadingIds(prev => {
                            const next = new Set(prev)
                            next.delete(char.characterId)
                            return next
                        })
                    }
                }
            }
        }

        fetchParallel()

        return () => {
            cancelled = true
        }
    }, [results, isVisible, onDetailsFetched])

    const resultsKey = results.length > 0 ? `${results[0]?.characterId}-${results.length}` : ''
    useEffect(() => {
        fetchedIdsRef.current.clear()
        setDebugLogs([])
    }, [resultsKey])

    const filteredAndSortedResults = useMemo(() => {
        let list = [...results]
        if (selectedRace !== 'all') {
            list = list.filter(char => {
                const charRace = char.race === 'Elyos' || char.race === '천족' ? 'Elyos' : 'Asmodian'
                return charRace === selectedRace
            })
        }
        return list.sort((a, b) => (b.pve_score ?? 0) - (a.pve_score ?? 0))
    }, [results, selectedRace])

    if (!isVisible && !isLoading) return null
    if (!isVisible && isLoading && results.length === 0) return null

    return (
        <div className={styles.container}>
            {/* Header: 필터 탭 */}
            <div className={styles.header}>
                <div className={styles.raceFilters}>
                    {(['all', 'Elyos', 'Asmodian'] as const).map((race) => (
                        <button
                            key={race}
                            onClick={(e) => {
                                e.stopPropagation()
                                setSelectedRace(race)
                            }}
                            className={`${styles.raceButton} ${selectedRace === race ? styles[`active_${race}`] : ''}`}
                        >
                            {race === 'all' ? '전체' : race === 'Elyos' ? '천족' : '마족'}
                        </button>
                    ))}
                </div>
                {isLoading && (
                    <div style={{ color: '#f59e0b', display: 'flex' }}>
                        <Loader2 className="animate-spin" size={18} />
                    </div>
                )}
            </div>

            {/* Results Count */}
            <div className={styles.infoLine}>
                <span>검색 결과 {filteredAndSortedResults.length}개</span>
                {results.length > 0 && <span style={{ fontSize: '10px', opacity: 0.6 }}>내림차순 정렬됨</span>}
            </div>

            {/* Warning Message */}
            {warning && (
                <div className={styles.warningLine}>
                    <span>⚠️</span>
                    <span>{warning}</span>
                    {onRefreshSearch && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onRefreshSearch()
                            }}
                            className={styles.refreshButton}
                        >
                            실시간 업데이트
                        </button>
                    )}
                </div>
            )}

            {/* Results Grid */}
            <div className={styles.resultsGrid}>
                {filteredAndSortedResults.map((char) => {
                    const isElyos = char.race === 'Elyos' || char.race === '천족'

                    return (
                        <div
                            key={char.characterId ? `id:${char.characterId}` : `sv:${char.server}|name:${normalizeName(char.name)}`}
                            onClick={() => onSelect(char)}
                            className={styles.characterCard}
                        >
                            <div className={`${styles.raceIndicator} ${isElyos ? styles.elyosIndicator : styles.asmodianIndicator}`} />

                            <CharacterAvatar char={char} />

                            <div className={styles.charInfo}>
                                <div className={styles.nameRow}>
                                    <span className={styles.charName}>
                                        {char.name.replace(/<\/?[^>]+(>|$)/g, '')}
                                    </span>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        {char.pve_score !== undefined && char.pve_score > 0 && (
                                            <span className={styles.scoreBadge} title="PVE 전투력">
                                                {formatNumber(char.pve_score)}
                                            </span>
                                        )}
                                        {char.pvp_score !== undefined && char.pvp_score > 0 && (
                                            <span className={styles.scoreBadge} style={{ color: '#A78BFA', borderColor: 'rgba(167, 139, 250, 0.3)', background: 'rgba(167, 139, 250, 0.1)' }} title="PVP 전투력">
                                                {formatNumber(char.pvp_score)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className={styles.serverRow}>
                                    <span className={`${styles.serverName} ${isElyos ? styles.elyosText : styles.asmodianText}`}>
                                        {char.server}
                                    </span>
                                    <span>•</span>
                                    <span>{char.job}</span>
                                    {char.item_level !== undefined && char.item_level > 0 && (
                                        <>
                                            <span>•</span>
                                            <span style={{ color: '#fff', fontWeight: '600' }}>iLv.{char.item_level}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}

                {filteredAndSortedResults.length === 0 && !isLoading && (
                    <div className={styles.emptyState}>
                        <div>검색 결과가 없습니다.</div>
                        {onRefreshSearch && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onRefreshSearch()
                                }}
                                className={styles.refreshButton}
                                style={{ marginTop: '16px', padding: '8px 20px', fontSize: '13px' }}
                            >
                                공식 홈페이지에서 찾기
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* 디버그 패널 */}
            <div className={styles.debugPanel}>
                <div className={styles.debugHeader}>
                    <button
                        onClick={() => setShowDebug(!showDebug)}
                        className={styles.debugToggle}
                    >
                        {showDebug ? '▼ 디버그 숨기기' : '▶ 디버그 보기'} ({debugLogs.length})
                    </button>
                    {showDebug && (
                        <button
                            onClick={copyDebugLogs}
                            className={styles.refreshButton}
                            style={{ padding: '2px 8px', fontSize: '10px' }}
                        >
                            로그 복사
                        </button>
                    )}
                </div>
                {showDebug && (
                    <div className={styles.debugContent}>
                        {debugLogs.length === 0 ? (
                            <div>로그 없음</div>
                        ) : (
                            debugLogs.map((log, i) => (
                                <div key={i} style={{
                                    color: log.includes('ERROR') ? '#f87171' :
                                        log.includes('SUCCESS') ? '#4ade80' : '#9ca3af'
                                }}>
                                    {log}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
