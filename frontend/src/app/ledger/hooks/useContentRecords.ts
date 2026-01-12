'use client'

import { useState, useEffect, useCallback } from 'react'
import { ContentRecord, ContentType, DungeonTier, UpdateContentRecordRequest } from '@/types/ledger'

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

  // 기록 로드
  const fetchRecords = useCallback(async () => {
    if (!isReady || !characterId || !date) return

    setIsLoading(true)
    try {
      const res = await fetch(`/api/ledger/content-records?characterId=${characterId}&date=${date}`, {
        headers: getAuthHeader()
      })
      if (res.ok) {
        const data = await res.json()
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
  }, [isReady, characterId, date, getAuthHeader])

  useEffect(() => {
    fetchContentTypes()
  }, [fetchContentTypes])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

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

      const payload = {
        characterId,
        date,
        content_type: contentType,
        dungeon_tier: data.dungeon_tier || existing?.dungeon_tier || defaultTier?.id || '',
        max_count: data.max_count ?? existing?.max_count ?? 3,
        completion_count: data.completion_count ?? existing?.completion_count ?? 0,
        is_double: data.is_double ?? existing?.is_double ?? false,
        base_kina: data.base_kina ?? existing?.base_kina ?? defaultTier?.default_kina ?? 50000
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
    const maxCount = existing?.max_count ?? 3
    const currentCount = existing?.completion_count ?? 0

    if (currentCount >= maxCount) return null

    return updateRecord(contentType, {
      completion_count: currentCount + 1
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
