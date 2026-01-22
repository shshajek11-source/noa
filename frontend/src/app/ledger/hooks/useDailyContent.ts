'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { DailyContent } from '../components/DailyContentCard'
import { getWeekKey } from '../utils/dateUtils'

// Temporary image URL (same as Shugo Festa)
const TEMP_IMAGE_URL = 'https://fizz-download.playnccdn.com/download/v2/buckets/guidebook/files/19a69c5377f-d2502cef-9d59-4336-8a55-9de857b08544'

// 주간 리셋 컨텐츠 (수요일 5시 리셋)
const WEEKLY_RESET_CONTENTS = ['daily_dungeon', 'awakening_battle', 'subjugation']

// Default daily content definitions
const DEFAULT_DAILY_CONTENTS: Omit<DailyContent, 'completionCount'>[] = [
  {
    id: 'daily_dungeon',
    name: '일일던전',
    icon: '',
    maxCount: 7,  // 수요일 05:00 주간 리셋
    baseReward: 0,  // 키나 보상 없음
    color: '#f59e0b',
    colorLight: '#fbbf24',
    colorDark: '#d97706',
    colorGlow: 'rgba(245, 158, 11, 0.5)',
    imageUrl: '/메달/주간컨텐츠/일일던전.png',
    resetType: 'weekly'
  },
  {
    id: 'awakening_battle',
    name: '각성전',
    icon: '',
    maxCount: 3,  // 수요일 05:00 주간 리셋
    baseReward: 0,  // 키나 보상 없음
    color: '#3b82f6',
    colorLight: '#60a5fa',
    colorDark: '#2563eb',
    colorGlow: 'rgba(59, 130, 246, 0.5)',
    imageUrl: '/메달/주간컨텐츠/각성전.png',
    resetType: 'weekly'
  },
  {
    id: 'subjugation',
    name: '토벌전',
    icon: '',
    maxCount: 3,  // 수요일 05:00 주간 리셋
    baseReward: 0,  // 키나 보상 없음
    color: '#10b981',
    colorLight: '#34d399',
    colorDark: '#059669',
    colorGlow: 'rgba(16, 185, 129, 0.5)',
    imageUrl: '/메달/주간컨텐츠/토벌전.png',
    resetType: 'weekly'
  },
  {
    id: 'nightmare',
    name: '악몽',
    icon: '',
    maxCount: 14,  // 매일 05:00에 2회 충전
    baseReward: 0,  // 키나 보상 없음
    color: '#9333ea',
    colorLight: '#a855f7',
    colorDark: '#7e22ce',
    colorGlow: 'rgba(147, 51, 234, 0.5)',
    imageUrl: '/메달/주간컨텐츠/악몽.png',
    resetType: 'daily'
  },
  {
    id: 'dimension_invasion',
    name: '차원침공',
    icon: '',
    maxCount: 14,  // 24시간마다 1회 충전
    baseReward: 0,  // 키나 보상 없음
    color: '#ef4444',
    colorLight: '#f87171',
    colorDark: '#dc2626',
    colorGlow: 'rgba(239, 68, 68, 0.5)',
    imageUrl: TEMP_IMAGE_URL,
    resetType: 'charge24h'
  }
]

export function useDailyContent(
  characterId: string | null,
  date: string,
  getAuthHeader: () => Record<string, string>
) {
  const [contents, setContents] = useState<DailyContent[]>(
    DEFAULT_DAILY_CONTENTS.map(c => ({ ...c, completionCount: 0 }))
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isLoadingRef = useRef(false)
  const lastLoadedRef = useRef<string | null>(null) // 중복 호출 방지

  // 주간 키 계산 (수요일 5시 기준)
  const weekKey = useMemo(() => getWeekKey(new Date(date)), [date])

  // DB에서 컨텐츠 기록 조회
  const loadFromDatabase = useCallback(async () => {
    if (!characterId) return null

    try {
      const res = await fetch(
        `/api/ledger/content-records?characterId=${characterId}&date=${date}`,
        {
          headers: getAuthHeader()
        }
      )

      if (!res.ok) {
        if (res.status === 404) return []
        throw new Error('Failed to load content records')
      }

      return await res.json()
    } catch (err) {
      console.error('Failed to load content records from DB:', err)
      return null
    }
  }, [characterId, date, getAuthHeader])

  // DB에 컨텐츠 기록 저장 (모든 컨텐츠 - 잔여횟수 동기화용)
  const saveToDatabase = useCallback(async (contentId: string, completionCount: number, content: DailyContent) => {
    if (!characterId) return

    try {
      // 0키나 컨텐츠도 저장 (잔여횟수 추적용, total_kina는 0)
      await fetch('/api/ledger/content-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          characterId,
          date,
          content_type: contentId,
          dungeon_tier: contentId,
          max_count: content.maxCount,
          completion_count: completionCount,
          is_double: false,
          base_kina: content.baseReward
        })
      })
    } catch (err) {
      console.error('Failed to save content record to DB:', err)
    }
  }, [characterId, date, getAuthHeader])

  // Load daily content data from DB
  const loadData = useCallback(async () => {
    isLoadingRef.current = true

    if (!characterId) {
      setContents(DEFAULT_DAILY_CONTENTS.map(c => ({ ...c, completionCount: 0 })))
      isLoadingRef.current = false
      return
    }

    // 즉시 초기화
    setContents(DEFAULT_DAILY_CONTENTS.map(c => ({ ...c, completionCount: 0 })))
    setLoading(true)

    try {
      // DB에서 기록 조회
      const records = await loadFromDatabase()

      if (records && Array.isArray(records)) {
        // DB 기록을 기반으로 컨텐츠 상태 업데이트
        const mergedContents = DEFAULT_DAILY_CONTENTS.map(defaultContent => {
          const record = records.find((r: any) => r.content_type === defaultContent.id)
          const completionCount = record?.completion_count || 0
          return {
            ...defaultContent,
            completionCount
          }
        })
        setContents(mergedContents)
      }
    } catch (err) {
      console.error('Failed to load daily content:', err)
      setError('데이터 로드 실패')
    } finally {
      setLoading(false)
      setTimeout(() => {
        isLoadingRef.current = false
      }, 100)
    }
  }, [characterId, date, loadFromDatabase])

  // Increment completion count
  // 주의: maxCount 체크를 제거 - DailyContentCard에서 totalRemaining 체크를 이미 수행함
  // 충전권 사용 시 completionCount가 maxCount를 초과할 수 있어야 함
  const handleIncrement = useCallback((id: string) => {
    setContents(prev => {
      const newContents = prev.map(content => {
        if (content.id === id) {
          const newCount = content.completionCount + 1
          // DB에 저장
          saveToDatabase(id, newCount, content)
          return { ...content, completionCount: newCount }
        }
        return content
      })
      return newContents
    })
  }, [saveToDatabase])

  // Decrement completion count
  const handleDecrement = useCallback((id: string) => {
    setContents(prev => {
      const newContents = prev.map(content => {
        if (content.id === id && content.completionCount > 0) {
          const newCount = content.completionCount - 1
          // DB에 저장
          saveToDatabase(id, newCount, content)
          return { ...content, completionCount: newCount }
        }
        return content
      })
      return newContents
    })
  }, [saveToDatabase])

  // Update remaining counts from props (초기설정 동기화)
  // 잔여 횟수를 받아서 completionCount = maxCount - 잔여횟수 로 계산
  const updateRemainingCounts = useCallback((remainingCounts: Record<string, number>) => {
    setContents(prev => {
      return prev.map(content => {
        const remaining = remainingCounts[content.id]
        if (remaining !== undefined) {
          const newCompletionCount = content.maxCount - remaining
          const validCount = Math.max(0, Math.min(newCompletionCount, content.maxCount))
          // DB에 저장
          saveToDatabase(content.id, validCount, content)
          return { ...content, completionCount: validCount }
        }
        return content
      })
    })
  }, [saveToDatabase])

  // Load data when character or date changes
  useEffect(() => {
    // 중복 호출 방지
    const loadKey = `${characterId}-${date}`
    if (lastLoadedRef.current === loadKey) {
      return
    }
    if (characterId && date) {
      lastLoadedRef.current = loadKey
    }
    loadData()
  }, [loadData, characterId, date])

  // 초기설정 동기화용 강제 적용 함수
  const forceSync = useCallback((remainingCounts: Record<string, number>) => {
    console.log('[useDailyContent] forceSync 호출:', remainingCounts)
    setContents(prev => {
      return prev.map(content => {
        const remaining = remainingCounts[content.id]
        if (remaining !== undefined) {
          // 잔여횟수를 직접 적용 (completionCount = maxCount - remaining)
          const newCompletionCount = content.maxCount - remaining
          const validCount = Math.max(0, Math.min(newCompletionCount, content.maxCount))

          // DB에 저장 (모든 컨텐츠)
          if (characterId) {
            console.log(`[useDailyContent] ${content.id}: remaining=${remaining}, completionCount=${validCount}`)

            fetch('/api/ledger/content-records', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
              },
              body: JSON.stringify({
                characterId,
                date,
                content_type: content.id,
                dungeon_tier: content.id,
                max_count: content.maxCount,
                completion_count: validCount,
                is_double: false,
                base_kina: content.baseReward
              })
            }).catch(err => console.error('[forceSync] DB 저장 실패:', err))
          }
          return { ...content, completionCount: validCount }
        }
        return content
      })
    })
  }, [characterId, date, getAuthHeader])

  return {
    contents,
    loading,
    error,
    handleIncrement,
    handleDecrement,
    refresh: loadData,
    updateRemainingCounts,
    forceSync
  }
}
