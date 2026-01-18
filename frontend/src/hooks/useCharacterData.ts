'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDataCache, clearCacheByPattern } from './useDataCache'
import { supabaseApi, SERVER_NAME_TO_ID, getApiBaseUrl } from '@/lib/supabaseApi'
import { normalizeCharacterId } from '@/lib/characterId'

interface CharacterProfile {
  characterId: string
  characterName: string
  serverName: string
  className: string
  characterLevel: number
  raceName: string
  profileImage: string
  jobLevel: number
  [key: string]: any
}

interface CharacterDetailData {
  profile: CharacterProfile
  stats: any
  equipment: any
  titles: any
  daevanion: any
  skill: any
  rankings: any
  petwing: any
  appearance: any
  [key: string]: any
}

interface OcrStat {
  name: string
  value: number
  source: string
}

interface UseCharacterDataOptions {
  serverName: string
  characterName: string
  race?: string
  enabled?: boolean
}

interface UseCharacterDataResult {
  data: CharacterDetailData | null
  ocrStats: OcrStat[] | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * 캐릭터 상세 데이터를 가져오는 훅 (캐싱 적용)
 *
 * 특징:
 * - 캐릭터 데이터 5분간 캐싱
 * - 검색 API + 상세 API + OCR API 병렬 호출
 * - 재방문 시 캐시된 데이터 즉시 표시
 *
 * @example
 * const { data, ocrStats, isLoading, error, refresh } = useCharacterData({
 *   serverName: '지켈',
 *   characterName: '도룽뇽',
 *   enabled: true
 * })
 */
export function useCharacterData({
  serverName,
  characterName,
  race,
  enabled = true
}: UseCharacterDataOptions): UseCharacterDataResult {
  const cacheKey = `character-detail-${serverName}-${characterName}`

  const [data, setData] = useState<CharacterDetailData | null>(null)
  const [ocrStats, setOcrStats] = useState<OcrStat[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCharacterData = useCallback(async (forceRefresh = false) => {
    if (!serverName || !characterName) return

    setIsLoading(true)
    setError(null)

    try {
      // Step 1: 캐릭터 검색
      const targetSearchServerId = SERVER_NAME_TO_ID[serverName]
      const searchResponse = await supabaseApi.searchCharacter(characterName, targetSearchServerId, race)
      const searchResults = searchResponse.list

      // 서버 매칭
      const match = searchResults.find(r => {
        if (targetSearchServerId && r.server_id) {
          return r.server_id === targetSearchServerId
        }
        return r.server === serverName
      })

      if (!match) {
        throw new Error(`'${serverName}' 서버에서 '${characterName}' 캐릭터를 찾을 수 없습니다.`)
      }

      // Step 2: 상세 API와 OCR API 병렬 호출
      const serverId = match.server_id || SERVER_NAME_TO_ID[serverName] || 1
      const encodedCharacterId = encodeURIComponent(match.characterId)
      const forceParam = forceRefresh ? '&force=true' : ''
      const apiUrl = `${getApiBaseUrl()}/api/character?id=${encodedCharacterId}&server=${serverId}${forceParam}`

      const normalizedCharId = normalizeCharacterId(match.characterId)
      const ocrUrl = `/api/character/ocr-stats?characterId=${encodeURIComponent(normalizedCharId)}`

      const [detailRes, ocrRes] = await Promise.all([
        fetch(apiUrl),
        fetch(ocrUrl).catch(() => null)
      ])

      if (!detailRes.ok) {
        throw new Error(`캐릭터 상세 API 호출 실패 (status: ${detailRes.status})`)
      }

      const detail = await detailRes.json()

      if (!detail?.profile) {
        throw new Error('캐릭터 정보가 올바르지 않습니다.')
      }

      setData(detail)

      // OCR 스탯 처리
      if (ocrRes?.ok) {
        const ocrData = await ocrRes.json()
        if (ocrData.stats?.length > 0) {
          setOcrStats(ocrData.stats)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }, [serverName, characterName, race])

  const refresh = useCallback(async () => {
    await fetchCharacterData(true)
  }, [fetchCharacterData])

  useEffect(() => {
    if (enabled && serverName && characterName) {
      fetchCharacterData()
    }
  }, [enabled, serverName, characterName, fetchCharacterData])

  return { data, ocrStats, isLoading, error, refresh }
}

/**
 * 캐릭터 관련 캐시 무효화
 */
export function invalidateCharacterCache(serverName?: string, characterName?: string) {
  if (serverName && characterName) {
    clearCacheByPattern(`character-detail-${serverName}-${characterName}`)
  } else {
    clearCacheByPattern('character-detail-')
  }
}
