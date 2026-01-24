'use client'

import useSWR from 'swr'
import { useCallback } from 'react'
import { LedgerCharacter, CreateCharacterRequest } from '@/types/ledger'

interface UseLedgerCharactersProps {
  getAuthHeader: () => Record<string, string>
  isReady: boolean
}

export function useLedgerCharacters({ getAuthHeader, isReady }: UseLedgerCharactersProps) {
  // SWR fetcher with auth headers
  const fetcher = useCallback(async (url: string) => {
    const res = await fetch(url, {
      headers: getAuthHeader()
    })
    if (!res.ok) {
      throw new Error('Failed to fetch characters')
    }
    return res.json()
  }, [getAuthHeader])

  // SWR hook - isReady가 false면 null key로 요청 안함
  const { data: characters = [], error, isLoading, mutate } = useSWR<LedgerCharacter[]>(
    isReady ? '/api/ledger/characters' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 2000
    }
  )

  const addCharacter = async (character: CreateCharacterRequest) => {
    const headers = getAuthHeader()

    console.log('[useLedgerCharacters] addCharacter 시작:', {
      character,
      headers: Object.keys(headers),
      isReady
    })

    // 인증 헤더가 없으면 에러
    if (Object.keys(headers).length === 0) {
      console.error('[useLedgerCharacters] No auth headers available')
      return null
    }

    try {
      const res = await fetch('/api/ledger/characters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(character)
      })

      console.log('[useLedgerCharacters] API 응답:', res.status, res.statusText)

      if (!res.ok) {
        let errorMessage = `HTTP ${res.status}: ${res.statusText}`
        try {
          const errorData = await res.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // JSON 파싱 실패 무시
        }
        throw new Error(errorMessage)
      }

      const newCharacter = await res.json()
      console.log('[useLedgerCharacters] 캐릭터 추가 성공:', newCharacter)

      // 낙관적 업데이트: 즉시 UI 반영 후 서버 재검증
      await mutate([...characters, newCharacter], {
        revalidate: true  // 서버에서 최신 데이터 다시 가져옴
      })

      return newCharacter
    } catch (e: any) {
      const errorMsg = e?.message || String(e) || '캐릭터 추가에 실패했습니다'
      console.error('[useLedgerCharacters] addCharacter error:', errorMsg, e)
      return null
    }
  }

  const removeCharacter = async (id: string) => {
    if (!isReady) return false

    try {
      // 낙관적 업데이트: 먼저 UI에서 제거
      const filteredCharacters = characters.filter(c => c.id !== id)
      await mutate(filteredCharacters, false)  // 서버 재검증 없이 즉시 반영

      const res = await fetch(`/api/ledger/characters/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      })

      if (!res.ok) {
        // 실패 시 원복
        await mutate()
        throw new Error('Failed to delete character')
      }

      // 성공 시 서버 재검증
      await mutate()
      return true
    } catch (e: any) {
      console.error('[useLedgerCharacters] removeCharacter error:', e.message)
      return false
    }
  }

  // 기존 인터페이스 100% 유지
  return {
    characters,
    isLoading,
    error: error?.message || null,
    addCharacter,
    removeCharacter,
    refetch: mutate  // mutate를 refetch로 alias
  }
}
