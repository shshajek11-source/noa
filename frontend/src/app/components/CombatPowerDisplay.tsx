'use client'

import { useMemo, useState } from 'react'
import { calculateCombatPowerFromStats } from '../../lib/combatPower'
import { aggregateStats } from '../../lib/statsAggregator'
import styles from './CombatPowerDisplay.module.css'

interface CombatPowerDisplayProps {
  equipment: any[]
  titles: any
  daevanion: any
  stats: any
  equippedTitleId?: number
}

export default function CombatPowerDisplay({
  equipment,
  titles,
  daevanion,
  stats,
  equippedTitleId
}: CombatPowerDisplayProps) {
  const [showDetails, setShowDetails] = useState(false)

  // 스탯 집계
  const aggregatedStats = useMemo(() => {
    return aggregateStats(equipment, titles, daevanion, stats, equippedTitleId)
  }, [equipment, titles, daevanion, stats, equippedTitleId])

  // 전투력 계산
  const combatPower = useMemo(() => {
    return calculateCombatPowerFromStats(aggregatedStats, stats)
  }, [aggregatedStats, stats])

  // 점수 포맷팅
  const formatScore = (score: number) => {
    return score.toLocaleString()
  }

  // 계수 설명
  const coefficientLabels: Record<string, { label: string, icon: string, desc: string }> = {
    공격력계수: { label: '공격력', icon: '⚔️', desc: '기본 데미지' },
    피해증폭계수: { label: '피해 증폭', icon: '💥', desc: '데미지 배율' },
    무기증폭계수: { label: '무기 증폭', icon: '🗡️', desc: '무기 보너스' },
    치명타계수: { label: '치명타', icon: '⚡', desc: '크리티컬' },
    전투효율계수: { label: '전투 효율', icon: '💨', desc: '속도+쿨감' },
    강타계수: { label: '강타', icon: '💪', desc: '강타 보너스' },
    다단히트계수: { label: '다단 히트', icon: '🎯', desc: '연속 타격' },
    스킬보너스계수: { label: '스킬', icon: '✨', desc: '스킬 육성' },
  }

  return (
    <div className={styles.container}>
      {/* 메인 점수 영역 */}
      <div className={styles.mainScore} onClick={() => setShowDetails(!showDetails)}>
        <div className={styles.scoreHeader}>
          <span className={styles.scoreLabel}>전투력</span>
          <span className={styles.version}>v1.0</span>
        </div>

        <div className={styles.scoreValue}>
          <span
            className={styles.grade}
            style={{ color: combatPower.gradeColor }}
          >
            {combatPower.grade}
          </span>
          <span className={styles.score}>
            {formatScore(combatPower.totalScore)}
          </span>
        </div>

        <div className={styles.expandHint}>
          {showDetails ? '접기 ▲' : '상세보기 ▼'}
        </div>
      </div>

      {/* 상세 정보 */}
      {showDetails && (
        <div className={styles.details}>
          {/* 계수 그리드 */}
          <div className={styles.coefficientsGrid}>
            {Object.entries(combatPower.coefficients).map(([key, value]) => {
              const info = coefficientLabels[key]
              if (!info) return null

              const isHighlight = value >= 1.5
              const isLow = value < 1.1 && key !== '스킬보너스계수'

              return (
                <div
                  key={key}
                  className={`${styles.coefficientItem} ${isHighlight ? styles.highlight : ''} ${isLow ? styles.low : ''}`}
                >
                  <div className={styles.coefficientHeader}>
                    <span className={styles.coefficientIcon}>{info.icon}</span>
                    <span className={styles.coefficientLabel}>{info.label}</span>
                  </div>
                  <div className={styles.coefficientValue}>
                    ×{value.toFixed(2)}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 상세 수치 */}
          <div className={styles.statsDetails}>
            <div className={styles.statsRow}>
              <span>최종 공격력</span>
              <span className={styles.statsValue}>{combatPower.details.최종공격력.toLocaleString()}</span>
            </div>
            <div className={styles.statsRow}>
              <span>총 피해 증폭</span>
              <span className={styles.statsValue}>+{combatPower.details.총피해증폭}%</span>
            </div>
            <div className={styles.statsRow}>
              <span>치명타 확률</span>
              <span className={styles.statsValue}>{combatPower.details.치명타확률}%</span>
            </div>
            <div className={styles.statsRow}>
              <span>다단히트 확률</span>
              <span className={styles.statsValue}>{combatPower.details.실제다단확률}%</span>
            </div>
            <div className={styles.statsRow}>
              <span>DPS 기본 점수</span>
              <span className={styles.statsValue}>{combatPower.details.DPS기본점수.toFixed(2)}</span>
            </div>
          </div>

          {/* 공식 */}
          <div className={styles.formula}>
            <span className={styles.formulaLabel}>계산식</span>
            <span className={styles.formulaText}>
              DPS × 다단히트 × 스킬보너스 × 1000
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
