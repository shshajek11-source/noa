'use client'

import { useState, useEffect, useCallback } from 'react'
import { LedgerItem, CreateItemRequest, ItemCategory } from '@/types/ledger'

interface UseLedgerItemsProps {
  getAuthHeader: () => Record<string, string>
  isReady: boolean
  characterId: string | null
}

export function useLedgerItems({ getAuthHeader, isReady, characterId }: UseLedgerItemsProps) {
  const [items, setItems] = useState<LedgerItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<ItemCategory | 'all'>('all')

  const fetchItems = useCallback(async () => {
    if (!characterId) return

    setIsLoading(true)
    try {
      const params = new URLSearchParams({ characterId })
      if (filter !== 'all') {
        params.append('category', filter)
      }

      const res = await fetch(`/api/ledger/items?${params}`, {
        headers: getAuthHeader()
      })
      if (res.ok) {
        const data = await res.json()
        setItems(data)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsLoading(false)
    }
  }, [characterId, filter, getAuthHeader])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const addItem = async (item: CreateItemRequest) => {
    console.log('[useLedgerItems] addItem called', { isReady, characterId, item })

    if (!isReady || !characterId) {
      console.log('[useLedgerItems] addItem skipped - not ready or no characterId')
      return null
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      }
      const body = {
        ...item,
        characterId
      }
      console.log('[useLedgerItems] POST /api/ledger/items', { headers, body })

      const res = await fetch('/api/ledger/items', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })

      console.log('[useLedgerItems] Response status:', res.status)

      if (!res.ok) {
        const errorText = await res.text()
        console.error('[useLedgerItems] Error response:', errorText)
        throw new Error(`Failed to add item: ${errorText}`)
      }

      const newItem = await res.json()
      console.log('[useLedgerItems] Item added successfully:', newItem)
      setItems(prev => [newItem, ...prev])
      return newItem
    } catch (e: any) {
      console.error('[useLedgerItems] addItem error:', e)
      setError(e.message)
      return null
    }
  }

  const updateItem = async (id: string, data: Partial<LedgerItem>) => {
    if (!isReady) return null

    try {
      const res = await fetch('/api/ledger/items', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ id, ...data })
      })

      if (!res.ok) {
        throw new Error('Failed to update item')
      }

      const updated = await res.json()
      setItems(prev => prev.map(i => i.id === id ? updated : i))
      return updated
    } catch (e: any) {
      setError(e.message)
      return null
    }
  }

  const sellItem = async (id: string, soldPrice?: number) => {
    if (!isReady) return null

    try {
      const res = await fetch('/api/ledger/items', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          id,
          sold_price: soldPrice,
          sold_date: new Date().toISOString()
        })
      })

      if (!res.ok) {
        throw new Error('Failed to update item')
      }

      const updated = await res.json()
      setItems(prev => prev.map(i => i.id === id ? updated : i))
      return updated
    } catch (e: any) {
      setError(e.message)
      return null
    }
  }

  const deleteItem = async (id: string) => {
    if (!isReady) return false

    try {
      const res = await fetch(`/api/ledger/items?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      })

      if (!res.ok) {
        throw new Error('Failed to delete item')
      }

      setItems(prev => prev.filter(i => i.id !== id))
      return true
    } catch (e: any) {
      setError(e.message)
      return false
    }
  }

  // 미판매 아이템만 필터
  const unsoldItems = items.filter(i => i.sold_price === null)

  // 판매완료 아이템만 필터
  const soldItems = items.filter(i => i.sold_price !== null)

  // 판매 수입 합계
  const totalSoldIncome = soldItems.reduce((sum, i) => sum + (i.sold_price || 0), 0)

  return {
    items,
    unsoldItems,
    soldItems,
    isLoading,
    error,
    filter,
    setFilter,
    addItem,
    updateItem,
    sellItem,
    deleteItem,
    totalSoldIncome,
    refetch: fetchItems
  }
}
