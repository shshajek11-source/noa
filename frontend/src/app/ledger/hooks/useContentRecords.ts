'use client'

import useSWR from 'swr'
import { useCallback } from 'react'
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
  // 컨텐츠 타입 및 던전 단계 로드 (전역 데이터, 한 번만 로드)
  const { data: typeData } = useSWR<{ contentTypes: ContentType[], dungeonTiers: DungeonTier[] }>(
    '/api/ledger/content-types',
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch content types')
      return res.json()
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000 * 5  // 5분 캐시
    }
  )

  const contentTypes = typeData?.contentTypes || []
  const dungeonTiers = typeData?.dungeonTiers || []

  // 레코드 fetcher
  const recordsFetcher = useCallback(async (url: string) => {
    const res = await fetch(url, {
      headers: getAuthHeader()
    })
    if (!res.ok) {
      console.error('[Content Records] Fetch failed:', res.status, res.statusText)
      throw new Error('Failed to fetch records')
    }
    let data = await res.json()

    // 잘못된 0키나 레코드 자동 정리
    const badRecords = data.filter((r: ContentRecord) =>
      ZERO_KINA_CONTENT_TYPES.includes(r.content_type) && r.base_kina > 0
    )

    if (badRecords.length > 0) {
      console.log('[Content Records] Cleaning up bad zero-kina records:', badRecords.map((r: ContentRecord) => r.content_type))

      // 잘못된 레코드 수정 (병렬 처리)
      await Promise.all(badRecords.map(async (record: ContentRecord) => {
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
      data = data.map((r: ContentRecord) =>
        ZERO_KINA_CONTENT_TYPES.includes(r.content_type)
          ? { ...r, base_kina: 0, total_kina: 0 }
          : r
      )
    }

    return data as ContentRecord[]
  }, [getAuthHeader, characterId, date])

  // 레코드 로드 (SWR)
  const swrKey = isReady && characterId && date
    ? `/api/ledger/content-records?characterId=${characterId}&date=${date}`
    : null

  const { data: records = [], error, isLoading, mutate } = useSWR<ContentRecord[]>(
    swrKey,
    recordsFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 2000
    }
  )

  // 특정 컨텐츠의 던전 단계 목록 가져오기
  const getTiersForContent = useCallback((contentType: string) => {
    return dungeonTiers.filter(t => t.content_type === contentType)
  }, [dungeonTiers])

  // 기록 업데이트 (낙관적 업데이트 적용)
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

      // 낙관적 업데이트: 먼저 UI 반영
      const optimisticRecord: ContentRecord = {
        id: existing?.id || 'temp-' + Date.now(),
        character_id: characterId,
        record_date: date,
        content_type: contentType,
        dungeon_tier: payload.dungeon_tier,
        max_count: payload.max_count,
        completion_count: payload.completion_count,
        is_double: payload.is_double,
        base_kina: payload.base_kina,
        total_kina: isZeroKinaContent ? 0 : payload.base_kina * payload.completion_count * (payload.is_double ? 2 : 1),
        created_at: existing?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const optimisticRecords = existing
        ? records.map(r => r.content_type === contentType ? optimisticRecord : r)
        : [...records, optimisticRecord]

      // UI 즉시 반영
      await mutate(optimisticRecords, false)

      // 서버에 저장
      const res = await fetch('/api/ledger/content-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        // 실패 시 원복
        await mutate()
        throw new Error('Failed to update record')
      }

      const updated = await res.json()

      // 서버 응답으로 최종 동기화
      const finalRecords = existing
        ? records.map(r => r.content_type === contentType ? updated : r)
        : [...records, updated]
      await mutate(finalRecords, false)

      return updated
    } catch (e: any) {
      console.error('[Content Records] Update error:', e)
      return null
    }
  }

  // 완료 횟수 증가 (낙관적 업데이트)
  const incrementCompletion = async (contentType: string) => {
    const existing = records.find(r => r.content_type === contentType)
    const maxCount = existing?.max_count ?? DEFAULT_MAX_COUNTS[contentType] ?? 3
    const currentCount = existing?.completion_count ?? 0

    if (currentCount >= maxCount) return null

    return updateRecord(contentType, {
      completion_count: currentCount + 1,
      max_count: maxCount
    })
  }

  // 완료 횟수 감소 (낙관적 업데이트)
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
      completion_count: Math.min(completionCount, maxCount)
    })
  }

  // 오늘 총 수입 계산
  const getTotalIncome = useCallback(() => {
    return records.reduce((sum, r) => sum + (r.total_kina || 0), 0)
  }, [records])

  // 기존 인터페이스 100% 유지
  return {
    records,
    contentTypes,
    dungeonTiers,
    isLoading,
    error: error?.message || null,
    getTiersForContent,
    updateRecord,
    incrementCompletion,
    decrementCompletion,
    toggleDouble,
    changeDungeonTier,
    changeMaxCount,
    getTotalIncome,
    refetch: mutate
  }
}
