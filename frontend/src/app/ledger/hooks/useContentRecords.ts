'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ContentRecord, ContentType, DungeonTier, UpdateContentRecordRequest } from '@/types/ledger'

// 각 컨텐츠별 기본 maxCount (PC와 동일하게 유지)
const DEFAULT_MAX_COUNTS: Record<string, number> = {
  daily_dungeon: 7,       // 일일던전: 주간 리셋
  awakening_battle: 3,    // 각성전: 주간 리셋
  nightmare: 14,          // 악몽: 매일 05시에 2회 충전
  dimension_invasion: 14, // 차원침공: 24시간마다 1회 충전
  subjugation: 3,         // 토벌전: 주간 리셋
  abyss_corridor: 3       // 어비스 회랑
}

// 0키나 컨텐츠 (키나 보상이 없는 컨텐츠들)
const ZERO_KINA_CONTENT_TYPES = [
  'daily_dungeon',      // 일일던전
  'awakening_battle',   // 각성전
  'nightmare',          // 악몽
  'dimension_invasion', // 차원침공
  'subjugation',        // 토벌전
  'abyss_corridor',     // 어비스 회랑
  'shugo_festa',        // 슈고페스타
  'mission',            // 일일사명
  'weekly_order',       // 주간지령서
  'abyss_order'         // 어비스 주간지령서
]

interface UseContentRecordsProps {
  getAuthHeader: () => Record<string, string>
  isReady: boolean
  characterId: string | null
  date: string
}

export function useContentRecords({ getAuthHeader, isReady, characterId, date }: UseContentRecordsProps) {
  const [records, setRecords] = useState<ContentRecord[]>([])
  const [contentTypes, setContentTypes] = useState<ContentType[]>([])
  const [dungeonTiers, setDungeonTiers] = useState<DungeonTier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const lastLoadedRef = useRef<string | null>(null) // 중복 호출 방지

  // 컨텐츠 타입 및 던전 단계 로드
  const fetchContentTypes = useCallback(async () => {
    try {
      const res = await fetch('/api/ledger/content-types')
      if (res.ok) {
        const data = await res.json()
        setContentTypes(data.contentTypes)
        setDungeonTiers(data.dungeonTiers)
      }
    } catch (e: any) {
      console.error('Failed to fetch content types:', e)
    }
  }, [])

  // 잘못된 0키나 컨텐츠 레코드 정리 (base_kina > 0인 경우 수정)
  const cleanupZeroKinaRecords = useCallback(async (records: ContentRecord[]) => {
    const badRecords = records.filter(r =>
      ZERO_KINA_CONTENT_TYPES.includes(r.content_type) && r.base_kina > 0
    )

    if (badRecords.length === 0) return records

    console.log('[Content Records] Cleaning up bad zero-kina records:', badRecords.map(r => r.content_type))

    // 잘못된 레코드 수정 (병렬 처리)
    await Promise.all(badRecords.map(async (record) => {
      try {
        await fetch('/api/ledger/content-records', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
          },
          body: JSON.stringify({
            characterId,
            date,
            content_type: record.content_type,
            dungeon_tier: record.dungeon_tier,
            max_count: record.max_count,
            completion_count: record.completion_count,
            is_double: record.is_double,
            base_kina: 0  // 0키나로 수정
          })
        })
      } catch (e) {
        console.error(`[Content Records] Failed to cleanup ${record.content_type}:`, e)
      }
    }))

    // 수정된 레코드 반환
    return records.map(r =>
      ZERO_KINA_CONTENT_TYPES.includes(r.content_type)
        ? { ...r, base_kina: 0, total_kina: 0 }
        : r
    )
  }, [characterId, date, getAuthHeader])

  // 기록 로드
  const fetchRecords = useCallback(async () => {
    if (!isReady || !characterId || !date) return

    setIsLoading(true)
    try {
      const res = await fetch(`/api/ledger/content-records?characterId=${characterId}&date=${date}`, {
        headers: getAuthHeader()
      })
      if (res.ok) {
        let data = await res.json()
        // 잘못된 0키나 레코드 자동 정리
        data = await cleanupZeroKinaRecords(data)
        setRecords(data)
      } else {
        console.error('[Content Records] Fetch failed:', res.status, res.statusText)
      }
    } catch (e: any) {
      console.error('[Content Records] Fetch error:', e)
      setError(e.message)
    } finally {
      setIsLoading(false)
    }
  }, [isReady, characterId, date, getAuthHeader, cleanupZeroKinaRecords])

  useEffect(() => {
    fetchContentTypes()
  }, [fetchContentTypes])

  useEffect(() => {
    // 중복 호출 방지
    const loadKey = `${characterId}-${date}`
    if (lastLoadedRef.current === loadKey) {
      return
    }
    if (characterId && date) {
      lastLoadedRef.current = loadKey
    }
    fetchRecords()
  }, [fetchRecords, characterId, date])

  // 특정 컨텐츠의 던전 단계 목록 가져오기
  const getTiersForContent = useCallback((contentType: string) => {
    return dungeonTiers.filter(t => t.content_type === contentType)
  }, [dungeonTiers])

  // 기록 업데이트
  const updateRecord = async (
    contentType: string,
    data: Partial<UpdateContentRecordRequest>
  ) => {
    if (!isReady || !characterId) return null

    try {
      // 기존 기록 찾기 또는 기본값 사용
      const existing = records.find(r => r.content_type === contentType)
      const tiers = getTiersForContent(contentType)
      const defaultTier = tiers[0]

      // 0키나 컨텐츠는 항상 base_kina = 0 강제
      const isZeroKinaContent = ZERO_KINA_CONTENT_TYPES.includes(contentType)

      const payload = {
        characterId,
        date,
        content_type: contentType,
        dungeon_tier: data.dungeon_tier || existing?.dungeon_tier || defaultTier?.id || '',
        max_count: data.max_count ?? existing?.max_count ?? DEFAULT_MAX_COUNTS[contentType] ?? 3,
        completion_count: data.completion_count ?? existing?.completion_count ?? 0,
        is_double: data.is_double ?? existing?.is_double ?? false,
        base_kina: isZeroKinaContent ? 0 : (data.base_kina ?? existing?.base_kina ?? defaultTier?.default_kina ?? 50000)
      }

      const res = await fetch('/api/ledger/content-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        throw new Error('Failed to update record')
      }

      const updated = await res.json()

      // 로컬 상태 업데이트
      setRecords(prev => {
        const idx = prev.findIndex(r => r.content_type === contentType)
        if (idx >= 0) {
          const newRecords = [...prev]
          newRecords[idx] = updated
          return newRecords
        } else {
          return [...prev, updated]
        }
      })

      return updated
    } catch (e: any) {
      setError(e.message)
      return null
    }
  }

  // 완료 횟수 증가
  const incrementCompletion = async (contentType: string) => {
    const existing = records.find(r => r.content_type === contentType)
    // 기본값을 컨텐츠별로 설정 (PC와 동일)
    const maxCount = existing?.max_count ?? DEFAULT_MAX_COUNTS[contentType] ?? 3
    const currentCount = existing?.completion_count ?? 0

    if (currentCount >= maxCount) return null

    return updateRecord(contentType, {
      completion_count: currentCount + 1,
      max_count: maxCount  // maxCount도 함께 저장
    })
  }

  // 완료 횟수 감소
  const decrementCompletion = async (contentType: string) => {
    const existing = records.find(r => r.content_type === contentType)
    const currentCount = existing?.completion_count ?? 0

    if (currentCount <= 0) return null

    return updateRecord(contentType, {
      completion_count: currentCount - 1
    })
  }

  // x2 토글
  const toggleDouble = async (contentType: string) => {
    const existing = records.find(r => r.content_type === contentType)
    return updateRecord(contentType, {
      is_double: !existing?.is_double
    })
  }

  // 던전 단계 변경
  const changeDungeonTier = async (contentType: string, tierId: string) => {
    const tier = dungeonTiers.find(t => t.id === tierId)
    if (!tier) return null

    return updateRecord(contentType, {
      dungeon_tier: tierId,
      base_kina: tier.default_kina
    })
  }

  // 남은 횟수 변경
  const changeMaxCount = async (contentType: string, maxCount: number) => {
    const existing = records.find(r => r.content_type === contentType)
    const completionCount = existing?.completion_count ?? 0

    return updateRecord(contentType, {
      max_count: maxCount,
      // 완료 횟수가 새 최대값보다 크면 조정
      completion_count: Math.min(completionCount, maxCount)
    })
  }

  // 오늘 총 수입 계산
  const getTotalIncome = useCallback(() => {
    return records.reduce((sum, r) => sum + (r.total_kina || 0), 0)
  }, [records])

  return {
    records,
    contentTypes,
    dungeonTiers,
    isLoading,
    error,
    getTiersForContent,
    updateRecord,
    incrementCompletion,
    decrementCompletion,
    toggleDouble,
    changeDungeonTier,
    changeMaxCount,
    getTotalIncome,
    refetch: fetchRecords
  }
}
