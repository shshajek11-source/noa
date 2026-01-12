'use client'

import { useState } from 'react'
import { Search, User } from 'lucide-react'
import styles from './MainCharacterModal.module.css'

interface Character {
  name: string
  server: string
  className: string
  level: number
  totalStats: number
}

interface MainCharacterModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (character: { server: string; name: string; className: string; level: number }) => Promise<void>
  currentCharacter?: { server: string; name: string; className: string; level: number } | null
}

const SERVERS = [
  { id: 1001, name: '시엘' },
  { id: 2001, name: '이스라펠' },
  { id: 1002, name: '네자칸' },
  { id: 2002, name: '지켈' },
  { id: 1003, name: '바이젤' },
  { id: 2003, name: '트리니엘' },
  { id: 1004, name: '카이시넬' },
  { id: 2004, name: '루미엘' }
]

// pcId를 직업명으로 변환
const PC_ID_TO_CLASS: Record<number, string> = {
  // 전사 계열 (Warrior)
  6: '검성',   // Gladiator
  7: '검성',   // Gladiator
  8: '검성',   // Gladiator (variant)
  9: '검성',   // Gladiator (variant 2)
  10: '수호성', // Templar
  11: '수호성', // Templar
  12: '수호성', // Templar (variant)
  13: '수호성', // Templar (variant 2)

  // 정찰 계열 (Scout)
  14: '궁성',  // Ranger
  15: '궁성',  // Ranger
  16: '궁성',  // Ranger (variant)
  17: '궁성',  // Ranger (variant 2)
  18: '살성',  // Assassin
  19: '살성',  // Assassin
  20: '살성',  // Assassin
  21: '살성',  // Assassin (variant 2)

  // 법사 계열 (Mage)
  22: '정령성', // Spiritmaster
  23: '정령성', // Spiritmaster
  24: '정령성', // Spiritmaster (variant)
  25: '정령성', // Spiritmaster (variant 2)
  26: '마도성', // Sorcerer
  27: '마도성', // Sorcerer
  28: '마도성', // Sorcerer
  29: '마도성', // Sorcerer (variant 2)

  // 성직자 계열 (Priest)
  30: '치유성', // Cleric
  31: '치유성', // Cleric
  32: '치유성', // Cleric (variant)
  33: '치유성', // Cleric (variant 2)
  34: '호법성', // Chanter
  35: '호법성', // Chanter
  36: '호법성', // Chanter (variant)
  37: '호법성', // Chanter (variant 2)
}

export default function MainCharacterModal({ isOpen, onClose, onSubmit, currentCharacter }: MainCharacterModalProps) {
  const [selectedServer, setSelectedServer] = useState(currentCharacter?.server || '시엘')
  const [characterName, setCharacterName] = useState(currentCharacter?.name || '')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<Character[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSearch = async () => {
    if (!characterName.trim()) {
      setError('캐릭터명을 입력해주세요')
      return
    }

    setIsSearching(true)
    setError(null)
    setSearchResults([])

    try {
      const server = SERVERS.find(s => s.name === selectedServer)
      const res = await fetch('/api/search/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: characterName.trim(),
          serverId: server?.id || 1,
          page: 1
        })
      })

      if (!res.ok) {
        throw new Error('검색에 실패했습니다')
      }

      const data = await res.json()
      const list = data.list || data.characters || []

      if (list.length === 0) {
        setError('캐릭터를 찾을 수 없습니다')
      } else {
        const results = list.slice(0, 10).map((c: any) => {
          // pcId를 우선적으로 사용하여 직업명 결정
          let className = '알 수 없음'
          if (c.pcId && PC_ID_TO_CLASS[c.pcId]) {
            className = PC_ID_TO_CLASS[c.pcId]
          } else if (c.class_name) {
            className = c.class_name
          } else if (c.className) {
            className = c.className
          }

          return {
            name: (c.name || '').replace(/<[^>]*>/g, ''),
            server: c.serverName || c.server_name || selectedServer,
            className: className,
            level: c.level || 0,
            totalStats: c.totalStats || 0
          }
        })
        setSearchResults(results)
      }
    } catch (err: any) {
      setError(err.message || '검색 중 오류가 발생했습니다')
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectCharacter = async (character: Character) => {
    setIsSubmitting(true)
    try {
      await onSubmit({
        server: character.server,
        name: character.name,
        className: character.className,
        level: character.level
      })
      onClose()
    } catch (err: any) {
      setError(err.message || '대표 캐릭터 설정에 실패했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSearching) {
      handleSearch()
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>대표 캐릭터 설정</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.body}>
          <p className={styles.description}>
            AION 2 캐릭터를 검색하여 대표 캐릭터로 설정하세요
          </p>

          {/* 서버 선택 */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>서버</label>
            <div className={styles.serverButtons}>
              {SERVERS.map(server => (
                <button
                  key={server.id}
                  type="button"
                  className={`${styles.serverButton} ${selectedServer === server.name ? styles.active : ''}`}
                  onClick={() => setSelectedServer(server.name)}
                  disabled={isSearching || isSubmitting}
                >
                  {server.name}
                </button>
              ))}
            </div>
          </div>

          {/* 캐릭터명 입력 */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>캐릭터명</label>
            <div className={styles.searchBox}>
              <input
                type="text"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="캐릭터명을 입력하세요"
                className={styles.input}
                disabled={isSearching || isSubmitting}
                autoFocus
              />
              <button
                type="button"
                onClick={handleSearch}
                className={styles.searchButton}
                disabled={isSearching || isSubmitting || !characterName.trim()}
              >
                <Search size={18} />
                {isSearching ? '검색 중...' : '검색'}
              </button>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          {/* 검색 결과 */}
          {searchResults.length > 0 && (
            <div className={styles.resultsSection}>
              <div className={styles.resultsHeader}>
                검색 결과 ({searchResults.length}명)
              </div>
              <div className={styles.resultsList}>
                {searchResults.map((char, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={styles.resultItem}
                    onClick={() => handleSelectCharacter(char)}
                    disabled={isSubmitting}
                  >
                    <div className={styles.characterIcon}>
                      <User size={20} />
                    </div>
                    <div className={styles.characterInfo}>
                      <div className={styles.characterName}>{char.name}</div>
                      <div className={styles.characterDetails}>
                        {char.server} · {char.className} · Lv.{char.level}
                      </div>
                    </div>
                    <div className={styles.selectButton}>
                      선택
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 현재 설정된 캐릭터 표시 */}
          {currentCharacter && (
            <div className={styles.currentCharacter}>
              <div className={styles.currentLabel}>현재 대표 캐릭터</div>
              <div className={styles.currentInfo}>
                {currentCharacter.name} ({currentCharacter.server})
              </div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            onClick={onClose}
            className={styles.cancelButton}
            disabled={isSubmitting}
          >
            {currentCharacter ? '닫기' : '나중에'}
          </button>
        </div>
      </div>
    </div>
  )
}
