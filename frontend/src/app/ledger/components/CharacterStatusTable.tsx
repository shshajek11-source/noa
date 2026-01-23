'use client'

import { Users, ChevronDown, ChevronUp, ExternalLink, Check } from 'lucide-react'
import { useState, useEffect } from 'react'
import { LedgerCharacter } from '@/types/ledger'
import styles from './CharacterStatusTable.module.css'

// 충전 타입 정의
type ChargeType = '8h' | 'daily' | '24h' | 'weekly' | 'shugo'

interface ContentProgress {
  id: string
  name: string
  current: number      // 완료 횟수
  max: number          // 기본 최대 횟수
  bonus?: number       // 충전권 보너스 횟수
  chargeType?: ChargeType  // 충전 타입
  nextChargeSeconds?: number  // 다음 충전까지 남은 초
}

interface CharacterStatus {
  character: LedgerCharacter
  todayIncome: number
  weeklyIncome: number
  sellingItemCount: number
  soldItemCount: number
  weeklyContents: ContentProgress[]
  dailyContents: ContentProgress[]
}

interface CharacterStatusTableProps {
  characterStatuses: CharacterStatus[]
  onCharacterClick: (characterId: string) => void
}

const formatKina = (value: number) => {
  return value.toLocaleString('ko-KR')
}

// 남은 시간 포맷팅 (초 → 시:분:초 또는 N일 시:분:초)
function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return '0:00:00'

  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (days > 0) {
    return `${days}일 ${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function ContentProgressCell({ content }: { content: ContentProgress }) {
  const [timeRemaining, setTimeRemaining] = useState(content.nextChargeSeconds || 0)

  // 1초마다 타이머 업데이트
  useEffect(() => {
    if (content.nextChargeSeconds === undefined) return

    setTimeRemaining(content.nextChargeSeconds)

    const interval = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(interval)
  }, [content.nextChargeSeconds])

  // 기본 잔여 횟수 (충전권 제외, 시간충전분만)
  const baseRemaining = content.max - content.current
  // 전체 잔여 = 기본 잔여 + 충전권 (완료 여부 판단용)
  const totalRemaining = baseRemaining + (content.bonus || 0)
  const isComplete = totalRemaining <= 0

  return (
    <div className={`${styles.contentCell} ${isComplete ? styles.contentCellComplete : ''}`}>
      <div className={styles.contentHeader}>
        <span className={styles.contentName}>{content.name}</span>
        {isComplete ? (
          <Check size={12} className={styles.checkIcon} />
        ) : (
          <span className={styles.contentTime}>
            {formatTimeRemaining(timeRemaining)}
          </span>
        )}
      </div>
      <div className={styles.contentCount}>
        {baseRemaining}/{content.max}
        {content.bonus && content.bonus > 0 && (
          <span className={styles.bonusCount}>(+{content.bonus})</span>
        )}
      </div>
    </div>
  )
}

function CharacterRow({ status, onCharacterClick }: { status: CharacterStatus; onCharacterClick: (id: string) => void }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  return (
    <div className={styles.characterCard}>
      {/* 캐릭터 헤더 */}
      <div className={styles.characterHeader}>
        <div className={styles.characterInfo}>
          {status.character.profile_image ? (
            <img
              src={status.character.profile_image}
              alt={status.character.name}
              className={styles.avatar}
              onError={(e) => {
                const target = e.currentTarget
                target.style.display = 'none'
                const fallback = target.nextElementSibling as HTMLElement
                if (fallback) fallback.style.display = 'flex'
              }}
            />
          ) : null}
          <div className={styles.avatarPlaceholder} style={{ display: status.character.profile_image ? 'none' : 'flex' }}>
            {status.character.name[0]}
          </div>
          <div className={styles.characterDetails}>
            <div className={styles.characterNameRow}>
              <span className={styles.characterName}>{status.character.name}</span>
              <button
                className={styles.goToBtn}
                onClick={() => onCharacterClick(status.character.id)}
                title="가계부 페이지로 이동"
              >
                <ExternalLink size={12} />
              </button>
            </div>
            <div className={styles.characterMeta}>
              {status.character.class_name} · {status.character.server_name}
              {status.character.item_level && status.character.item_level > 0 && ` · IL ${status.character.item_level}`}
            </div>
          </div>
        </div>

        {/* 수입 및 아이템 요약 */}
        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>오늘</span>
            <span className={styles.statValue}>{formatKina(status.todayIncome)}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>주간</span>
            <span className={styles.statValue}>{formatKina(status.weeklyIncome)}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>판매중</span>
            <span className={styles.statValueNeutral}>{status.sellingItemCount}개</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>완료</span>
            <span className={styles.statValueSuccess}>{status.soldItemCount}개</span>
          </div>
        </div>

        <button className={styles.expandBtn} onClick={toggleExpand}>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {/* 컨텐츠 진행 현황 (확장 시) */}
      {isExpanded && (
        <div className={styles.contentSection}>
          {/* 주간 컨텐츠 */}
          <div className={styles.contentGroup}>
            <h4 className={styles.contentGroupTitle}>주간 컨텐츠</h4>
            <div className={styles.contentGrid}>
              {status.weeklyContents.map(content => (
                <ContentProgressCell key={content.id} content={content} />
              ))}
            </div>
          </div>

          {/* 일일 컨텐츠 */}
          <div className={styles.contentGroup}>
            <h4 className={styles.contentGroupTitle}>일일 컨텐츠</h4>
            <div className={styles.contentGrid}>
              {status.dailyContents.map(content => (
                <ContentProgressCell key={content.id} content={content} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CharacterStatusTable({
  characterStatuses,
  onCharacterClick
}: CharacterStatusTableProps) {
  if (characterStatuses.length === 0) {
    return (
      <section className={styles.section}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            <Users size={18} />
            캐릭터별 현황
          </h2>
        </div>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>👤</div>
          <p className={styles.emptyText}>등록된 캐릭터가 없습니다</p>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <Users size={18} />
          캐릭터별 현황
        </h2>
        <span className={styles.subtitle}>
          펼쳐서 컨텐츠 확인
        </span>
      </div>

      <div className={styles.characterList}>
        {characterStatuses.map(status => (
          <CharacterRow
            key={status.character.id}
            status={status}
            onCharacterClick={onCharacterClick}
          />
        ))}
      </div>
    </section>
  )
}
