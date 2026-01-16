'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Search, UserPlus } from 'lucide-react'
import styles from '../ledger.module.css'
import { SERVERS, SERVER_MAP } from '@/app/constants/servers'
import { RACES, CLASSES } from '@/app/constants/game-data'
import { supabaseApi } from '@/lib/supabaseApi'

// pcId를 직업명으로 변환 (각 직업당 4개 변형 존재)
const PC_ID_MAP: { [key: number]: string } = {
  // 검성 (Gladiator)
  6: '검성', 7: '검성', 8: '검성', 9: '검성',
  // 수호성 (Templar)
  10: '수호성', 11: '수호성', 12: '수호성', 13: '수호성',
  // 궁성 (Ranger)
  14: '궁성', 15: '궁성', 16: '궁성', 17: '궁성',
  // 살성 (Assassin)
  18: '살성', 19: '살성', 20: '살성', 21: '살성',
  // 정령성 (Spiritmaster)
  22: '정령성', 23: '정령성', 24: '정령성', 25: '정령성',
  // 마도성 (Sorcerer)
  26: '마도성', 27: '마도성', 28: '마도성', 29: '마도성',
  // 치유성 (Cleric)
  30: '치유성', 31: '치유성', 32: '치유성', 33: '치유성',
  // 호법성 (Chanter)
  34: '호법성', 35: '호법성', 36: '호법성', 37: '호법성'
}

function getClassName(pcId: number): string {
  return PC_ID_MAP[pcId] || '알 수 없음'
}

// 디바운스 훅
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

interface SearchResult {
  character_id: string
  name: string
  level: number
  class_name: string
  server_name: string
  server_id?: string
  race?: string
  profile_image?: string
  item_level?: number
}

interface AddCharacterModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (character: {
    name: string
    class_name: string
    server_name: string
    character_id?: string
    profile_image?: string
    race?: string
    item_level?: number
  }) => void
}

export default function AddCharacterModal({
  isOpen,
  onClose,
  onAdd
}: AddCharacterModalProps) {
  const [server, setServer] = useState('')
  const [race, setRace] = useState('')
  const [name, setName] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [error, setError] = useState('')

  // 디바운스된 검색어
  const debouncedName = useDebounce(name, 300)

  // 자동 검색
  useEffect(() => {
    if (!isOpen) return
    if (debouncedName.trim().length >= 2) {
      handleSearch()
    } else {
      setSearchResults([])
      setError('')
    }
  }, [debouncedName, server, race, isOpen])

  if (!isOpen) return null

  const handleSearch = async () => {
    const searchName = name.trim()
    if (searchName.length < 2) {
      return
    }

    setIsSearching(true)
    setError('')

    try {
      // 서버 ID와 종족 필터 설정
      const serverId = server ? parseInt(server) : undefined
      const raceFilter = race === 'ELYOS' ? 'elyos' : race === 'ASMODIANS' ? 'asmodian' : undefined

      // 하이브리드 검색: 로컬 DB + 외부 API 동시 호출
      const [localRes, liveRes] = await Promise.allSettled([
        supabaseApi.searchLocalCharacter(searchName, serverId, raceFilter),
        supabaseApi.searchCharacter(searchName, serverId, raceFilter, 1)
      ])

      // 결과 병합 및 중복 제거
      const combined: SearchResult[] = []
      const seen = new Set<string>()

      const addResult = (c: any) => {
        const charId = c.characterId || c.character_id || c.id
        if (!charId || seen.has(charId)) return
        seen.add(charId)

        // HTML 태그 제거
        const cleanName = (c.name || '').replace(/<[^>]*>/g, '')
        // 프로필 이미지 URL 처리
        const rawImg = c.profileImageUrl || c.profile_image || c.profileImage || c.imageUrl || ''
        let profileImg = rawImg
        if (rawImg.startsWith('/')) {
          profileImg = `https://profileimg.plaync.com${rawImg}`
        }
        // 종족 처리
        const raceValue = c.race === 1 ? '천족' : c.race === 2 ? '마족' :
          c.race === 'Elyos' || c.race === '천족' ? '천족' :
          c.race === 'Asmodian' || c.race === '마족' ? '마족' :
          c.race_name || c.raceName || ''

        combined.push({
          character_id: charId,
          name: cleanName,
          level: c.level || 0,
          class_name: c.class_name || c.className || c.job || getClassName(c.pcId),
          server_name: c.serverName || c.server_name || c.server || SERVER_MAP[c.serverId || c.server_id] || '알 수 없음',
          server_id: String(c.serverId || c.server_id || ''),
          race: raceValue,
          profile_image: profileImg,
          item_level: c.itemLevel || c.item_level || 0
        })
      }

      // 로컬 DB 결과 먼저 추가 (더 빠름)
      if (localRes.status === 'fulfilled') {
        localRes.value.forEach(addResult)
      }

      // 외부 API 결과 추가
      if (liveRes.status === 'fulfilled') {
        liveRes.value.list.forEach(addResult)
      }

      if (combined.length > 0) {
        setSearchResults(combined.slice(0, 10))
        setError('')
      } else {
        setSearchResults([])
        setError('검색 결과가 없습니다')
      }
    } catch (e) {
      console.error('Search error:', e)
      setError('검색 중 오류가 발생했습니다')
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelect = (result: SearchResult) => {
    onAdd({
      name: result.name,
      class_name: result.class_name,
      server_name: result.server_name,
      character_id: result.character_id,
      profile_image: result.profile_image,
      race: result.race,
      item_level: result.item_level
    })
    handleClose()
  }

  const handleManualAdd = () => {
    if (!name.trim()) {
      setError('캐릭터 이름을 입력해주세요')
      return
    }

    const selectedServer = SERVERS.find(s => s.id === server)
    const selectedRace = RACES.find(r => r.id === race)

    onAdd({
      name: name.trim(),
      class_name: 'Unknown',
      server_name: selectedServer?.name || '알 수 없음',
      race: selectedRace?.id
    })
    handleClose()
  }

  const handleClose = () => {
    setServer('')
    setRace('')
    setName('')
    setSearchResults([])
    setError('')
    onClose()
  }

  return (
    <div className={styles.modal} onClick={handleClose} style={{ alignItems: 'flex-start', paddingTop: '10vh' }}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            <UserPlus size={20} style={{ marginRight: 8 }} />
            캐릭터 등록
          </h3>
          <button className={styles.modalClose} onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* 종족 선택 버튼 */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>종족</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => { setRace('ELYOS'); setServer(''); }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                  background: race === 'ELYOS' ? '#3b82f6' : '#27282e',
                  color: race === 'ELYOS' ? '#fff' : '#a5a8b4'
                }}
              >
                천족
              </button>
              <button
                type="button"
                onClick={() => { setRace('ASMODIANS'); setServer(''); }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                  background: race === 'ASMODIANS' ? '#ef4444' : '#27282e',
                  color: race === 'ASMODIANS' ? '#fff' : '#a5a8b4'
                }}
              >
                마족
              </button>
            </div>
          </div>

          {/* 서버 선택 (종족 선택 후 표시) */}
          {race && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>서버 {server && `- ${SERVER_MAP[server]}`}</label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 6,
                maxHeight: '160px',
                overflowY: 'auto',
                padding: '4px',
                background: '#1a1d24',
                borderRadius: 8,
                border: '1px solid #27282e'
              }}>
                {SERVERS
                  .filter(s => race === 'ELYOS' ? s.id.startsWith('1') : s.id.startsWith('2'))
                  .map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setServer(s.id)}
                      style={{
                        padding: '8px 4px',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: server === s.id ? 600 : 400,
                        transition: 'all 0.15s',
                        background: server === s.id
                          ? (race === 'ELYOS' ? '#3b82f6' : '#ef4444')
                          : '#27282e',
                        color: server === s.id ? '#fff' : '#a5a8b4'
                      }}
                    >
                      {s.name}
                    </button>
                  ))}
              </div>
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>캐릭터 이름</label>
            <input
              type="text"
              className={styles.formInput}
              placeholder="2글자 이상 입력하면 자동 검색"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {error && (
            <p style={{ color: '#e52f28', fontSize: 13, marginBottom: 12 }}>
              {error}
            </p>
          )}

          {isSearching && (
            <div className={styles.loading}>검색 중...</div>
          )}

          {searchResults.length > 0 && (
            <div className={styles.searchResults}>
              {searchResults.map((result) => (
                <div
                  key={result.character_id}
                  className={styles.searchResult}
                  onClick={() => handleSelect(result)}
                >
                  {result.profile_image ? (
                    <img
                      src={result.profile_image}
                      alt={result.name}
                      className={styles.searchResultAvatar}
                      onError={(e) => {
                        // 이미지 로드 실패 시 기본 아바타로 대체
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextElementSibling?.classList.remove(styles.hidden)
                      }}
                    />
                  ) : null}
                  <div
                    className={`${styles.searchResultAvatar} ${result.profile_image ? styles.hidden : ''}`}
                    style={{
                      background: '#27282e',
                      display: result.profile_image ? 'none' : 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#a5a8b4'
                    }}
                  >
                    {result.name[0]}
                  </div>
                  <div className={styles.searchResultInfo}>
                    <div className={styles.searchResultName}>
                      {result.name}
                      {result.race && (
                        <span style={{
                          marginLeft: 8,
                          fontSize: 11,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: result.race === '천족' ? '#3b82f6' : '#ef4444',
                          color: '#fff'
                        }}>
                          {result.race}
                        </span>
                      )}
                    </div>
                    <div className={styles.searchResultMeta}>
                      Lv.{result.level} · {result.class_name} · {result.server_name}
                      {result.item_level ? ` · 아이템 ${result.item_level}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnSecondary} onClick={handleClose}>
            취소
          </button>
          <button
            className={styles.btnPrimary}
            onClick={handleManualAdd}
            disabled={!name.trim()}
          >
            수동 등록
          </button>
        </div>
      </div>
    </div>
  )
}
