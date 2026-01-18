'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface CacheEntry<T> {
  data: T
  timestamp: number
}

// 전역 캐시 저장소
const globalCache = new Map<string, CacheEntry<any>>()

interface UseDataCacheOptions<T> {
  /** 캐시 키 */
  key: string
  /** 데이터를 가져오는 함수 */
  fetcher: () => Promise<T>
  /** 캐시 유효 시간 (ms), 기본값: 5분 */
  ttl?: number
  /** 자동으로 데이터 가져오기 */
  enabled?: boolean
  /** 초기 데이터 */
  initialData?: T
}

interface UseDataCacheResult<T> {
  data: T | null
  isLoading: boolean
  error: Error | null
  /** 데이터 새로고침 (캐시 무시) */
  refresh: () => Promise<void>
  /** 캐시 무효화 */
  invalidate: () => void
}

/**
 * 간단한 데이터 캐싱 훅
 *
 * 특징:
 * - 전역 캐시로 컴포넌트 간 데이터 공유
 * - TTL 기반 캐시 만료
 * - 수동 새로고침 및 무효화 지원
 *
 * @example
 * const { data, isLoading, refresh } = useDataCache({
 *   key: `character-${characterId}`,
 *   fetcher: () => fetch(`/api/character?id=${characterId}`).then(r => r.json()),
 *   ttl: 5 * 60 * 1000 // 5분
 * })
 */
export function useDataCache<T>({
  key,
  fetcher,
  ttl = 5 * 60 * 1000, // 기본 5분
  enabled = true,
  initialData
}: UseDataCacheOptions<T>): UseDataCacheResult<T> {
  const [data, setData] = useState<T | null>(() => {
    // 초기값: 캐시에서 가져오기
    const cached = globalCache.get(key)
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data
    }
    return initialData ?? null
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // 중복 요청 방지를 위한 ref
  const fetchingRef = useRef(false)

  const fetchData = useCallback(async (ignoreCache = false) => {
    // 중복 요청 방지
    if (fetchingRef.current) return

    // 캐시 확인
    if (!ignoreCache) {
      const cached = globalCache.get(key)
      if (cached && Date.now() - cached.timestamp < ttl) {
        setData(cached.data)
        return
      }
    }

    fetchingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const result = await fetcher()

      // 캐시에 저장
      globalCache.set(key, {
        data: result,
        timestamp: Date.now()
      })

      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
      fetchingRef.current = false
    }
  }, [key, fetcher, ttl])

  const refresh = useCallback(async () => {
    await fetchData(true)
  }, [fetchData])

  const invalidate = useCallback(() => {
    globalCache.delete(key)
    setData(null)
  }, [key])

  useEffect(() => {
    if (enabled && key) {
      fetchData()
    }
  }, [enabled, key, fetchData])

  return { data, isLoading, error, refresh, invalidate }
}

/**
 * 캐시 전체 무효화 (로그아웃 등에 사용)
 */
export function clearAllCache() {
  globalCache.clear()
}

/**
 * 특정 패턴의 캐시 무효화
 * @example clearCacheByPattern('character-') // character-로 시작하는 모든 캐시 삭제
 */
export function clearCacheByPattern(pattern: string) {
  for (const key of globalCache.keys()) {
    if (key.startsWith(pattern)) {
      globalCache.delete(key)
    }
  }
}
