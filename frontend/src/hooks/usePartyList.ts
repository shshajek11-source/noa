'use client'

import useSWR from 'swr'
import { useState, useCallback, useMemo } from 'react'
import type { PartyPost, DungeonType, PartyStatus } from '@/types/party'

interface PartyListParams {
  status?: PartyStatus | 'all'
  dungeon_type?: DungeonType
  is_immediate?: boolean
  page?: number
  limit?: number
}

interface PartyListResponse {
  parties: PartyPost[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// SWR fetcher
const fetcher = async (url: string): Promise<PartyListResponse> => {
  const response = await fetch(url)
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to fetch parties')
  }
  return response.json()
}

export function usePartyList(initialParams?: PartyListParams) {
  const [params, setParams] = useState<PartyListParams>(initialParams || {})

  // SWR key 생성
  const swrKey = useMemo(() => {
    const searchParams = new URLSearchParams()
    if (params.status) searchParams.set('status', params.status)
    if (params.dungeon_type) searchParams.set('dungeon_type', params.dungeon_type)
    if (params.is_immediate !== undefined) searchParams.set('is_immediate', String(params.is_immediate))
    if (params.page) searchParams.set('page', String(params.page))
    if (params.limit) searchParams.set('limit', String(params.limit))
    return `/api/party?${searchParams.toString()}`
  }, [params])

  // SWR hook
  const { data, error, isLoading, mutate } = useSWR<PartyListResponse>(
    swrKey,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 2000
    }
  )

  const updateParams = useCallback((newParams: Partial<PartyListParams>) => {
    setParams(prev => ({ ...prev, ...newParams }))
  }, [])

  const refresh = useCallback(() => {
    mutate()
  }, [mutate])

  // 기존 인터페이스 100% 유지
  return {
    parties: data?.parties || [],
    loading: isLoading,
    error: error?.message || null,
    pagination: data?.pagination || {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0
    },
    params,
    updateParams,
    refresh
  }
}
