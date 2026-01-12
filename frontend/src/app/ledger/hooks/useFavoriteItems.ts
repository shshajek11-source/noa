'use client'

import { useState, useEffect, useCallback } from 'react'
import { FavoriteItem } from '../components/FavoriteItemsPanel'

interface UseFavoriteItemsProps {
  getAuthHeader: () => Record<string, string>
  isReady: boolean
  characterId: string | null
}

export function useFavoriteItems({ getAuthHeader, isReady, characterId }: UseFavoriteItemsProps) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFavorites = useCallback(async () => {
    if (!characterId || !isReady) return

    setIsLoading(true)
    try {
      const res = await fetch(`/api/ledger/favorite-items?characterId=${characterId}`, {
        headers: getAuthHeader()
      })
      if (res.ok) {
        const data = await res.json()
        setFavorites(data)
      } else {
        // If API doesn't exist yet, just use empty array
        setFavorites([])
      }
    } catch (e: any) {
      console.error('Fetch favorites error:', e)
      setFavorites([])
    } finally {
      setIsLoading(false)
    }
  }, [characterId, isReady, getAuthHeader])

  useEffect(() => {
    fetchFavorites()
  }, [fetchFavorites])

  const addFavorite = async (itemId: string, itemName: string, itemGrade: string, itemCategory: string) => {
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
          item_category: itemCategory
        })
      })

      if (!res.ok) {
        throw new Error('Failed to add favorite')
      }

      const newFavorite = await res.json()
      setFavorites(prev => [...prev, newFavorite])
      return newFavorite
    } catch (e: any) {
      setError(e.message)
      console.error('Add favorite error:', e)
      return null
    }
  }

  const removeFavorite = async (id: string) => {
    if (!isReady) return false

    try {
      const res = await fetch(`/api/ledger/favorite-items?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      })

      if (!res.ok) {
        throw new Error('Failed to remove favorite')
      }

      setFavorites(prev => prev.filter(f => f.id !== id))
      return true
    } catch (e: any) {
      setError(e.message)
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
    error,
    addFavorite,
    removeFavorite,
    isFavorite,
    refetch: fetchFavorites
  }
}
