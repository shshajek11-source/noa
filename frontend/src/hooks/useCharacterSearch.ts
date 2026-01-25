'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabaseApi, CharacterSearchResult, SERVER_NAME_TO_ID } from '../lib/supabaseApi'

export interface UseCharacterSearchOptions {
    /** Debounce 지연 시간 (ms) */
    debounceMs?: number
    /** 최소 검색 문자 수 */
    minLength?: number
    /** 검색 결과 최대 개수 */
    maxResults?: number
    /** 결과 콜백 (동기화 등에 활용) */
    onResults?: (results: CharacterSearchResult[]) => void
}

export interface UseCharacterSearchReturn {
    /** 검색어 */
    query: string
    /** 검색어 설정 */
    setQuery: (value: string) => void
    /** 종족 필터 */
    race: 'elyos' | 'asmodian' | undefined
    /** 종족 설정 */
    setRace: (value: 'elyos' | 'asmodian' | undefined) => void
    /** 서버 필터 (서버명) */
    server: string
    /** 서버 설정 */
    setServer: (value: string) => void
    /** 검색 결과 */
    results: CharacterSearchResult[]
    /** 검색 중 여부 */
    isSearching: boolean
    /** 결과 표시 여부 */
    showResults: boolean
    /** 결과 표시 설정 */
    setShowResults: (value: boolean) => void
    /** 결과 초기화 */
    clearResults: () => void
    /** 검색 억제 (선택 후 검색 방지) */
    suppressSearch: () => void
}

/**
 * 캐릭터 검색 훅
 *
 * Local DB + Live API 하이브리드 검색을 제공합니다.
 * Debounce, 중복 제거, 필터링이 포함되어 있습니다.
 *
 * @example
 * ```tsx
 * const { query, setQuery, results, isSearching } = useCharacterSearch({
 *     debounceMs: 300,
 *     onResults: (results) => syncToDatabase(results)
 * })
 * ```
 */
export function useCharacterSearch(options: UseCharacterSearchOptions = {}): UseCharacterSearchReturn {
    const {
        debounceMs = 300,
        minLength = 1,
        maxResults = 20,
        onResults
    } = options

    const [query, setQuery] = useState('')
    const [race, setRace] = useState<'elyos' | 'asmodian' | undefined>(undefined)
    const [server, setServer] = useState('')
    const [results, setResults] = useState<CharacterSearchResult[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [showResults, setShowResults] = useState(false)

    const suppressRef = useRef(false)
    const abortControllerRef = useRef<AbortController | null>(null)

    // 결과 초기화
    const clearResults = useCallback(() => {
        setResults([])
        setShowResults(false)
    }, [])

    // 검색 억제 (선택 후 검색 방지)
    const suppressSearch = useCallback(() => {
        suppressRef.current = true
        clearResults()
    }, [clearResults])

    // 이름 정규화
    const normalizeName = useCallback((value: string) => {
        return value.replace(/<\/?[^>]+(>|$)/g, '').trim().toLowerCase()
    }, [])

    // 결과 키 생성 (중복 방지)
    const buildKey = useCallback((item: CharacterSearchResult) => {
        if (item.characterId) return `id:${item.characterId}`
        const serverKey = item.server_id ?? item.server
        return `sv:${serverKey}|name:${normalizeName(item.name)}`
    }, [normalizeName])

    // 결과 필터링
    const filterResults = useCallback((
        items: CharacterSearchResult[],
        serverId: number | undefined,
        raceFilter: string | undefined
    ): CharacterSearchResult[] => {
        return items.filter(r => {
            // 서버 필터
            if (serverId && r.server_id !== serverId) return false

            // 종족 필터
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
    }, [])

    // 하이브리드 검색 실행
    const performSearch = useCallback(async (searchTerm: string) => {
        // 이전 요청 취소
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }
        abortControllerRef.current = new AbortController()

        setIsSearching(true)
        setShowResults(true)

        const serverId = server ? SERVER_NAME_TO_ID[server] : undefined
        const raceFilter = race

        const seen = new Set<string>()
        const combined: CharacterSearchResult[] = []

        const addResults = (items: CharacterSearchResult[]) => {
            const filtered = filterResults(items, serverId, raceFilter)
            filtered.forEach(item => {
                const key = buildKey(item)
                if (!seen.has(key)) {
                    combined.push(item)
                    seen.add(key)
                }
            })
        }

        try {
            // 병렬 검색
            const [localResults, liveResults] = await Promise.allSettled([
                supabaseApi.searchLocalCharacter(searchTerm, serverId, raceFilter),
                supabaseApi.searchCharacter(searchTerm, serverId, raceFilter, 1)
            ])

            // 로컬 결과 추가
            if (localResults.status === 'fulfilled') {
                addResults(localResults.value)
            }

            // 라이브 결과 추가
            if (liveResults.status === 'fulfilled') {
                addResults(liveResults.value.list)
            }

            // 정렬 (pve_score 기준)
            combined.sort((a, b) => (b.pve_score ?? 0) - (a.pve_score ?? 0))

            // 최대 개수 제한
            const finalResults = combined.slice(0, maxResults)

            setResults(finalResults)

            // 콜백 호출
            if (onResults) {
                onResults(finalResults)
            }
        } catch (error) {
            console.error('[useCharacterSearch] Search error:', error)
        } finally {
            setIsSearching(false)
        }
    }, [server, race, filterResults, buildKey, maxResults, onResults])

    // Debounce 검색
    useEffect(() => {
        // 억제 상태면 검색하지 않음
        if (suppressRef.current) {
            suppressRef.current = false
            return
        }

        const trimmedQuery = query.trim()

        if (trimmedQuery.length < minLength) {
            clearResults()
            return
        }

        const timer = setTimeout(() => {
            performSearch(trimmedQuery)
        }, debounceMs)

        return () => {
            clearTimeout(timer)
        }
    }, [query, race, server, minLength, debounceMs, performSearch, clearResults])

    // 컴포넌트 언마운트 시 요청 취소
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
        }
    }, [])

    return {
        query,
        setQuery,
        race,
        setRace,
        server,
        setServer,
        results,
        isSearching,
        showResults,
        setShowResults,
        clearResults,
        suppressSearch
    }
}

export default useCharacterSearch
