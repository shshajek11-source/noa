'use client'

import useSWR from 'swr'
import { useCallback } from 'react'
import { FavoriteItem } from '../components/FavoriteItemsPanel'

interface UseFavoriteItemsProps {
  getAuthHeader: () => Record<string, string>
  isReady: boolean
  characterId: string | null
}

export function useFavoriteItems({ getAuthHeader, isReady, characterId }: UseFavoriteItemsProps) {
  // SWR fetcher
  const fetcher = useCallback(async (url: string) => {
    const res = await fetch(url, {
      headers: getAuthHeader()
    })
    if (!res.ok) {
      return []  // API가 없으면 빈 배열 반환
    }
    return res.json()
  }, [getAuthHeader])

  // SWR key
  const swrKey = isReady && characterId
    ? `/api/ledger/favorite-items?characterId=${characterId}`
    : null

  // SWR hook
  const { data: favorites = [], error, isLoading, mutate } = useSWR<FavoriteItem[]>(
    swrKey,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 2000,
      fallbackData: []
    }
  )

  const addFavorite = async (itemId: string, itemName: string, itemGrade: string, itemCategory: string, iconUrl?: string) => {
    if (!isReady || !characterId) return null

    try {
      const res = await fetch('/api/ledger/favorite-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          characterId,
          item_id: itemId,
          item_name: itemName,
          item_grade: itemGrade,
          item_category: itemCategory,
          icon_url: iconUrl || null
        })
      })

      if (!res.ok) {
        throw new Error('Failed to add favorite')
      }

      const newFavorite = await res.json()
      // 낙관적 업데이트
      await mutate([...favorites, newFavorite], { revalidate: true })
      return newFavorite
    } catch (e: any) {
      console.error('Add favorite error:', e)
      return null
    }
  }

  const removeFavorite = async (id: string) => {
    if (!isReady) return false

    try {
      // 낙관적 업데이트: 먼저 UI에서 제거
      const filtered = favorites.filter(f => f.id !== id)
      await mutate(filtered, false)

      const res = await fetch(`/api/ledger/favorite-items?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      })

      if (!res.ok) {
        await mutate()  // 실패 시 원복
        throw new Error('Failed to remove favorite')
      }

      return true
    } catch (e: any) {
      console.error('Remove favorite error:', e)
      return false
    }
  }

  const isFavorite = useCallback((itemId: string) => {
    return favorites.some(f => f.item_id === itemId)
  }, [favorites])

  return {
    favorites,
    isLoading,
    error: error?.message || null,
    addFavorite,
    removeFavorite,
    isFavorite,
    refetch: mutate
  }
}
