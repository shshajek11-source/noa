/**
 * AION 2 실제 게임 능력치 통합 시스템
 * 기본 능력치 + 증가 수치 + 실제 게임 적용
 * 
 * 작성일: 2025-01-15
 * 파일: frontend/src/lib/realStatSystem.ts
 */

import { StatDetail, StatSource, StatBonusResult } from '../types/stats'
import { StatBonusCalculator } from './statBonusCalculator'
import { CombatClassifier, CombatClassification } from './combatClassifier'
import { getBaseStatsByClass, CLASS_BASE_STATS } from './baseStats'

/**
 * 실제 게임 능력치 계산 결과
 */
export interface RealStatResult {
  originalStat: StatDetail           // 원본 능력치
  realValue: number                 // 실제 게임 적용 수치
  bonusResult?: StatBonusResult     // 증가 계산 상세
  combatClassification: CombatClassification  // 전투 스타일 분석
  effectiveness: number             // 효율성 점수 (0-100)
  gameContribution: number           // 게임 기여도 점수
  recommendations: string[]          // 개선 추천
}

/**
 * 실제 게임 능력치 적용 시스템
 */
export class RealStatSystem {
  
  /**
   * 능력치에 실제 게임 증가 적용
   */
  static applyRealGameEffects(stats: StatDetail[], characterInfo: {
    className: string
    level: number
    combatStyle?: 'offensive' | 'defensive' | 'balanced'
  }): RealStatResult[] {
    // 기본 능력치 정보
    const baseStats = getBaseStatsByClass(this.normalizeClassId(characterInfo.className))
    
    if (!baseStats) {
      console.warn(`클래스 ${characterInfo.className}의 기본 능력치를 찾을 수 없습니다.`)
      return []
    }

    const results: RealStatResult[] = []

    stats.forEach(stat => {
      const result = this.calculateRealStatValue(
        stat,
        baseStats.baseStats,
        characterInfo.level,
        characterInfo.combatStyle
      )
      
      results.push(result)
    })

    return results
  }

  /**
   * 개별 능력치의 실제 게임 적용 수치 계산
   */
  private static calculateRealStatValue(
    stat: StatDetail,
    baseStats: any,
    level: number,
    combatStyle?: 'offensive' | 'defensive' | 'balanced'
  ): RealStatResult {
    // 1. 기본값 찾기
    const baseValue = this.findBaseStatValue(stat.name, baseStats)
    
    // 2. 증가 수치 계산
    const bonusPercentage = this.calculateBonusPercentage(stat, baseValue)
    const bonusResult = StatBonusCalculator.calculateStatBonus(
      stat.name,
      baseValue,
      bonusPercentage,
      '장비 및 스킬'
    )

    // 3. 전투 스타일 보너스 적용
    let styleMultiplier = 1.0
    if (combatStyle) {
      const styleStats = StatBonusCalculator.calculateCombatStyleBonus(
        combatStyle,
        { [stat.name]: bonusResult.totalValue }
      )
      styleMultiplier = styleStats[stat.name] / bonusResult.totalValue
    }

    // 4. 실제 게임 적용 수치
    const realValue = Math.floor(bonusResult.totalValue * styleMultiplier)

    // 5. 효율성 및 기여도 계산
    const effectiveness = this.calculateStatEffectiveness(stat.name, realValue, bonusPercentage)
    const gameContribution = this.calculateGameContribution(stat.name, realValue)

    // 6. 개선 추천 생성
    const recommendations = this.generateStatRecommendations(
      stat.name,
      realValue,
      effectiveness,
      bonusResult.isDiminishingReturns
    )

    return {
      originalStat: stat,
      realValue,
      bonusResult,
      combatClassification: {
        style: combatStyle || 'balanced',
        score: effectiveness,
        dominantType: this.determineDominanceType(stat.name),
        specialization: [],
        weaknesses: [],
        recommendations: [],
        roleSuggestion: ''
      },
      effectiveness,
      gameContribution,
      recommendations
    }
  }

  /**
   * 기본 능력치 값 찾기
   */
  private static findBaseStatValue(statName: string, baseStats: any): number {
    const statType = this.normalizeStatType(statName)
    
    // 직접 매칭
    if (baseStats[statType] !== undefined) {
      return baseStats[statType]
    }
    
    // 유사한 이름 매칭
    const similarStats = Object.entries(baseStats).filter(([key]) => 
      this.isSimilarStatName(statName, key)
    )
    
    if (similarStats.length > 0) {
      const value = similarStats[0][1]
      return typeof value === 'number' ? value : Number(value) || 0
    }
    
    // 기본값
    switch (statType) {
      case '공격력': return 100
      case '방어력': return 100
      case '치명타': return 100
      case '생명력': return 1000
      case '정신력': return 1000
      default: return 100
    }
  }

  /**
   * 능력치 타입 정규화
   */
  private static normalizeStatType(statName: string): string {
    const name = statName.toLowerCase()
    
    if (name.includes('공격력') || name.includes('위력') || name.includes('강타')) {
      return 'attack'
    }
    if (name.includes('방어력') || name.includes('막기') || name.includes('회피')) {
      return 'defense'
    }
    if (name.includes('치명타') || name.includes('완벽')) {
      return 'critical'
    }
    if (name.includes('명중') || name.includes('적중')) {
      return 'accuracy'
    }
    if (name.includes('생명력') || name.includes('체력')) {
      return 'health'
    }
    if (name.includes('정신력') || name.includes('마력')) {
      return 'mana'
    }
    if (name.includes('이동') || name.includes('속도')) {
      return 'speed'
    }
    if (name.includes('재생') || name.includes('회복')) {
      return 'regeneration'
    }
    
    return 'unknown'
  }

  /**
   * 능력치 이름 유사성 확인
   */
  private static isSimilarStatName(stat1: string, stat2: string): boolean {
    const s1 = stat1.toLowerCase().replace(/[^a-z0-9가-힣]/g, '')
    const s2 = stat2.toLowerCase().replace(/[^a-z0-9가-힣]/g, '')
    
    return s1.includes(s2) || s2.includes(s1) || 
           this.getJaroWinklerDistance(s1, s2) > 0.8
  }

  /**
   * 자로-윙클러 거리 계산 (문자열 유사도)
   */
  private static getJaroWinklerDistance(s1: string, s2: string): number {
    if (s1 === s2) return 1.0
    
    const len1 = s1.length
    const len2 = s2.length
    const maxLen = Math.max(len1, len2)
    
    if (maxLen === 0) return 1.0
    
    let matches = 0
    const halfLen = Math.floor(maxLen / 2)
    
    // 일치하는 문자 수 계산
    for (let i = 0; i < halfLen; i++) {
      if (s1[i] === s2[i]) matches++
    }
    
    for (let i = halfLen; i < maxLen; i++) {
      const idx1 = i - halfLen
      const idx2 = i - halfLen + len2 - len1
      
      if (idx1 >= 0 && idx2 >= 0 && s1[idx1] === s2[idx2]) {
        matches++
      }
    }
    
    return (matches / maxLen) * 2
  }

  /**
   * 증가 퍼센티지 계산
   */
  private static calculateBonusPercentage(stat: StatDetail, baseValue: number): number {
    if (baseValue === 0) return 0
    
    // 총 수치에서 기본값 제외
    const bonusValue = stat.totalValue - baseValue
    const percentage = (bonusValue / baseValue) * 100
    
    // 최소 0%, 최대 500%로 제한
    return Math.max(0, Math.min(500, Math.floor(percentage)))
  }

  /**
   * 능력치 효율성 계산
   */
  private static calculateStatEffectiveness(statName: string, realValue: number, bonusPercentage: number): number {
    const statType = this.normalizeStatType(statName)
    
    // 기준값 설정
    const benchmarks: Record<string, { min: number, optimal: number, max: number }> = {
      attack: { min: 500, optimal: 1500, max: 2500 },
      defense: { min: 300, optimal: 1200, max: 2000 },
      critical: { min: 100, optimal: 400, max: 800 },
      accuracy: { min: 200, optimal: 600, max: 1200 },
      health: { min: 3000, optimal: 8000, max: 15000 },
      mana: { min: 2000, optimal: 5000, max: 10000 },
      speed: { min: 50, optimal: 120, max: 200 },
      regeneration: { min: 10, optimal: 50, max: 100 }
    }
    
    const benchmark = benchmarks[statType]
    if (!benchmark) return 50 // 기본값

    // 효율성 점수 계산 (0-100)
    let score = 50 // 기본 점수
    
    if (realValue < benchmark.min) {
      score = 20 // 너무 낮음
    } else if (realValue >= benchmark.optimal && realValue < benchmark.max) {
      score = 90 // 최적 범위
      if (realValue >= benchmark.optimal * 1.2) {
        score = 100 // 매우 높음
      }
    } else if (realValue >= benchmark.max) {
      score = 70 // 수확 체감 시작
    } else if (realValue >= benchmark.optimal * 0.7) {
      score = 75 // 좋은 수준
    } else if (realValue >= benchmark.min * 1.5) {
      score = 60 // 보통 수준
    }
    
    // 증가 퍼센티지에 따른 보너스/페널티
    if (bonusPercentage > 100) score += Math.min(10, (bonusPercentage - 100) / 20)
    if (bonusPercentage < 20) score -= 10
    
    return Math.max(0, Math.min(100, Math.floor(score)))
  }

  /**
   * 게임 기여도 점수 계산
   */
  private static calculateGameContribution(statName: string, realValue: number): number {
    const statType = this.normalizeStatType(statName)
    
    // 능력치별 게임 영향도 가중치
    const contributionWeights: Record<string, number> = {
      attack: 25,       // 공격력은 게임에 매우 중요
      defense: 20,       // 방어력은 중요
      critical: 15,      // 치명타는 중요
      accuracy: 12,      // 명중은 중요
      health: 18,        // 생명력은 중요
      mana: 10,          // 정신력은 보통
      speed: 8,          // 속도는 보통
      regeneration: 5     // 재생은 덜 중요
    }
    
    const weight = contributionWeights[statType] || 5
    
    // 기여도 점수 계산
    const normalizedValue = Math.log(realValue + 1) / Math.log(1000) // 로그 정규화
    const contribution = Math.floor(normalizedValue * weight)
    
    return Math.max(0, Math.min(100, contribution))
  }

  /**
   * 우세 타입 결정
   */
  private static determineDominanceType(statName: string): 'physical' | 'magical' | 'hybrid' {
    const name = statName.toLowerCase()
    
    const physicalStats = ['공격력', '위력', '강타', '방어력', '막기', '회피', '생명력']
    const magicalStats = ['마법 증폭력', '정신력', '마법 정확도', '마법 저항력', '시전 속도']
    
    const isPhysical = physicalStats.some(stat => name.includes(stat))
    const isMagical = magicalStats.some(stat => name.includes(stat))
    
    if (isPhysical && isMagical) return 'hybrid'
    if (isPhysical) return 'physical'
    if (isMagical) return 'magical'
    
    return 'hybrid' // 기본값
  }

  /**
   * 클래스 ID 정규화
   */
  private static normalizeClassId(className: string): string {
    const classMappings: Record<string, string> = {
      '검성': '6',
      'Gladiator': '6',
      '수호성': '10',
      'Templar': '10',
      '궁성': '14',
      'Ranger': '14',
      '살성': '18',
      'Assassin': '18',
      '정령성': '22',
      'Spiritmaster': '22',
      '마도성': '26',
      'Sorcerer': '26',
      '치유성': '30',
      'Cleric': '30',
      '호법성': '34',
      'Chanter': '34'
    }
    
    return classMappings[className] || className
  }

  /**
   * 능력치 개선 추천 생성
   */
  private static generateStatRecommendations(
    statName: string,
    realValue: number,
    effectiveness: number,
    isDiminishingReturns: boolean
  ): string[] {
    const recommendations: string[] = []
    
    if (effectiveness < 30) {
      recommendations.push(`${statName}이(가) 너무 낮습니다. 장비 개선이 필요합니다.`)
    } else if (effectiveness >= 90) {
      recommendations.push(`${statName}은(는) 최적 수준입니다.`)
    }
    
    if (isDiminishingReturns) {
      recommendations.push(`${statName}이(가) 수확 체감 구간에 도달했습니다. 다른 능력치 투자를 고려하세요.`)
    }
    
    const statType = this.normalizeStatType(statName)
    switch (statType) {
      case 'attack':
        if (realValue < 800) {
          recommendations.push('공격력을 높이기 위해 물리 공격 장비를 강화하세요.')
        }
        break
      case 'defense':
        if (realValue < 600) {
          recommendations.push('방어력을 높이기 위해 방어 장비와 막기 장비를 강화하세요.')
        }
        break
      case 'critical':
        if (realValue < 200) {
          recommendations.push('치명타를 높이기 위해 치명타 장비와 옵션을 강화하세요.')
        }
        break
      case 'health':
        if (realValue < 5000) {
          recommendations.push('생명력을 높이기 위해 체력 관련 장비를 강화하세요.')
        }
        break
    }
    
    return recommendations
  }

  /**
   * 실제 게임 능력치 분석 보고 생성
   */
  static generateAnalysisReport(realStats: RealStatResult[]): {
    summary: {
      totalStats: number
      averageEffectiveness: number
      highPerformers: string[]
      lowPerformers: string[]
      optimizationPotential: number
    }
    combatStyle: CombatClassification
    detailedStats: Array<{
      name: string
      originalValue: number
      realValue: number
      effectiveness: number
      gameContribution: number
      bonus: StatBonusResult | undefined
      recommendations: string[]
    }>
  } {
    const validStats = realStats.filter(rs => rs.bonusResult)
    
    if (validStats.length === 0) {
      return {
        summary: {
          totalStats: 0,
          averageEffectiveness: 0,
          highPerformers: [],
          lowPerformers: [],
          optimizationPotential: 0
        },
        combatStyle: {
          style: 'balanced',
          score: 0,
          dominantType: 'hybrid',
          specialization: [],
          weaknesses: [],
          recommendations: [],
          roleSuggestion: ''
        },
        detailedStats: []
      }
    }

    // 종합 분석
    const totalStats = validStats.length
    const averageEffectiveness = Math.floor(
      validStats.reduce((sum, rs) => sum + rs.effectiveness, 0) / totalStats
    )
    
    const highPerformers = validStats
      .filter(rs => rs.effectiveness >= 85)
      .map(rs => rs.originalStat.name)
    
    const lowPerformers = validStats
      .filter(rs => rs.effectiveness < 40)
      .map(rs => rs.originalStat.name)
    
    const lowPerformerStats = validStats.filter(rs => rs.effectiveness < 40)
    const optimizationPotential = Math.floor(
      lowPerformerStats.reduce((sum, rs) => sum + (100 - rs.effectiveness), 0) / 
      Math.max(1, lowPerformerStats.length)
    )

    // 상세 정보
    const detailedStats = validStats.map(rs => ({
      name: rs.originalStat.name,
      originalValue: rs.originalStat.totalValue,
      realValue: rs.realValue,
      effectiveness: rs.effectiveness,
      gameContribution: rs.gameContribution,
      bonus: rs.bonusResult,
      recommendations: rs.recommendations
    }))

    // 전투 스타일 분석
    const combatStyle = CombatClassifier.classify(realStats.map(rs => rs.originalStat))

    return {
      summary: {
        totalStats,
        averageEffectiveness,
        highPerformers,
        lowPerformers,
        optimizationPotential
      },
      combatStyle,
      detailedStats
    }
  }
}

export default RealStatSystem