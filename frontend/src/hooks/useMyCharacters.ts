'use client'

import { useState, useEffect, useCallback } from 'react'
import type { PartyUserCharacter } from '@/types/party'
import { CharacterSearchResult } from '@/lib/supabaseApi'

interface UseMyCharactersOptions {
  accessToken?: string | null
}

export function useMyCharacters(options: UseMyCharactersOptions = {}) {
  const { accessToken } = options
  const [characters, setCharacters] = useState<PartyUserCharacter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCharacters = useCallback(async () => {
    // 로그인 필수: accessToken이 없으면 빈 배열 반환
    if (!accessToken) {
      console.log('[useMyCharacters] No accessToken, returning empty array')
      setCharacters([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('[useMyCharacters] Fetching characters...')
      const response = await fetch('/api/party/my-characters', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        cache: 'no-store'  // 캐시 방지
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch characters')
      }

      const data = await response.json()
      console.log('[useMyCharacters] Fetched characters:', data.characters?.length || 0)
      setCharacters(data.characters || [])
    } catch (err) {
      console.error('[useMyCharacters] Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    fetchCharacters()
  }, [fetchCharacters])

  // 캐릭터 추가
  const addCharacter = useCallback(async (characterData: {
    character_id?: string
    character_name: string
    character_class: string
    character_server_id: number
    character_level?: number
    character_item_level?: number
    character_breakthrough?: number
    character_combat_power?: number
    character_pve_score?: number
    character_pvp_score?: number
    profile_image?: string
  }) => {
    if (!accessToken) {
      throw new Error('로그인이 필요합니다.')
    }
    const response = await fetch('/api/party/my-characters', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(characterData)
    })

    if (!response.ok) {
      let errorMessage = 'Failed to add character'
      try {
        const data = await response.json()
        errorMessage = data.error || errorMessage
      } catch {
        // JSON 파싱 실패 시 텍스트로 읽기
        const text = await response.text().catch(() => '')
        if (text) errorMessage = text.slice(0, 100)
      }
      throw new Error(errorMessage)
    }

    await fetchCharacters()
    return response.json()
  }, [accessToken, fetchCharacters])

  // 캐릭터 수정
  const updateCharacter = useCallback(async (
    id: string,
    updateData: Partial<PartyUserCharacter>
  ) => {
    if (!accessToken) {
      throw new Error('로그인이 필요합니다.')
    }
    const response = await fetch('/api/party/my-characters', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ id, ...updateData })
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to update character')
    }

    await fetchCharacters()
    return response.json()
  }, [accessToken, fetchCharacters])

  // 캐릭터 삭제
  const deleteCharacter = useCallback(async (id: string) => {
    if (!accessToken) {
      throw new Error('로그인이 필요합니다.')
    }
    const response = await fetch(`/api/party/my-characters?id=${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to delete character')
    }

    await fetchCharacters()
    return response.json()
  }, [accessToken, fetchCharacters])

  // 검색 결과에서 캐릭터 등록 (상세 정보 가져와서 등록)
  const registerFromSearch = useCallback(async (character: CharacterSearchResult) => {
    // serverId 추출 (다양한 필드명 대응)
    const serverId = character.serverId ?? character.server_id
    let className = character.className ?? character.job ?? ''
    const charName = character.name.replace(/<\/?[^>]+(>|$)/g, '').trim()
    // 프로필 이미지 추출
    const profileImage = character.imageUrl || character.profileImage || undefined

    if (!serverId) {
      throw new Error('서버 정보가 없습니다.')
    }

    let breakthrough = 0
    let itemLevel = character.item_level
    let combatPower: number | undefined
    let pveScore: number | undefined
    let pvpScore: number | undefined
    let level = character.level

    // 1. 캐릭터 상세 정보 가져오기 (돌파 정보 포함)
    try {
      const detailResponse = await fetch(
        `/api/character?id=${encodeURIComponent(character.characterId)}&server=${serverId}`
      )

      if (detailResponse.ok) {
        const detailData = await detailResponse.json()

        // 직업 정보가 없으면 상세 정보에서 가져오기
        if (!className && detailData.profile?.className) {
          className = detailData.profile.className
        }

        // 장비에서 돌파 총합 계산
        if (detailData.equipment?.equipmentList) {
          breakthrough = detailData.equipment.equipmentList.reduce((sum: number, item: { exceedLevel?: number }) => {
            return sum + (item.exceedLevel || 0)
          }, 0)
        }

        // 전투력: pve_score, pvp_score 사용
        if (detailData.profile?.pve_score) {
          pveScore = detailData.profile.pve_score
          combatPower = pveScore // 기존 호환성을 위해 PVE를 기본값으로
        }
        if (detailData.profile?.pvp_score) {
          pvpScore = detailData.profile.pvp_score
        }

        // 아이템레벨: statList에서 가져오기
        if (detailData.stats?.statList) {
          const itemLevelStat = detailData.stats.statList.find((s: { name?: string; type?: string }) =>
            s.name === '아이템레벨' || s.type === 'ItemLevel'
          )
          if (itemLevelStat?.value !== undefined) {
            itemLevel = itemLevelStat.value
          }
        }

        // 레벨 정보
        if (detailData.profile?.characterLevel) {
          level = detailData.profile.characterLevel
        }
      }
    } catch (err) {
      console.warn('[registerFromSearch] 상세 정보 조회 실패:', err)
      // 상세 정보 조회 실패해도 기본 정보로 등록 시도
    }

    // 직업 정보가 여전히 없으면 에러
    if (!className) {
      throw new Error('직업 정보를 가져올 수 없습니다.')
    }

    // 2. 캐릭터 등록
    await addCharacter({
      character_id: character.characterId,
      character_name: charName,
      character_class: className,
      character_server_id: serverId,
      character_level: level,
      character_item_level: itemLevel,
      character_breakthrough: breakthrough,
      character_combat_power: combatPower,
      character_pve_score: pveScore,
      character_pvp_score: pvpScore,
      profile_image: profileImage
    })
  }, [addCharacter])

  // 캐릭터 정보 갱신 (최신 스펙 불러오기)
  const refreshCharacter = useCallback(async (id: string, characterId: string, serverId: number) => {
    // 1. 캐릭터 상세 정보 가져오기
    const detailResponse = await fetch(
      `/api/character?id=${encodeURIComponent(characterId)}&server=${serverId}`
    )

    if (!detailResponse.ok) {
      throw new Error('캐릭터 정보를 가져올 수 없습니다.')
    }

    const detailData = await detailResponse.json()

    // 2. 돌파 총합 계산
    let breakthrough = 0
    if (detailData.equipment?.equipmentList) {
      breakthrough = detailData.equipment.equipmentList.reduce((sum: number, item: { exceedLevel?: number }) => {
        return sum + (item.exceedLevel || 0)
      }, 0)
    }

    // 3. 아이템레벨, 전투력, 직업 정보, 프로필 이미지 가져오기
    let itemLevel: number | undefined
    let combatPower: number | undefined
    let pveScore: number | undefined
    let pvpScore: number | undefined
    let className: string | undefined
    let profileImage: string | undefined

    // 직업 정보
    if (detailData.profile?.className) {
      className = detailData.profile.className
    }

    // 프로필 이미지 (캐릭터 상세 페이지에서 가져온 이미지)
    if (detailData.profile_image || detailData.profile?.profileImage) {
      profileImage = detailData.profile_image || detailData.profile?.profileImage
    }

    // 전투력: pve_score, pvp_score 사용
    if (detailData.profile?.pve_score) {
      pveScore = detailData.profile.pve_score
      combatPower = pveScore // 기존 호환성을 위해 PVE를 기본값으로
    }
    if (detailData.profile?.pvp_score) {
      pvpScore = detailData.profile.pvp_score
    }

    // 아이템레벨: statList에서 가져오기
    if (detailData.stats?.statList) {
      const itemLevelStat = detailData.stats.statList.find((s: { name?: string; type?: string }) =>
        s.name === '아이템레벨' || s.type === 'ItemLevel'
      )
      if (itemLevelStat?.value !== undefined) {
        itemLevel = itemLevelStat.value
      }
    }

    // 4. 캐릭터 정보 업데이트 (직업 정보, 프로필 이미지 포함)
    const updateData: Record<string, unknown> = {
      character_level: detailData.profile?.characterLevel,
      character_item_level: itemLevel,
      character_breakthrough: breakthrough,
      character_combat_power: combatPower,
      character_pve_score: pveScore,
      character_pvp_score: pvpScore
    }

    // 직업 정보가 있으면 업데이트
    if (className) {
      updateData.character_class = className
    }

    // 프로필 이미지가 있으면 업데이트
    if (profileImage) {
      updateData.profile_image = profileImage
    }

    await updateCharacter(id, updateData)

    return { success: true }
  }, [updateCharacter])

  return {
    characters,
    loading,
    error,
    refresh: fetchCharacters,
    addCharacter,
    updateCharacter,
    deleteCharacter,
    registerFromSearch,
    refreshCharacter
  }
}
