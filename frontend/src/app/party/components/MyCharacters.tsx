'use client'

import { useState, useEffect, useRef } from 'react'
import { useMyCharacters } from '@/hooks/useMyCharacters'
import { useCharacterSearch } from '@/hooks/useCharacterSearch'
import { useAuth } from '@/context/AuthContext'
import { CharacterSearchResult } from '@/lib/supabaseApi'
import { SERVERS } from '@/app/constants/servers'
import styles from './MyCharacters.module.css'
import PartyLoginRequired from './PartyLoginRequired'
import BreakthroughBadge from './BreakthroughBadge'


export default function MyCharacters({ isMobile = false }: { isMobile?: boolean }) {
  // 인증 관련
  const { session, isLoading: isAuthLoading, isAuthenticated, signInWithGoogle } = useAuth()

  // CRUD 관련 (useMyCharacters) - accessToken 전달
  const {
    characters,
    loading,
    deleteCharacter,
    registerFromSearch,
    refreshCharacter
  } = useMyCharacters({ accessToken: session?.access_token })

  // 검색 관련 (useCharacterSearch - 상단 검색과 동일한 로직)
  const {
    query: searchName,
    setQuery: setSearchName,
    race: selectedRace,
    setRace: setSelectedRace,
    server: selectedServer,
    setServer: setSelectedServer,
    results: searchResults,
    isSearching: searching,
    showResults,
    setShowResults,
    clearResults: clearSearchResults
  } = useCharacterSearch({ debounceMs: 300, minLength: 1 })

  const wrapperRef = useRef<HTMLDivElement>(null)

  // 등록/갱신 상태
  const [registering, setRegistering] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState<string | null>(null)
  const [refreshingAll, setRefreshingAll] = useState(false)

  // 디버그 상태
  const [showDebug, setShowDebug] = useState(false)
  const [debugData, setDebugData] = useState<unknown>(null)

  // 외부 클릭 감지
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [setShowResults])

  // 종족 변경 시 서버 선택 초기화 (해당 종족에 맞지 않는 서버면 리셋)
  useEffect(() => {
    if (!selectedServer || !selectedRace) return
    const serverObj = SERVERS.find(s => s.name === selectedServer)
    if (!serverObj) return

    const isElyosServer = serverObj.id.startsWith('1')
    const isAsmodianServer = serverObj.id.startsWith('2')

    // 천족 선택했는데 마족 서버면 초기화
    if (selectedRace === 'elyos' && isAsmodianServer) {
      setSelectedServer('')
    }
    // 마족 선택했는데 천족 서버면 초기화
    if (selectedRace === 'asmodian' && isElyosServer) {
      setSelectedServer('')
    }
  }, [selectedRace, selectedServer, setSelectedServer])

  const handleRegister = async (character: CharacterSearchResult) => {
    setRegistering(character.characterId)
    try {
      await registerFromSearch(character)
      setSearchName('')
      setShowResults(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : '등록에 실패했습니다.')
    } finally {
      setRegistering(null)
    }
  }

  const handleRefresh = async (char: typeof characters[0]) => {
    if (!char.character_id) {
      alert('캐릭터 ID가 없어 갱신할 수 없습니다.')
      return
    }
    setRefreshing(char.id)
    try {
      await refreshCharacter(char.id, char.character_id, char.character_server_id)
      alert('스펙이 갱신되었습니다.')
    } catch (err) {
      alert(err instanceof Error ? err.message : '갱신에 실패했습니다.')
    } finally {
      setRefreshing(null)
    }
  }

  // 전체 캐릭터 갱신
  const handleRefreshAll = async () => {
    if (characters.length === 0) return

    setRefreshingAll(true)
    let successCount = 0
    let failCount = 0

    for (const char of characters) {
      if (!char.character_id) {
        failCount++
        continue
      }
      try {
        await refreshCharacter(char.id, char.character_id, char.character_server_id)
        successCount++
      } catch {
        failCount++
      }
    }

    setRefreshingAll(false)

    if (failCount === 0) {
      alert(`${successCount}개 캐릭터 갱신 완료`)
    } else {
      alert(`갱신 완료: ${successCount}개 성공, ${failCount}개 실패`)
    }
  }

  // 디버그: API 응답 확인
  const handleDebugFetch = async (char: typeof characters[0]) => {
    if (!char.character_id) {
      alert('캐릭터 ID가 없습니다.')
      return
    }
    try {
      const response = await fetch(
        `/api/character?id=${encodeURIComponent(char.character_id)}&server=${char.character_server_id}`
      )
      const data = await response.json()

      // 전투력 관련 정보만 추출
      const statList = data.stats?.statList || []
      const itemLevelStat = statList.find((s: { name?: string; statName?: string; type?: string }) =>
        s.name === '아이템레벨' || s.statName === '아이템레벨' || s.type === 'ItemLevel'
      )

      // 돌파 총합 계산
      const equipmentList = data.equipment?.equipmentList || []
      const breakthroughSum = equipmentList.reduce((sum: number, item: { exceedLevel?: number }) => {
        return sum + (item.exceedLevel || 0)
      }, 0)
      const breakthroughItems = equipmentList
        .filter((item: { exceedLevel?: number }) => item.exceedLevel && item.exceedLevel > 0)
        .map((item: { slotPosName?: string; itemName?: string; exceedLevel?: number }) => ({
          slot: item.slotPosName,
          name: item.itemName,
          exceed: item.exceedLevel
        }))

      setDebugData({
        characterId: char.character_id,
        serverId: char.character_server_id,
        // 전투력 소스
        'profile.noa_score': data.profile?.noa_score,
        // 아이템레벨
        itemLevel: itemLevelStat?.value,
        // 돌파 정보
        breakthrough: {
          total: breakthroughSum,
          hasEquipment: !!data.equipment,
          equipmentCount: equipmentList.length,
          items: breakthroughItems
        },
        // 스탯 정보
        hasStats: !!data.stats,
        statListLength: statList.length,
        allStatNames: statList.map((s: { name?: string; statName?: string }) => s.name || s.statName),
      })
      setShowDebug(true)
    } catch (err) {
      setDebugData({ error: err instanceof Error ? err.message : 'Unknown error' })
      setShowDebug(true)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 캐릭터를 삭제하시겠습니까?')) return
    try {
      await deleteCharacter(id)
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제에 실패했습니다.')
    }
  }

  // 전투력 포맷팅 (만 단위)
  const formatCombatPower = (cp?: number) => {
    if (!cp) return '-'
    if (cp >= 10000) {
      return `${(cp / 10000).toFixed(1)}만`
    }
    return cp.toLocaleString()
  }

  // 서버명 가져오기 (검색 결과용)
  const getServerName = (char: CharacterSearchResult) => {
    if (char.server) return char.server
    const serverId = char.serverId ?? char.server_id
    if (serverId) {
      return SERVERS.find(s => s.id === String(serverId))?.name || ''
    }
    return ''
  }

  // 종족 표시
  const getRaceDisplay = (char: CharacterSearchResult) => {
    const race = char.race || ''
    if (race === 'Elyos' || race === '천족') return { text: '천족', color: '#60a5fa' }
    if (race === 'Asmodian' || race === '마족') return { text: '마족', color: '#f87171' }
    return { text: race, color: '#9ca3af' }
  }

  // 로그인 필요 화면
  if (!isAuthenticated) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.title}>내 모집 캐릭터</span>
        </div>
        <PartyLoginRequired onLogin={signInWithGoogle} isLoading={isAuthLoading} />
      </div>
    )
  }

  return (
    <div className={`${styles.container} ${isMobile ? styles.mobile : styles.pc}`}>
      {!isMobile && (
        <>
          <div className={styles.header}>
            <span className={styles.title}>내 모집 캐릭터</span>
          </div>
          <p className={styles.description}>파티 모집에 사용할 캐릭터를 검색하여 등록하세요.</p>
        </>
      )}

      {/* 검색 입력창 (상단 검색 스타일) */}
      <div className={styles.searchWrapper} ref={wrapperRef}>
        {/* 필터 영역 */}
        <div className={styles.filterRow}>
          {/* 종족 필터 토글 */}
          <div className={styles.raceToggle}>
            <button
              className={`${styles.raceButton} ${selectedRace === 'elyos' ? styles.elyosActive : ''}`}
              onClick={() => setSelectedRace(selectedRace === 'elyos' ? undefined : 'elyos')}
            >
              천족
            </button>
            <button
              className={`${styles.raceButton} ${selectedRace === 'asmodian' ? styles.asmodianActive : ''}`}
              onClick={() => setSelectedRace(selectedRace === 'asmodian' ? undefined : 'asmodian')}
            >
              마족
            </button>
          </div>

          {/* 서버 필터 - 종족 선택에 따라 필터링 */}
          <select
            className={styles.serverSelect}
            value={selectedServer}
            onChange={(e) => setSelectedServer(e.target.value)}
          >
            <option value="">전체 서버</option>
            {SERVERS
              .filter(server => {
                // 종족 선택 없으면 모든 서버 표시
                if (!selectedRace) return true
                // 천족 선택시 1xxx 서버만
                if (selectedRace === 'elyos') return server.id.startsWith('1')
                // 마족 선택시 2xxx 서버만
                if (selectedRace === 'asmodian') return server.id.startsWith('2')
                return true
              })
              .map(server => (
                <option key={server.id} value={server.name}>{server.name}</option>
              ))}
          </select>
        </div>

        <div className={styles.searchInputWrapper}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="캐릭터명 입력..."
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
            onFocus={() => {
              if (searchName.length >= 1) setShowResults(true)
            }}
          />
          {searchName && (
            <button
              className={styles.clearButton}
              onClick={() => {
                setSearchName('')
                clearSearchResults()
                setShowResults(false)
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* 검색 결과 드롭다운 */}
        {showResults && (searchResults.length > 0 || searching) && (
          <div className={styles.searchDropdown}>
            <div className={styles.searchDropdownHeader}>
              <span>검색 결과 {searchResults.length > 0 && `(${searchResults.length})`}</span>
              {searching && <span className={styles.searchingText}>검색 중...</span>}
            </div>

            <div className={styles.searchDropdownList}>
              {searchResults.slice(0, 10).map(char => {
                const serverName = getServerName(char)
                const raceInfo = getRaceDisplay(char)
                const itemLevel = char.item_level
                // 프로필 이미지 URL 추출 (상단 검색과 동일)
                const profileImage = char.imageUrl || char.profileImage || null
                const isElyos = raceInfo.text === '천족'

                return (
                  <div
                    key={char.characterId}
                    className={styles.searchResultItem}
                    onClick={() => handleRegister(char)}
                  >
                    {/* 캐릭터 프로필 이미지 (상단 검색과 동일) */}
                    <div
                      className={styles.profileImageWrapper}
                      style={{ borderColor: isElyos ? '#3b82f6' : '#ef4444' }}
                    >
                      {profileImage ? (
                        <img
                          src={profileImage}
                          alt=""
                          className={styles.profileImage}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                            const parent = (e.target as HTMLImageElement).parentElement
                            if (parent) {
                              parent.innerHTML = `<span style="font-size:14px;color:#9CA3AF">${char.name.charAt(0)}</span>`
                            }
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: '14px', color: '#9CA3AF' }}>{char.name.charAt(0)}</span>
                      )}
                    </div>
                    <div className={styles.searchResultInfo}>
                      {/* 1행: 캐릭터명 + PVE/PVP 점수 */}
                      <div className={styles.searchResultMain}>
                        <span className={styles.charName}>
                          {char.name.replace(/<\/?[^>]+(>|$)/g, '')}
                        </span>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', fontSize: '0.75rem' }}>
                          {char.pve_score && char.pve_score > 0 && (
                            <span style={{ color: '#4ade80', fontWeight: 600 }}>
                              PVE {char.pve_score.toLocaleString()}
                            </span>
                          )}
                          {char.pvp_score && char.pvp_score > 0 && (
                            <span style={{ color: '#f87171', fontWeight: 600 }}>
                              PVP {char.pvp_score.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* 2행: 종족 | 서버 | 아이템레벨 */}
                      <div className={styles.searchResultMeta}>
                        <span style={{ color: raceInfo.color, fontWeight: 500 }}>{raceInfo.text}</span>
                        <span className={styles.separator}>|</span>
                        <span>{serverName}</span>
                        {itemLevel && itemLevel > 0 && (
                          <>
                            <span className={styles.separator}>|</span>
                            <span style={{ color: '#a78bfa' }}>IL.{itemLevel}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      className={styles.registerButton}
                      disabled={registering === char.characterId}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRegister(char)
                      }}
                    >
                      {registering === char.characterId ? '등록중...' : '등록'}
                    </button>
                  </div>
                )
              })}

              {searchResults.length === 0 && !searching && searchName.length >= 1 && (
                <div className={styles.noResults}>검색 결과가 없습니다.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 등록된 캐릭터 목록 */}
      <div className={styles.characterSection}>
        {loading ? (
          <span className={styles.loading}>불러오는 중...</span>
        ) : characters.length === 0 ? (
          <span className={styles.empty}>등록된 캐릭터가 없습니다.</span>
        ) : (
          <>
            <div className={styles.characterSectionHeader}>
              <div className={styles.characterSectionTitle}>
                등록된 캐릭터 ({characters.length})
              </div>
              <button
                className={styles.refreshAllButton}
                onClick={handleRefreshAll}
                disabled={refreshingAll}
                title="전체 캐릭터 스펙 갱신"
              >
                {refreshingAll ? '갱신 중...' : '🔄 전체 갱신'}
              </button>
            </div>
            <div className={styles.characterList}>
              {characters.map(char => {
                // PC용 원래 디자인
                if (!isMobile) {
                  return (
                    <div key={char.id} className={styles.characterCard}>
                      <div className={styles.cardHeader}>
                        <div className={styles.cardProfileWrapper}>
                          {char.profile_image ? (
                            <img
                              src={char.profile_image}
                              alt=""
                              className={styles.cardProfileImage}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none'
                              }}
                            />
                          ) : (
                            <span className={styles.cardProfilePlaceholder}>{char.character_name.charAt(0)}</span>
                          )}
                        </div>
                        <div className={styles.characterCardMain}>
                          <div className={styles.charNameWrapper}>
                            <div className={styles.charName}>{char.character_name}</div>
                            {char.character_breakthrough && char.character_breakthrough > 0 && (
                              <BreakthroughBadge value={char.character_breakthrough} size="small" />
                            )}
                          </div>
                          <div className={styles.charMeta}>
                            <span className={styles.className}>{char.character_class || '직업없음'}</span>
                            <span className={styles.level}>Lv{char.character_level || '?'}</span>
                          </div>
                        </div>
                      </div>

                      <div className={styles.characterCardStats}>
                        <div className={styles.statRow}>
                          <span className={styles.statLabelMini}>PVE</span>
                          <span className={styles.statValuePve}>
                            {formatCombatPower(char.character_pve_score)}
                          </span>
                        </div>
                        <div className={styles.statRow}>
                          <span className={styles.statLabelMini}>PVP</span>
                          <span className={styles.statValuePvp}>
                            {formatCombatPower(char.character_pvp_score)}
                          </span>
                        </div>
                      </div>

                      <div className={styles.characterCardActions}>
                        <button
                          className={styles.debugButton}
                          onClick={() => handleDebugFetch(char)}
                          title="디버그 정보"
                        >
                          🔍
                        </button>
                        <button
                          className={styles.refreshButton}
                          onClick={() => handleRefresh(char)}
                          disabled={refreshing === char.id}
                          title="최신 스펙으로 갱신"
                        >
                          {refreshing === char.id ? '...' : '🔄'}
                        </button>
                        <button
                          className={styles.deleteButton}
                          onClick={() => handleDelete(char.id)}
                          title="삭제"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )
                }

                // 모바일용 인스타 스토리 디자인
                return (
                  <div key={char.id} className={styles.storyItem}>
                    <div className={styles.storyActions}>
                      <button
                        className={`${styles.storyActionButton} ${styles.storyDeleteButton}`}
                        onClick={() => handleDelete(char.id)}
                        title="삭제"
                      >
                        ×
                      </button>
                    </div>

                    <div className={styles.storyProfileWrapper}>
                      <div className={styles.storyProfileInner}>
                        {char.profile_image ? (
                          <img
                            src={char.profile_image}
                            alt=""
                            className={styles.storyProfileImage}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        ) : (
                          <span className={styles.storyProfilePlaceholder}>{char.character_name.charAt(0)}</span>
                        )}
                      </div>
                    </div>

                    <div className={styles.storyInfo}>
                      <div className={styles.storyName}>{char.character_name}</div>
                      <div className={styles.storyStats}>
                        <span className={styles.storyStatPve}>
                          {formatCombatPower(char.character_pve_score)}
                        </span>
                        <span className={styles.storyStatPvp}>
                          {formatCombatPower(char.character_pvp_score)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* 디버그 패널 */}
      {showDebug && (
        <div className={styles.debugOverlay} onClick={() => setShowDebug(false)}>
          <div className={styles.debugPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.debugHeader}>
              <span>🔍 API 디버그</span>
              <button onClick={() => setShowDebug(false)}>×</button>
            </div>
            <div className={styles.debugContent}>
              <pre>{JSON.stringify(debugData, null, 2)}</pre>
            </div>
            <div className={styles.debugFooter}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(debugData, null, 2))
                  alert('복사됨!')
                }}
              >
                📋 복사
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
