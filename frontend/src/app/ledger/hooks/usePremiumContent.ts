'use client'

import { useState, useEffect, useCallback } from 'react'
import { PremiumContent } from '../components/PremiumContentCard'
import { getAuthHeader } from './useDeviceId'

// Default premium content definitions
const DEFAULT_PREMIUM_CONTENTS: Omit<PremiumContent, 'completionCount'>[] = [
  {
    id: 'shugo_festa',
    name: '슈고페스타',
    subtitle: '일일 이벤트 컨텐츠',
    icon: '🎪',
    maxCount: 14,
    baseReward: 0,
    color: '#f59e0b',
    colorLight: '#fbbf24',
    colorDark: '#d97706',
    colorGlow: 'rgba(245, 158, 11, 0.5)'
  },
  {
    id: 'abyss_corridor',
    name: '어비스회랑',
    subtitle: '심연의 던전',
    icon: '🌀',
    maxCount: 3,
    baseReward: 0,
    color: '#8b5cf6',
    colorLight: '#a78bfa',
    colorDark: '#7c3aed',
    colorGlow: 'rgba(139, 92, 246, 0.5)'
  }
]

export function usePremiumContent(characterId: string | null, date: string) {
  const [contents, setContents] = useState<PremiumContent[]>(
    DEFAULT_PREMIUM_CONTENTS.map(c => ({ ...c, completionCount: 0 }))
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load premium content data from API
  const loadData = useCallback(async () => {
    if (!characterId) {
      // Reset to default if no character selected
      setContents(DEFAULT_PREMIUM_CONTENTS.map(c => ({ ...c, completionCount: 0 })))
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(
        `/api/ledger/premium-content?characterId=${characterId}&date=${date}`,
        {
          headers: getAuthHeader()
        }
      )

      if (!res.ok) {
        throw new Error('Failed to load premium content data')
      }

      const data = await res.json()

      // Merge API data with default definitions
      const mergedContents = DEFAULT_PREMIUM_CONTENTS.map(defaultContent => {
        const apiData = data.find((d: any) => d.content_id === defaultContent.id)
        return {
          ...defaultContent,
          completionCount: apiData?.completion_count || 0
        }
      })

      setContents(mergedContents)
    } catch (err) {
      console.error('Failed to load premium content:', err)
      // Don't show error, just use default empty state
      setContents(DEFAULT_PREMIUM_CONTENTS.map(c => ({ ...c, completionCount: 0 })))
    } finally {
      setLoading(false)
    }
  }, [characterId, date])

  // Save premium content update to API
  const saveContent = async (contentId: string, newCount: number) => {
    if (!characterId) return

    try {
      const content = DEFAULT_PREMIUM_CONTENTS.find(c => c.id === contentId)
      if (!content) return

      const res = await fetch('/api/ledger/premium-content', {
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
        throw new Error('Failed to save premium content')
      }
    } catch (err) {
      console.error('Failed to save premium content:', err)
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
