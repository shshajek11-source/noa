'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { PartyPost } from '@/types/party'

interface MyPartiesResponse {
  created: (PartyPost & { pending_count: number })[]
  joined: (PartyPost & { my_member: { id: string; slot_id: string; character_name: string; character_class: string; role: string } })[]
  pending: (PartyPost & { my_application: { id: string; slot_id: string; character_name: string; character_class: string; applied_at: string } })[]
  counts: {
    created: number
    joined: number
    pending: number
    total: number
  }
}

export function useMyParties() {
  const [data, setData] = useState<MyPartiesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMyParties = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Google 로그인 세션에서 Bearer 토큰만 사용
      const { data: { session } } = await supabase.auth.getSession()

      // 세션이 없으면 빈 데이터 반환
      if (!session?.access_token) {
        setData({
          created: [],
          joined: [],
          pending: [],
          counts: { created: 0, joined: 0, pending: 0, total: 0 }
        })
        setLoading(false)
        return
      }

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${session.access_token}`
      }

      const response = await fetch('/api/party/my', { headers })

      if (!response.ok) {
        const res = await response.json()
        throw new Error(res.error || 'Failed to fetch my parties')
      }

      const result: MyPartiesResponse = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      // 에러 시에도 빈 데이터로 초기화
      setData({
        created: [],
        joined: [],
        pending: [],
        counts: { created: 0, joined: 0, pending: 0, total: 0 }
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMyParties()
  }, [fetchMyParties])

  return {
    created: data?.created || [],
    joined: data?.joined || [],
    pending: data?.pending || [],
    counts: data?.counts || { created: 0, joined: 0, pending: 0, total: 0 },
    loading,
    error,
    refresh: fetchMyParties
  }
}
