'use client'

import { useState, useEffect, useCallback } from 'react'
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

export function usePartyList(initialParams?: PartyListParams) {
  const [parties, setParties] = useState<PartyPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })
  const [params, setParams] = useState<PartyListParams>(initialParams || {})

  const fetchParties = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const searchParams = new URLSearchParams()
      if (params.status) searchParams.set('status', params.status)
      if (params.dungeon_type) searchParams.set('dungeon_type', params.dungeon_type)
      if (params.is_immediate !== undefined) searchParams.set('is_immediate', String(params.is_immediate))
      if (params.page) searchParams.set('page', String(params.page))
      if (params.limit) searchParams.set('limit', String(params.limit))

      const response = await fetch(`/api/party?${searchParams.toString()}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch parties')
      }

      const data: PartyListResponse = await response.json()
      setParties(data.parties)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    fetchParties()
  }, [fetchParties])

  const updateParams = useCallback((newParams: Partial<PartyListParams>) => {
    setParams(prev => ({ ...prev, ...newParams }))
  }, [])

  const refresh = useCallback(() => {
    fetchParties()
  }, [fetchParties])

  return {
    parties,
    loading,
    error,
    pagination,
    params,
    updateParams,
    refresh
  }
}
