'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Search, ChevronDown, User } from 'lucide-react'
import { CharacterSearchResult } from '@/lib/supabaseApi'
import { useCharacterSearch } from '@/hooks/useCharacterSearch'
import { MainCharacter, MAIN_CHARACTER_KEY } from '@/app/components/SearchBar'
import styles from './MainCharacterModal.module.css'

interface MainCharacterModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect?: (character: MainCharacter) => void
}

const ELYOS_SERVERS = [
  '시엘', '네자칸', '바이젤', '카이시넬', '유스티엘', '아리엘', '프레기온',
  '메스람타에다', '히타니에', '나니아', '타하바타', '루터스', '페르노스',
  '다미누', '카사카', '바카르마', '챈가룽', '코치룽', '이슈타르', '티아마트', '포에타'
]

const ASMODIAN_SERVERS = [
  '지켈', '트리니엘', '루미엘', '마르쿠탄', '아스펠', '에레슈키갈', '브리트라',
  '네몬', '하달', '루드라', '울고른', '무닌', '오다르', '젠카카', '크로메데',
  '콰이링', '바바룽', '파프니르', '인드나흐', '이스할겐'
]

export default function MainCharacterModal({ isOpen, onClose, onSelect }: MainCharacterModalProps) {
  const [isServerDropdownOpen, setIsServerDropdownOpen] = useState(false)

  const modalRef = useRef<HTMLDivElement>(null)

  // useCharacterSearch 훅 사용 (상단 검색과 동일한 로직)
  const {
    query: name,
    setQuery: setName,
    race,
    setRace,
    server,
    setServer,
    results,
    isSearching,
    showResults,
    setShowResults,
    clearResults
  } = useCharacterSearch({ debounceMs: 300, minLength: 1, maxResults: 5 })

  const servers = race === 'elyos' ? ELYOS_SERVERS : ASMODIAN_SERVERS

  // 모달 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // ESC 키로 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
    }

    return () => {
      document.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, onClose])

  // 종족 변경 시 서버 초기화
  useEffect(() => {
    setServer('')
  }, [race, setServer])

  // 모달 닫힐 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setName('')
      clearResults()
      setShowResults(false)
    }
  }, [isOpen, setName, clearResults, setShowResults])

  // 캐릭터 선택
  const handleSelect = async (char: CharacterSearchResult) => {
    let hitScore = char.noa_score
    let pveScore = char.pve_score
    let pvpScore = char.pvp_score
    let itemLevel = char.item_level
    let className = char.job || char.className
    let level = char.level

    // 캐릭터 상세 정보 API 호출 (더 정확한 정보 가져오기)
    if (char.characterId && char.server_id) {
      try {
        const res = await fetch(
          `/api/character?id=${encodeURIComponent(char.characterId)}&server=${char.server_id}`
        )
        if (res.ok) {
          const detailData = await res.json()
          console.log('[Main Character Modal] Detail API response:', detailData)

          // profile에서 상세 정보 추출
          if (detailData.profile) {
            level = detailData.profile.level || level
            className = detailData.profile.className || className
            pveScore = detailData.profile.pve_score || pveScore
            pvpScore = detailData.profile.pvp_score || pvpScore
          }

          // 아이템 레벨 계산 (장비 목록에서)
          if (detailData.equipment?.equipmentList) {
            const equipList = detailData.equipment.equipmentList
            // 메인 장비 슬롯들의 아이템 레벨 평균
            const mainSlots = equipList.filter((item: { slotPos?: number; itemLevel?: number }) =>
              item.slotPos && [1, 2, 3, 5, 6, 7, 11, 12, 13, 14, 15, 16].includes(item.slotPos) && item.itemLevel
            )

            if (mainSlots.length > 0) {
              const totalItemLevel = mainSlots.reduce((sum: number, item: { itemLevel?: number }) =>
                sum + (item.itemLevel || 0), 0
              )
              itemLevel = Math.floor(totalItemLevel / mainSlots.length)
            }
          }

          // noa_score (히톤 전투력)
          if (detailData.noa_score) {
            hitScore = detailData.noa_score
          }
        }
      } catch (e) {
        console.error('Failed to fetch character detail', e)
        // 실패해도 검색 API 정보 사용
      }
    }

    const mainChar: MainCharacter = {
      characterId: char.characterId,
      name: char.name.replace(/<\/?[^>]+(>|$)/g, ''),
      server: char.server,
      server_id: char.server_id,
      race: char.race,
      className: className,
      level: level,
      hit_score: hitScore,
      pve_score: pveScore,
      pvp_score: pvpScore,
      item_level: itemLevel,
      imageUrl: char.imageUrl || char.profileImage,
      setAt: Date.now()
    }

    try {
      if (onSelect) {
        // 외부에서 제공한 onSelect 핸들러 사용
        await onSelect(mainChar)
      } else {
        // 기본 동작: localStorage에 저장
        localStorage.setItem(MAIN_CHARACTER_KEY, JSON.stringify(mainChar))
        window.dispatchEvent(new Event('mainCharacterChanged'))
      }
      onClose()
    } catch (e) {
      console.error('Failed to set main character', e)
      alert('대표 캐릭터 설정에 실패했습니다.')
    }
  }

  // 숫자 포맷팅
  const formatNumber = (num: number | undefined) => {
    if (num === undefined || num === null || num === 0) return null
    return num.toLocaleString()
  }

  if (!isOpen) return null

  return (
    <div
      ref={modalRef}
      className={styles.mainModal}
      // 인라인 스타일로 위치 오버라이드 (말풍선 위치)
      style={{
        position: 'absolute',
        top: 'calc(100% + 10px)',
        right: 0,
        width: '320px',
        margin: 0,
        maxHeight: 'none',
        padding: '1rem',
        borderRadius: '12px',
        zIndex: 1000
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 말풍선 화살표 */}
      <div style={{
        position: 'absolute',
        top: '-8px',
        right: '24px',
        width: '14px',
        height: '14px',
        background: '#000000',
        border: '1px solid #333',
        borderRight: 'none',
        borderBottom: 'none',
        transform: 'rotate(45deg)'
      }} />

      {/* 헤더 */}
      <div className={styles.header} style={{ padding: '0 0 12px 0' }}>
        <span className={styles.title} style={{ fontSize: '0.85rem', color: '#F59E0B' }}>
          대표 캐릭터 설정
        </span>
        <button className={styles.closeButton} onClick={onClose} style={{ width: 'auto', height: 'auto', fontSize: '20px' }}>
          <X size={16} />
        </button>
      </div>

      {/* 종족 선택 */}
      <div className={styles.raceTabs}>
        <button
          onClick={() => setRace('elyos')}
          className={`${styles.raceTab} ${race === 'elyos' ? styles.raceTabActive : ''}`}
        >
          천족
        </button>
        <button
          onClick={() => setRace('asmodian')}
          className={`${styles.raceTab} ${race === 'asmodian' ? styles.raceTabActive : ''}`}
        >
          마족
        </button>
      </div>

      {/* 서버 선택 */}
      <div className={styles.serverSelect}>
        <button
          onClick={() => setIsServerDropdownOpen(!isServerDropdownOpen)}
          className={`${styles.serverTrigger} ${server ? styles.serverTriggerActive : ''}`}
        >
          {server || '전체 서버'}
          <ChevronDown size={14} style={{
            transform: isServerDropdownOpen ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.2s'
          }} />
        </button>

        {isServerDropdownOpen && (
          <div className={styles.serverDropdown}>
            <div
              onClick={() => { setServer(''); setIsServerDropdownOpen(false) }}
              className={`${styles.serverOption} ${!server ? styles.serverOptionSelected : ''}`}
            >
              전체 서버
            </div>
            {servers.map(s => (
              <div
                key={s}
                onClick={() => { setServer(s); setIsServerDropdownOpen(false) }}
                className={`${styles.serverOption} ${server === s ? styles.serverOptionSelected : ''}`}
              >
                {s}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 캐릭터명 입력 */}
      <div className={styles.searchBox} style={{ background: '#111827', padding: '0 0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
        <Search size={14} style={{ color: 'var(--text-secondary)' }} />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="캐릭터명"
          className={styles.input}
          style={{ border: 'none', background: 'transparent', padding: '0.6rem' }}
        />
        {isSearching && <div className={styles.spinner} />}
      </div>

      {/* 검색 결과 */}
      {showResults && results.length > 0 && (
        <div className={styles.resultsList} style={{ border: '1px solid #333', borderRadius: '6px', background: '#0B0D12' }}>
          {results.map((char) => (
            <div
              key={char.characterId}
              onClick={() => handleSelect(char)}
              className={styles.resultItem}
              style={{ border: 'none', borderBottom: '1px solid #333', borderRadius: 0 }}
            >
              <div className={styles.characterIcon} style={{ width: '32px', height: '32px' }}>
                {char.imageUrl ? (
                  <img src={char.imageUrl} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                ) : (
                  <User size={14} />
                )}
              </div>
              <div className={styles.characterInfo} style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div className={styles.characterName} style={{ fontSize: '0.8rem' }}>
                    {char.name.replace(/<\/?[^>]+(>|$)/g, '')}
                  </div>
                  {/* PVE/PVP 점수 표시 */}
                  <div style={{ display: 'flex', gap: '6px', fontSize: '0.65rem' }}>
                    {formatNumber(char.pve_score) && (
                      <span style={{ color: '#4ade80', fontWeight: 600 }}>
                        PVE {formatNumber(char.pve_score)}
                      </span>
                    )}
                    {formatNumber(char.pvp_score) && (
                      <span style={{ color: '#f87171', fontWeight: 600 }}>
                        PVP {formatNumber(char.pvp_score)}
                      </span>
                    )}
                  </div>
                </div>
                <div className={styles.characterDetails} style={{ fontSize: '0.65rem', color: '#9CA3AF' }}>
                  {char.server} · {char.job || char.className}
                  {char.item_level && char.item_level > 0 && (
                    <span style={{ color: '#a78bfa' }}> · IL {char.item_level}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 결과 없음 */}
      {showResults && results.length === 0 && name.trim().length >= 1 && !isSearching && (
        <div className={styles.noResults}>
          검색 결과가 없습니다
        </div>
      )}

      {/* 안내 문구 */}
      {!showResults && (
        <div className={styles.noResults}>
          캐릭터명을 입력해주세요
        </div>
      )}
    </div>
  )
}
