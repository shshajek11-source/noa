'use client'

import { useMemo, useState } from 'react'
import { calculateCombatPowerFromStats, CombatPowerResult, extractCombatStats } from '../../lib/combatPower'
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
  const [showDebug, setShowDebug] = useState(false)

  // 스탯 집계
  const aggregatedStats = useMemo(() => {
    return aggregateStats(equipment, titles, daevanion, stats, equippedTitleId)
  }, [equipment, titles, daevanion, stats, equippedTitleId])

  // 전투력 계산용 스탯 추출
  const combatStats = useMemo(() => {
    return extractCombatStats(aggregatedStats, stats)
  }, [aggregatedStats, stats])

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

          {/* 디버그 토글 버튼 */}
          <button
            onClick={() => setShowDebug(!showDebug)}
            style={{
              marginTop: '0.75rem',
              padding: '0.4rem 0.8rem',
              background: showDebug ? '#EF4444' : '#374151',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              fontSize: '0.7rem',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            {showDebug ? '디버그 닫기' : '디버그 보기'}
          </button>

          {/* 디버그 패널 */}
          {showDebug && (
            <div style={{
              marginTop: '0.75rem',
              padding: '0.75rem',
              background: '#111318',
              border: '1px solid #374151',
              borderRadius: '6px',
              fontSize: '0.65rem',
              color: '#9CA3AF',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              <div style={{ color: '#FACC15', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                전투력 계산 디버그
              </div>

              {/* 입력 데이터 수 */}
              <div style={{ marginBottom: '0.5rem', padding: '0.5rem', background: '#1F2937', borderRadius: '4px' }}>
                <div style={{ color: '#60A5FA', marginBottom: '0.25rem' }}>입력 데이터</div>
                <div>장비 수: {equipment?.length || 0}개</div>
                <div>집계된 스탯 수: {aggregatedStats?.length || 0}개</div>
              </div>

              {/* 추출된 전투력 스탯 */}
              <div style={{ marginBottom: '0.5rem', padding: '0.5rem', background: '#1F2937', borderRadius: '4px' }}>
                <div style={{ color: '#10B981', marginBottom: '0.25rem' }}>추출된 스탯 (전투력 계산용) - 퍼센트만 사용</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
                  <div>공격력: {combatStats.공격력}</div>
                  <div>추가공격력: {combatStats.추가공격력}</div>
                  <div>공격력증가: +{combatStats.공격력증가}%</div>
                  <div>보스공격력: {combatStats.보스공격력}</div>
                  <div>PVE공격력: {combatStats.PVE공격력}</div>
                  <div style={{ color: '#F59E0B' }}>피해증폭: +{combatStats.피해증폭}%</div>
                  <div style={{ color: '#F59E0B' }}>PVE피해증폭: +{combatStats.PVE피해증폭}%</div>
                  <div style={{ color: '#F59E0B' }}>보스피해증폭: +{combatStats.보스피해증폭}%</div>
                  <div style={{ color: '#F59E0B' }}>무기피해증폭: +{combatStats.무기피해증폭}%</div>
                  <div>치명타: {combatStats.치명타}</div>
                  <div>정확: {combatStats.정확}</div>
                  <div style={{ color: '#F59E0B' }}>치명타피해증폭: +{combatStats.치명타피해증폭}%</div>
                  <div style={{ color: '#F59E0B' }}>전투속도: +{combatStats.전투속도}%</div>
                  <div style={{ color: '#F59E0B' }}>재사용감소: +{combatStats.재사용감소}%</div>
                  <div style={{ color: '#F59E0B' }}>강타: +{combatStats.강타}%</div>
                  <div style={{ color: '#F59E0B' }}>다단히트: +{combatStats.다단히트}%</div>
                </div>
              </div>

              {/* 집계된 모든 스탯 */}
              <div style={{ padding: '0.5rem', background: '#1F2937', borderRadius: '4px' }}>
                <div style={{ color: '#F59E0B', marginBottom: '0.25rem' }}>집계된 전체 스탯</div>
                <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                  {aggregatedStats.map((stat, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #374151', padding: '0.15rem 0' }}>
                      <span>{stat.name}</span>
                      <span style={{ color: '#E5E7EB' }}>
                        {stat.totalValue > 0 ? stat.totalValue : ''}
                        {stat.totalPercentage > 0 ? ` +${stat.totalPercentage}%` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
