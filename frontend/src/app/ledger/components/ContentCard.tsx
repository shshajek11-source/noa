'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import styles from './ContentCard.module.css'

interface ContentRecord {
  id: string
  bossName: string
  tier?: number
  category?: string
  count: number
  kina: number
}

interface ContentCardProps {
  contentType: 'transcend' | 'expedition'
  title: string
  maxTickets: number
  currentTickets: number
  bonusTickets: number
  onTicketsChange: (base: number, bonus: number) => void
  bossOptions: Array<{ id: string; name: string; imageUrl: string }>
  tierOptions?: Array<{ tier: number; kina: number }>
  categoryOptions?: Array<{ id: string; name: string }>
  isDoubleReward: boolean
  onDoubleToggle: () => void
  records: ContentRecord[]
  onAddRecord: (record: Omit<ContentRecord, 'id'>) => void
  onDeleteRecord: (recordId: string, count: number) => void
  selectedBoss?: string
  selectedTier?: number
  selectedCategory?: string
  onBossChange: (bossId: string) => void
  onTierChange?: (tier: number) => void
  onCategoryChange?: (category: string) => void
}

export default function ContentCard({
  contentType,
  title,
  maxTickets,
  currentTickets,
  bonusTickets,
  onTicketsChange,
  bossOptions,
  tierOptions,
  categoryOptions,
  isDoubleReward,
  onDoubleToggle,
  records,
  onAddRecord,
  onDeleteRecord,
  selectedBoss,
  selectedTier,
  selectedCategory,
  onBossChange,
  onTierChange,
  onCategoryChange,
}: ContentCardProps) {
  const [completionCount, setCompletionCount] = useState(1)
  const [isExpanded, setIsExpanded] = useState(false)
  const [timeUntilCharge, setTimeUntilCharge] = useState('')
  const [isShaking, setIsShaking] = useState(true) // 흔들림 상태

  // 선택된 보스 정보
  const currentBoss = bossOptions.find(b => b.id === selectedBoss) || bossOptions[0]

  // 다음 충전까지 시간 계산
  useEffect(() => {
    // 최대치 도달 시 타이머 정지
    if (currentTickets >= maxTickets) {
      setTimeUntilCharge('-:--:--')
      return
    }

    const updateTimer = () => {
      const now = new Date()
      const nextCharge = new Date(now)
      nextCharge.setHours(now.getHours() + 3, 0, 0, 0)

      // 이미 3시간 지점을 지났으면 다음 3시간 지점으로
      if (nextCharge <= now) {
        nextCharge.setHours(nextCharge.getHours() + 3)
      }

      const diff = nextCharge.getTime() - now.getTime()
      const hours = Math.floor(diff / 3600000)
      const minutes = Math.floor((diff % 3600000) / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)

      setTimeUntilCharge(
        `${hours.toString().padStart(1, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      )
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [currentTickets, maxTickets])

  // 현재 키나 계산
  const getCurrentKina = () => {
    if (contentType === 'transcend' && tierOptions && selectedTier) {
      const tier = tierOptions.find(t => t.tier === selectedTier)
      return tier ? tier.kina : 0
    }
    // 원정의 경우 보스별 키나
    const boss = bossOptions.find(b => b.id === selectedBoss)
    return (boss as any)?.kina || 0
  }

  // 기록 추가
  const handleAddRecord = () => {
    if (!selectedBoss) return

    const baseKina = getCurrentKina()
    const totalKina = baseKina * completionCount * (isDoubleReward ? 2 : 1)

    const newRecord: Omit<ContentRecord, 'id'> = {
      bossName: currentBoss.name,
      tier: selectedTier,
      category: selectedCategory,
      count: completionCount,
      kina: totalKina
    }

    onAddRecord(newRecord)

    // 잔여 횟수 차감
    let remaining = completionCount
    let newBonus = bonusTickets
    let newBase = currentTickets

    // 보너스부터 차감
    if (newBonus >= remaining) {
      newBonus -= remaining
    } else {
      remaining -= newBonus
      newBonus = 0
      newBase -= remaining
    }

    onTicketsChange(Math.max(0, newBase), newBonus)
    setCompletionCount(1)
  }

  // 기록 삭제
  const handleDeleteRecord = (recordId: string, count: number) => {
    // 횟수 복구 (기본 티켓에만 복구)
    onTicketsChange(Math.min(maxTickets, currentTickets + count), bonusTickets)
    onDeleteRecord(recordId, count)
  }

  // 오드 토글 (애니메이션 제어)
  const handleDoubleToggle = () => {
    if (!isDoubleReward) {
      // 활성화되면 애니메이션 멈춤
      setIsShaking(false)
    } else {
      // 비활성화되면 애니메이션 재개
      setIsShaking(true)
    }
    onDoubleToggle()
  }

  // 보이는 기록 (펼침 여부에 따라) - 펼쳤을 때 6개까지만
  const visibleRecords = isExpanded ? records.slice(0, 6) : records.slice(0, 3)
  const totalKina = records.reduce((sum, r) => sum + r.kina, 0)

  return (
    <div className={styles.card}>
      {/* 좌측 이미지 영역 */}
      <div className={styles.imageSection}>
        {currentBoss?.imageUrl && (
          <div className={styles.imageContainer}>
            <Image
              src={currentBoss.imageUrl}
              alt={currentBoss.name}
              fill
              className={styles.image}
            />
            <div className={styles.imageOverlay} />
            <div className={styles.imageGradient} />

            {/* 보스 이름 (좌상단) */}
            <div className={styles.bossName}>{currentBoss.name}</div>

            {/* 타이머 (좌하단) */}
            <div className={styles.timerInfo}>
              <div className={styles.timerLabel}>이용권 충전</div>
              <div className={styles.timerLabel}>남은시간</div>
              <div className={styles.timerText}>{timeUntilCharge}</div>
            </div>

            {/* 잔여 횟수 (우하단) */}
            <div className={styles.remainingCount}>
              <span className={styles.countCurrent}>{currentTickets + bonusTickets}</span>
              <span className={styles.countMax}>/{maxTickets}</span>
              {bonusTickets > 0 && (
                <span className={styles.countBonus}>(+{bonusTickets})</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 우측 컨텐츠 영역 */}
      <div className={styles.contentSection}>
        {/* 컨트롤 영역 */}
        <div className={styles.controls}>
          <span className={styles.contentTitle}>{title}</span>

          {/* 오드 에너지 토글 */}
          <button
            className={`${styles.oddToggle} ${isDoubleReward ? styles.oddToggleActive : ''} ${isShaking && !isDoubleReward ? styles.oddShake : ''}`}
            onClick={handleDoubleToggle}
          >
            <Image src="/메달/오드.png" alt="오드" width={21} height={21} />
            <span>오드에너지 2배 사용</span>
          </button>

          {/* 카테고리 선택 (원정만) */}
          {categoryOptions && onCategoryChange && (
            <select
              className={styles.select}
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
            >
              {categoryOptions.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          )}

          {/* 보스 선택 */}
          <select
            className={styles.select}
            value={selectedBoss}
            onChange={(e) => onBossChange(e.target.value)}
          >
            {bossOptions.map(boss => (
              <option key={boss.id} value={boss.id}>{boss.name}</option>
            ))}
          </select>

          {/* 단계 선택 (초월만) */}
          {tierOptions && onTierChange && (
            <select
              className={styles.select}
              value={selectedTier}
              onChange={(e) => onTierChange(Number(e.target.value))}
            >
              {tierOptions.map(tier => (
                <option key={tier.tier} value={tier.tier}>{tier.tier}단계</option>
              ))}
            </select>
          )}

          {/* 완료 횟수 */}
          <span className={styles.countLabel}>완료횟수:</span>
          <div className={styles.countControl}>
            <button
              className={styles.countBtn}
              onClick={() => setCompletionCount(Math.max(1, completionCount - 1))}
            >
              −
            </button>
            <span className={styles.countValue}>{completionCount}</span>
            <button
              className={styles.countBtn}
              onClick={() => setCompletionCount(completionCount + 1)}
            >
              +
            </button>
          </div>

          {/* 진행 완료 버튼 */}
          <button className={styles.addBtn} onClick={handleAddRecord}>
            진행 완료
          </button>
        </div>

        {/* 기록 영역 */}
        <div className={styles.recordsSection}>
          <div className={styles.recordsHeader}>
            <span>📋 오늘 기록: ({records.length}개)</span>
            {records.length > 3 && (
              <button
                className={styles.expandBtn}
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? '접기▲' : '펼치기▼'}
              </button>
            )}
          </div>

          <div className={`${styles.recordsList} ${isExpanded ? styles.recordsListExpanded : ''}`}>
            {visibleRecords.length === 0 ? (
              <div className={styles.noRecords}>기록이 없습니다</div>
            ) : (
              visibleRecords.map(record => (
                <div key={record.id} className={styles.recordItem}>
                  <span className={styles.recordInfo}>
                    ✅ {record.bossName}
                    {record.tier && `-${record.tier}단계`}
                    {record.category && ` [${record.category}]`}
                  </span>
                  <span className={styles.recordCount}>{record.count}회</span>
                  <span className={styles.recordKina}>{record.kina.toLocaleString()}</span>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDeleteRecord(record.id, record.count)}
                    title="기록 삭제"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          {records.length > 0 && (
            <div className={styles.totalKina}>
              💰 합계: {totalKina.toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
