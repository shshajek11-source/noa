'use client'

import useSWR from 'swr'
import { useState, useCallback, useMemo } from 'react'
import { LedgerItem, CreateItemRequest, ItemCategory } from '@/types/ledger'
import { getKoreanGameDateTime } from '@/lib/koreanDate'

interface UseLedgerItemsProps {
  getAuthHeader: () => Record<string, string>
  isReady: boolean
  characterId: string | null
  selectedDate?: string  // 선택한 날짜 (판매 수입 필터용)
}

export function useLedgerItems({ getAuthHeader, isReady, characterId, selectedDate }: UseLedgerItemsProps) {
  const [filter, setFilter] = useState<ItemCategory | 'all'>('all')

  // SWR fetcher
  const fetcher = useCallback(async (url: string) => {
    const res = await fetch(url, {
      headers: getAuthHeader()
    })
    if (!res.ok) {
      throw new Error('Failed to fetch items')
    }
    return res.json()
  }, [getAuthHeader])

  // SWR key 생성
  const swrKey = useMemo(() => {
    if (!characterId) return null
    const params = new URLSearchParams({ characterId })
    if (filter !== 'all') {
      params.append('category', filter)
    }
    return `/api/ledger/items?${params}`
  }, [characterId, filter])

  // SWR hook
  const { data: items = [], error, isLoading, mutate } = useSWR<LedgerItem[]>(
    swrKey,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 2000
    }
  )

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

      // 낙관적 업데이트: 즉시 UI 반영
      await mutate([newItem, ...items], {
        revalidate: true
      })

      return newItem
    } catch (e: any) {
      console.error('[useLedgerItems] addItem error:', e)
      return null
    }
  }

  const updateItem = async (id: string, data: Partial<LedgerItem>) => {
    if (!isReady) return null

    try {
      // 낙관적 업데이트
      const optimisticItems = items.map(i => i.id === id ? { ...i, ...data } : i)
      await mutate(optimisticItems, false)

      const res = await fetch('/api/ledger/items', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ id, ...data })
      })

      if (!res.ok) {
        await mutate()  // 실패 시 원복
        throw new Error('Failed to update item')
      }

      const updated = await res.json()
      await mutate(items.map(i => i.id === id ? updated : i), { revalidate: true })
      return updated
    } catch (e: any) {
      console.error('[useLedgerItems] updateItem error:', e)
      return null
    }
  }

  const sellItem = async (id: string, soldPrice?: number) => {
    if (!isReady) return null

    try {
      const soldDate = getKoreanGameDateTime()

      // 낙관적 업데이트
      const optimisticItems = items.map(i =>
        i.id === id ? { ...i, sold_price: soldPrice, sold_date: soldDate } : i
      )
      await mutate(optimisticItems, false)

      const res = await fetch('/api/ledger/items', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          id,
          sold_price: soldPrice,
          sold_date: soldDate
        })
      })

      if (!res.ok) {
        await mutate()  // 실패 시 원복
        throw new Error('Failed to update item')
      }

      const updated = await res.json()
      await mutate(items.map(i => i.id === id ? updated : i), { revalidate: true })
      return updated
    } catch (e: any) {
      console.error('[useLedgerItems] sellItem error:', e)
      return null
    }
  }

  const unsellItem = async (id: string) => {
    if (!isReady) return null

    try {
      // 낙관적 업데이트
      const optimisticItems = items.map(i =>
        i.id === id ? { ...i, sold_price: null, sold_date: null } : i
      )
      await mutate(optimisticItems, false)

      const res = await fetch('/api/ledger/items', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          id,
          sold_price: null,
          sold_date: null
        })
      })

      if (!res.ok) {
        await mutate()  // 실패 시 원복
        throw new Error('Failed to unsell item')
      }

      const updated = await res.json()
      await mutate(items.map(i => i.id === id ? updated : i), { revalidate: true })
      return updated
    } catch (e: any) {
      console.error('[useLedgerItems] unsellItem error:', e)
      return null
    }
  }

  const deleteItem = async (id: string) => {
    if (!isReady) return false

    try {
      // 낙관적 업데이트: 먼저 UI에서 제거
      const filteredItems = items.filter(i => i.id !== id)
      await mutate(filteredItems, false)

      const res = await fetch(`/api/ledger/items?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      })

      if (!res.ok) {
        await mutate()  // 실패 시 원복
        throw new Error('Failed to delete item')
      }

      // 삭제 후 서버에서 재검증
      await mutate(undefined, { revalidate: true })

      return true
    } catch (e: any) {
      console.error('[useLedgerItems] deleteItem error:', e)
      return false
    }
  }

  // 미판매 아이템만 필터
  const unsoldItems = useMemo(() => items.filter(i => i.sold_price === null), [items])

  // 판매완료 아이템만 필터
  const soldItems = useMemo(() => items.filter(i => i.sold_price !== null), [items])

  // 전체 판매 수입 합계
  const totalSoldIncome = useMemo(() =>
    soldItems.reduce((sum, i) => sum + (i.sold_price || 0), 0),
    [soldItems]
  )

  // 선택한 날짜의 판매 수입 (sold_date 기준)
  const selectedDateSoldIncome = useMemo(() =>
    selectedDate
      ? soldItems
          .filter(i => i.sold_date?.split('T')[0] === selectedDate)
          .reduce((sum, i) => sum + (i.sold_price || 0), 0)
      : 0,
    [soldItems, selectedDate]
  )

  // 기존 인터페이스 100% 유지
  return {
    items,
    unsoldItems,
    soldItems,
    isLoading,
    error: error?.message || null,
    filter,
    setFilter,
    addItem,
    updateItem,
    sellItem,
    unsellItem,
    deleteItem,
    totalSoldIncome,
    selectedDateSoldIncome,
    refetch: mutate
  }
}
