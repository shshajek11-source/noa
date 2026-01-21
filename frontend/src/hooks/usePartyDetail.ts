'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { PartyPost, PartyComment } from '@/types/party'

// 인증 헤더 가져오기 (Bearer 토큰만 사용)
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {}

  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  return headers
}

interface PartyDetailResponse extends PartyPost {
  comments: PartyComment[]
  is_member: boolean
  is_leader: boolean
  current_user_id: string  // 현재 요청자의 ID
  current_members: number
  pending_count: number
}

export function usePartyDetail(partyId: string | null) {
  const [party, setParty] = useState<PartyDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchParty = useCallback(async () => {
    if (!partyId) {
      setParty(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/party/${partyId}`, { headers })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch party')
      }

      const data: PartyDetailResponse = await response.json()
      setParty(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [partyId])

  useEffect(() => {
    fetchParty()
  }, [fetchParty])

  // 신청하기
  const apply = useCallback(async (applicationData: {
    slot_id: string
    character_name: string
    character_class: string
    character_server_id: number
    character_level?: number
    character_item_level?: number
    character_breakthrough?: number
    profile_image?: string
    character_combat_power?: number
    character_equipment?: Record<string, unknown>
    character_stats?: Record<string, unknown>
    apply_message?: string
  }) => {
    if (!partyId) throw new Error('Party ID is required')

    const headers = await getAuthHeaders()
    const response = await fetch(`/api/party/${partyId}/apply`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(applicationData)
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to apply')
    }

    await fetchParty()
    return response.json()
  }, [partyId, fetchParty])

  // 신청 취소
  const cancelApplication = useCallback(async () => {
    if (!partyId) throw new Error('Party ID is required')

    const headers = await getAuthHeaders()
    const response = await fetch(`/api/party/${partyId}/apply`, {
      method: 'DELETE',
      headers
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to cancel')
    }

    await fetchParty()
    return response.json()
  }, [partyId, fetchParty])

  // 승인
  const approve = useCallback(async (memberId: string) => {
    if (!partyId) throw new Error('Party ID is required')

    const headers = await getAuthHeaders()
    const response = await fetch(`/api/party/${partyId}/approve`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ member_id: memberId })
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to approve')
    }

    await fetchParty()
    return response.json()
  }, [partyId, fetchParty])

  // 거절
  const reject = useCallback(async (memberId: string, reason?: string) => {
    if (!partyId) throw new Error('Party ID is required')

    const headers = await getAuthHeaders()
    const response = await fetch(`/api/party/${partyId}/reject`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ member_id: memberId, reason, is_kick: false })
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to reject')
    }

    await fetchParty()
    return response.json()
  }, [partyId, fetchParty])

  // 추방
  const kick = useCallback(async (memberId: string, reason?: string) => {
    if (!partyId) throw new Error('Party ID is required')

    const headers = await getAuthHeaders()
    const response = await fetch(`/api/party/${partyId}/reject`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ member_id: memberId, reason, is_kick: true })
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to kick')
    }

    await fetchParty()
    return response.json()
  }, [partyId, fetchParty])

  // 댓글 작성
  const addComment = useCallback(async (content: string) => {
    if (!partyId) throw new Error('Party ID is required')

    const headers = await getAuthHeaders()
    const response = await fetch(`/api/party/${partyId}/comments`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content })
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to add comment')
    }

    await fetchParty()
    return response.json()
  }, [partyId, fetchParty])

  // 파티 수정
  const updateParty = useCallback(async (updateData: Partial<PartyPost>) => {
    if (!partyId) throw new Error('Party ID is required')

    const headers = await getAuthHeaders()
    const response = await fetch(`/api/party/${partyId}`, {
      method: 'PATCH',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to update party')
    }

    await fetchParty()
    return response.json()
  }, [partyId, fetchParty])

  // 파티 삭제/취소
  const deleteParty = useCallback(async () => {
    if (!partyId) throw new Error('Party ID is required')

    const headers = await getAuthHeaders()
    const response = await fetch(`/api/party/${partyId}`, {
      method: 'DELETE',
      headers
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to delete party')
    }

    return response.json()
  }, [partyId])

  return {
    party,
    loading,
    error,
    refresh: fetchParty,
    apply,
    cancelApplication,
    approve,
    reject,
    kick,
    addComment,
    updateParty,
    deleteParty
  }
}
