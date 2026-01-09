'use client'
import { useState, useMemo, useEffect } from 'react'
import { aggregateStats } from '../../lib/statsAggregator'
import { validateCharacterStats, generateUserMessage, DEBUG_CONFIG, StatsValidationCache } from '../../lib/statsValidator'
import { RealStatSystem } from '../../lib/realStatSystem'
import { StatBonusCalculator } from '../../lib/statBonusCalculator'
import { CombatClassifier } from '../../lib/combatClassifier'
import StatTooltip from './StatTooltip'
import type { StatCategory } from '../../types/stats'

interface StatsSummaryViewProps {
  stats: any
  equipment: any[]
  daevanion: any
  titles: any
  equippedTitleId?: number
  characterId?: string
  serverId?: string
}

const CATEGORY_TABS: { id: StatCategory, label: string, icon: string }[] = [
  { id: 'attack', label: '공격', icon: '⚔️' },
  { id: 'defense', label: '방어', icon: '🛡️' },
  { id: 'utility', label: '유틸', icon: '✨' },
]

// 퍼센트만 표시할 스탯들 (고정값 숨김)
const PERCENTAGE_ONLY_STATS = new Set([
  '전투 속도',
  '이동 속도',
  '피해 증폭',
  '피해 내성',
  '치명타 피해 증폭',
  '치명타 피해 내성',
  '다단 히트 적중',
  '다단 히트 저항',
  '완벽',
  '완벽 저항',
  '재생',
  '재생 관통',
  '철벽',
  '철벽 관통',
  '재사용 시간',
  '재사용 시간 감소',
])

export default function StatsSummaryView({ stats, equipment, daevanion, titles, equippedTitleId, characterId, serverId }: StatsSummaryViewProps) {
  const [activeCategory, setActiveCategory] = useState<StatCategory>('attack')
  const [debugMode, setDebugMode] = useState(DEBUG_CONFIG.enabled)
  const [validationResult, setValidationResult] = useState<any>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [showRealStats, setShowRealStats] = useState(false)

  // 스탯 집계
  const aggregatedStats = useMemo(() => {
    return aggregateStats(equipment, titles, daevanion, stats, equippedTitleId)
  }, [equipment, titles, daevanion, stats, equippedTitleId])

  // 디버그: 장비 데이터 표시
  const [showDebugPanel, setShowDebugPanel] = useState(false)

  const getDebugData = () => {
    if (!equipment?.length) return '장비 데이터 없음'

    // 모든 장비의 돌파 상태 확인
    const allEquipBreakthrough = equipment.map(item => ({
      slot: item.slot,
      name: item.name,
      enhancement: item.enhancement,
      breakthrough: item.breakthrough,
    }))

    return {
      '★★★ 전체 장비 돌파 현황': allEquipBreakthrough,
    }
  }

  // 실제 게임 능력치 적용
  const realStats = useMemo(() => {
    if (!characterId || !showRealStats) return []
    
    const characterInfo = {
      className: stats?.profile?.className || '알 수 없음',
      level: stats?.profile?.characterLevel || 45,
      combatStyle: 'balanced' as const
    }
    
    return RealStatSystem.applyRealGameEffects(aggregatedStats, characterInfo)
  }, [characterId, showRealStats, aggregatedStats, stats])

  // 전투 스타일 분석
  const combatAnalysis = useMemo(() => {
    if (!showRealStats || realStats.length === 0) return null
    
    return CombatClassifier.classify(realStats.map(rs => rs.originalStat))
  }, [showRealStats, realStats])

  // 능력치 검증
  useEffect(() => {
    if (!DEBUG_CONFIG.enabled || !characterId || !serverId) return

    const validationKey = `${characterId}-${serverId}`
    
    // 캐시 확인
    const cached = StatsValidationCache.get(validationKey)
    if (cached) {
      setValidationResult(cached)
      return
    }

    const performValidation = async () => {
      setIsValidating(true)
      try {
        const result = await validateCharacterStats(characterId, serverId, aggregatedStats)
        setValidationResult(result)
        StatsValidationCache.set(validationKey, result)
        
        if (DEBUG_CONFIG.logLevel === 'debug' || DEBUG_CONFIG.logLevel === 'info') {
          console.log(`[${characterId}] 능력치 검증 결과:`, generateUserMessage(result))
        }
      } catch (error) {
        console.error(`[${characterId}] 능력치 검증 실패:`, error)
      } finally {
        setIsValidating(false)
      }
    }

    // 자동 검증이 활성화된 경우에만 실행
    if (DEBUG_CONFIG.autoValidation) {
      performValidation()
    }
  }, [characterId, serverId, aggregatedStats, DEBUG_CONFIG.enabled, DEBUG_CONFIG.autoValidation])

  // 표시할 능력치 선택
  const displayStats = useMemo(() => {
    if (showRealStats && realStats.length > 0) {
      return realStats.map(rs => ({
        ...rs.originalStat,
        totalValue: rs.realValue,
        sources: {
          ...rs.originalStat.sources,
          equipment: [
            ...(rs.originalStat.sources.equipment || []),
            // 실제 보너스 정보 추가
            ...(rs.bonusResult ? [{
              name: `실제 적용 (${rs.bonusResult.source})`,
              value: rs.bonusResult.bonusValue,
              percentage: rs.bonusResult.increasePercentage
            }] : [])
          ]
        }
      }))
    }
    return aggregatedStats
  }, [showRealStats, realStats, aggregatedStats])

  // 카테고리별 필터링
  const filteredStats = useMemo(() => {
    if (activeCategory === 'all') {
      return displayStats
    }
    return displayStats.filter(stat => stat.category === activeCategory)
  }, [displayStats, activeCategory])

  return (
    <div style={{
        background: '#111318',
        border: '1px solid #1F2433',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        height: 'auto', // 고정 높이 제거
        overflow: 'hidden'
      }}>
       {/* 헤더 */}
      <div style={{
        padding: '0.75rem 1rem',
        borderBottom: '1px solid #1F2433',
        background: '#0B0D12',
        color: '#E5E7EB',
        fontSize: '0.95rem',
        fontWeight: 'bold',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>📊 능력치 통합 뷰</span>
        <div style={{ 
          fontSize: '0.8rem', 
          color: '#6B7280', 
          fontWeight: 'normal',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <span>총 {filteredStats.length}개</span>
          
          {/* 실제 능력치 모드 토글 */}
          {characterId && (
            <button
              onClick={() => setShowRealStats(!showRealStats)}
              style={{
                padding: '0.25rem 0.5rem',
                background: showRealStats ? '#059669' : 'transparent',
                color: showRealStats ? '#FFFFFF' : '#6B7280',
                border: showRealStats ? '1px solid #059669' : '1px solid #374151',
                borderRadius: '4px',
                fontSize: '0.7rem',
                cursor: 'pointer'
              }}
            >
              {showRealStats ? '실제 적용 ON' : '실제 적용 OFF'}
            </button>
          )}
          
          {/* 디버그 모드 토글 */}
          {DEBUG_CONFIG.enabled && (
            <button
              onClick={() => setDebugMode(!debugMode)}
              style={{
                padding: '0.25rem 0.5rem',
                background: debugMode ? '#2563EB' : 'transparent',
                color: debugMode ? '#FFFFFF' : '#6B7280',
                border: debugMode ? '1px solid #3B82F6' : '1px solid #374151',
                borderRadius: '4px',
                fontSize: '0.7rem',
                cursor: 'pointer'
              }}
            >
              {debugMode ? '디버그 ON' : '디버그 OFF'}
            </button>
          )}

          {/* 장비 데이터 디버그 버튼 */}
          <button
            onClick={() => setShowDebugPanel(!showDebugPanel)}
            style={{
              padding: '0.25rem 0.5rem',
              background: showDebugPanel ? '#DC2626' : '#7C3AED',
              color: '#FFFFFF',
              border: '1px solid #8B5CF6',
              borderRadius: '4px',
              fontSize: '0.7rem',
              cursor: 'pointer'
            }}
          >
            {showDebugPanel ? '❌ 닫기' : '🔍 장비데이터'}
          </button>

          {/* 검증 상태 표시 */}
          {characterId && serverId && isValidating && (
            <span style={{ color: '#F59E0B' }}>검증 중...</span>
          )}
          
          {validationResult && !validationResult.isValid && (
            <span style={{ color: '#EF4444' }}>
              {validationResult.inconsistencies.length}개 불일치
            </span>
          )}
          
          {validationResult && validationResult.isValid && (
            <span style={{ color: '#10B981' }}>
              검증 통과 ({validationResult.accuracy}%)
            </span>
          )}
          
          {/* 실제 능력치 요약 */}
          {showRealStats && realStats.length > 0 && combatAnalysis && (
            <span style={{ color: '#059669' }}>
              {CombatClassifier.getStyleDisplayName(combatAnalysis.style)} (
              {combatAnalysis.score}점)
            </span>
          )}
        </div>
      </div>

      {/* 디버그 패널 */}
      {showDebugPanel && (
        <div style={{
          padding: '1rem',
          background: '#1a1a2e',
          borderBottom: '1px solid #3B82F6',
          maxHeight: '400px',
          overflow: 'auto',
          fontSize: '0.75rem',
          fontFamily: 'monospace'
        }}>
          <div style={{ color: '#F59E0B', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            📦 주무기 RAW 데이터 (복사해서 보내주세요)
          </div>
          <pre style={{
            background: '#0a0a15',
            padding: '0.75rem',
            borderRadius: '4px',
            color: '#10B981',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            userSelect: 'all'
          }}>
            {JSON.stringify(getDebugData(), null, 2)}
          </pre>
        </div>
      )}

      {/* 카테고리 탭 */}
      <div style={{
        display: 'flex',
        gap: '0.25rem',
        padding: '0.5rem',
        borderBottom: '1px solid #1F2433',
        background: '#0A0C10',
        flexShrink: 0,
        overflowX: 'auto'
      }}>
        {CATEGORY_TABS.map(tab => {
          const isActive = activeCategory === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              style={{
                padding: '0.35rem 0.75rem',
                background: isActive
                  ? 'linear-gradient(180deg, #2563EB 0%, #1D4ED8 100%)'
                  : 'transparent',
                color: isActive ? '#FFFFFF' : '#9CA3AF',
                border: isActive ? '1px solid #3B82F6' : '1px solid transparent',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: isActive ? '600' : 'normal',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = '#1F2433'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

       {/* 검증 결과 경고 */}
       {debugMode && validationResult && !validationResult.isValid && (
        <div style={{
          padding: '0.75rem 1rem',
          background: 'rgba(239, 68, 68, 0.1)',
          borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#EF4444',
          fontSize: '0.8rem'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
            ⚠️ 능력치 불일치 감지
          </div>
          <div>정확도: {validationResult.accuracy}%</div>
          {validationResult.inconsistencies.slice(0, 3).map((inconsistency: any, index: number) => (
            <div key={index} style={{ marginTop: '0.25rem' }}>
              • {inconsistency.statName}: {inconsistency.calculatedValue} → {inconsistency.actualValue} (차이: {inconsistency.difference})
            </div>
          ))}
          {validationResult.inconsistencies.length > 3 && (
            <div style={{ marginTop: '0.25rem' }}>
              ... 그 외 {validationResult.inconsistencies.length - 3}개 항목
            </div>
          )}
        </div>
       )}

       {/* 스탯 리스트 - 3열 그리드 (컴팩트) */}
      <div style={{
        padding: '0.75rem',
        background: '#0F1116'
      }}>
        {filteredStats.length === 0 ? (
          <div style={{
            padding: '2rem 1rem',
            textAlign: 'center',
            color: '#6B7280',
            fontSize: '0.85rem'
          }}>
            데이터 없음
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)', // 3열
            gap: '0.5rem',
            alignContent: 'start'
          }}>
            {filteredStats.map(stat => {
              // 불일치 여부 확인
              const inconsistency = validationResult?.inconsistencies?.find((inc: any) => inc.statName === stat.name)
              
              return (
                <StatTooltip key={stat.name} stat={stat}>
                  <div
                    style={{
                      background: inconsistency ? 'rgba(239, 68, 68, 0.1)' : '#1A1D26',
                      borderRadius: '4px',
                      padding: '0.5rem 0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.15rem',
                      border: inconsistency ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid #2D3748',
                      transition: 'background 0.2s',
                      cursor: 'pointer',
                      height: '100%',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = inconsistency ? 'rgba(239, 68, 68, 0.2)' : '#252936'
                      e.currentTarget.style.borderColor = inconsistency ? 'rgba(239, 68, 68, 0.7)' : '#4B5563'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = inconsistency ? 'rgba(239, 68, 68, 0.1)' : '#1A1D26'
                      e.currentTarget.style.borderColor = inconsistency ? 'rgba(239, 68, 68, 0.5)' : '#2D3748'
                    }}
                  >
                    {/* 불일치 표시기 */}
                    {debugMode && inconsistency && (
                      <div style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        width: '8px',
                        height: '8px',
                        background: '#EF4444',
                        borderRadius: '50%',
                        fontSize: '0.6rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                      }}>
                        !
                      </div>
                    )}

                    {/* 라벨 */}
                    <div style={{
                      fontSize: '0.75rem',
                      color: inconsistency ? '#EF4444' : '#9CA3AF',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      <div style={{
                        width: '3px',
                        height: '10px',
                        background: inconsistency ? '#EF4444' : stat.color,
                        borderRadius: '1px'
                      }} />
                      {stat.name}
                    </div>

                    {/* 값 */}
                    <div style={{
                      fontSize: '0.9rem',
                      color: inconsistency ? '#FCA5A5' : '#F3F4F6',
                      fontWeight: 'bold',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.1rem'
                    }}>
                      {/* 메인 값 */}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                        {/* 퍼센트 기반 스탯은 퍼센트만 표시, 고정값 숨김 */}
                        {PERCENTAGE_ONLY_STATS.has(stat.name) ? (
                          // 퍼센트 기반 스탯: 퍼센트만 크게 표시
                          <span style={{ color: inconsistency ? '#FCA5A5' : '#F3F4F6' }}>
                            +{(stat.totalPercentage + stat.totalValue).toFixed(1)}%
                          </span>
                        ) : (
                          // 일반 스탯: 고정값 + 퍼센트 표시
                          <>
                            {stat.totalValue > 0 && stat.totalValue.toLocaleString()}
                            {stat.totalPercentage > 0 && (
                              <span style={{
                                fontSize: stat.totalValue > 0 ? '0.75rem' : '0.9rem',
                                color: inconsistency ? '#FCA5A5' : '#F3F4F6'
                              }}>
                                +{stat.totalPercentage.toFixed(1)}%
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      
                      {/* 실제 적용 증가 표시 */}
                      {showRealStats && realStats.length > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#059669' }}>
                          {(() => {
                            const realStat = realStats.find(rs => rs.originalStat.name === stat.name)
                            if (realStat && realStat.bonusResult) {
                              const { bonusValue, increasePercentage } = realStat.bonusResult
                              return `실제 적용: +${bonusValue.toLocaleString()} (${increasePercentage}%)`
                            }
                            return ''
                          })()}
                        </div>
                      )}
                    </div>

                    {/* 디버그 정보 */}
                    {debugMode && (
                      <div style={{
                        fontSize: '0.6rem',
                        color: '#6B7280',
                        marginTop: '0.25rem',
                        borderTop: '1px solid #2D3748',
                        paddingTop: '0.25rem'
                      }}>
                        {inconsistency ? `실제: ${inconsistency.actualValue}` : '검증됨'}
                      </div>
                    )}
                  </div>
                </StatTooltip>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
