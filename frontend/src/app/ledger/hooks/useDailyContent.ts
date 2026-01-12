'use client'

import { useState, useEffect, useCallback } from 'react'
import { DailyContent } from '../components/DailyContentCard'
import { getAuthHeader } from './useDeviceId'

// Default daily content definitions
const DEFAULT_DAILY_CONTENTS: Omit<DailyContent, 'completionCount'>[] = [
  {
    id: 'daily_dungeon',
    name: '일일던전',
    icon: '',
    maxCount: 6,
    baseReward: 20000,
    color: '#facc15',
    colorLight: '#fde047',
    colorDark: '#eab308',
    colorGlow: 'rgba(250, 204, 21, 0.5)'
  },
  {
    id: 'awakening_battle',
    name: '각성전',
    icon: '',
    maxCount: 3,
    baseReward: 40000,
    color: '#3b82f6',
    colorLight: '#60a5fa',
    colorDark: '#2563eb',
    colorGlow: 'rgba(59, 130, 246, 0.5)'
  },
  {
    id: 'subjugation',
    name: '토벌전',
    icon: '',
    maxCount: 1,
    baseReward: 80000,
    color: '#10b981',
    colorLight: '#34d399',
    colorDark: '#059669',
    colorGlow: 'rgba(16, 185, 129, 0.5)'
  },
  {
    id: 'nightmare',
    name: '악몽',
    icon: '',
    maxCount: 3,
    baseReward: 50000,
    color: '#9333ea',
    colorLight: '#a855f7',
    colorDark: '#7e22ce',
    colorGlow: 'rgba(147, 51, 234, 0.5)'
  },
  {
    id: 'dimension_invasion',
    name: '차원침공',
    icon: '',
    maxCount: 5,
    baseReward: 30000,
    color: '#ef4444',
    colorLight: '#f87171',
    colorDark: '#dc2626',
    colorGlow: 'rgba(239, 68, 68, 0.5)'
  },
  {
    id: 'sanctuary',
    name: '성역',
    icon: '',
    maxCount: 1,
    baseReward: 0,
    color: '#f59e0b',
    colorLight: '#fbbf24',
    colorDark: '#d97706',
    colorGlow: 'rgba(245, 158, 11, 0.5)'
  }
]

export function useDailyContent(characterId: string | null, date: string) {
  const [contents, setContents] = useState<DailyContent[]>(
    DEFAULT_DAILY_CONTENTS.map(c => ({ ...c, completionCount: 0 }))
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load daily content data from API
  const loadData = useCallback(async () => {
    if (!characterId) {
      // Reset to default if no character selected
      setContents(DEFAULT_DAILY_CONTENTS.map(c => ({ ...c, completionCount: 0 })))
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(
        `/api/ledger/daily-content?characterId=${characterId}&date=${date}`,
        {
          headers: getAuthHeader()
        }
      )

      if (!res.ok) {
        throw new Error('Failed to load daily content data')
      }

      const data = await res.json()

      // Merge API data with default definitions
      const mergedContents = DEFAULT_DAILY_CONTENTS.map(defaultContent => {
        const apiData = data.find((d: any) => d.content_id === defaultContent.id)
        return {
          ...defaultContent,
          completionCount: apiData?.completion_count || 0
        }
      })

      setContents(mergedContents)
    } catch (err) {
      console.error('Failed to load daily content:', err)
      // Don't show error, just use default empty state
      setContents(DEFAULT_DAILY_CONTENTS.map(c => ({ ...c, completionCount: 0 })))
    } finally {
      setLoading(false)
    }
  }, [characterId, date])

  // Save daily content update to API
  const saveContent = async (contentId: string, newCount: number) => {
    if (!characterId) return

    try {
      const content = DEFAULT_DAILY_CONTENTS.find(c => c.id === contentId)
      if (!content) return

      const res = await fetch('/api/ledger/daily-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          characterId,
          date,
          contentId,
          maxCount: content.maxCount,
          completionCount: newCount,
          baseReward: content.baseReward
        })
      })

      if (!res.ok) {
        throw new Error('Failed to save daily content')
      }
    } catch (err) {
      console.error('Failed to save daily content:', err)
      // Silently fail - user can try again
    }
  }

  // Increment completion count
  const handleIncrement = useCallback((id: string) => {
    setContents(prev => {
      const newContents = prev.map(content => {
        if (content.id === id && content.completionCount < content.maxCount) {
          const newCount = content.completionCount + 1
          saveContent(id, newCount)
          return { ...content, completionCount: newCount }
        }
        return content
      })
      return newContents
    })
  }, [characterId, date])

  // Decrement completion count
  const handleDecrement = useCallback((id: string) => {
    setContents(prev => {
      const newContents = prev.map(content => {
        if (content.id === id && content.completionCount > 0) {
          const newCount = content.completionCount - 1
          saveContent(id, newCount)
          return { ...content, completionCount: newCount }
        }
        return content
      })
      return newContents
    })
  }, [characterId, date])

  // Load data when character or date changes
  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    contents,
    loading,
    error,
    handleIncrement,
    handleDecrement,
    refresh: loadData
  }
}
