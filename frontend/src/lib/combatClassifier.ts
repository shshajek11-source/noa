/**
 * AION 2 전투 계열 분류 시스템
 * 
 * 작성일: 2025-01-15
 * 파일: frontend/src/lib/combatClassifier.ts
 */

import { StatDetail } from '../types/stats'

/**
 * 전투 스타일 타입
 */
export type CombatStyle = 'offensive' | 'defensive' | 'balanced' | 'support' | 'mixed'

/**
 * 능력치 분류 결과
 */
export interface CombatClassification {
  style: CombatStyle
  score: number              // 스타일 일치도 점수 (0-100)
  dominantType: 'physical' | 'magical' | 'hybrid'
  specialization: string[]    // 특화 능력치 목록
  weaknesses: string[]       // 약점 능력치 목록
  recommendations: string[]  // 개선 추천
  roleSuggestion: string     // 추천 역할
}

/**
 * 전투 계열별 능력치 가중치
 */
const COMBAT_STYLE_WEIGHTS = {
  offensive: {
    // 물리 공격형
    physical: {
      '공격력': 1.5,
      '위력': 1.4,
      '치명타': 1.3,
      '명중': 1.1,
      '공격 속도': 1.2,
      '치명타 공격력': 1.2
    },
    // 마법 공격형
    magical: {
      '마법 증폭력': 1.5,
      '정신력': 1.3,
      '마법 정확도': 1.2,
      '시전 속도': 1.2,
      '정신력 소모량 감소': 0.8
    }
  },
  
  defensive: {
    // 물리 방어형
    physical: {
      '방어력': 1.5,
      '생명력': 1.4,
      '막기': 1.3,
      '회피': 1.2,
      '철벽': 1.2,
      '치명타 저항': 1.1,
      '완벽 저항': 1.1
    },
    // 마법 방어형
    magical: {
      '마법 저항력': 1.5,
      '생명력': 1.3,
      '정신력': 1.2,
      '재생': 1.1,
      '정신력 소모량 감소': 0.8
    }
  },
  
  balanced: {
    // 균형형
    physical: {
      '공격력': 1.0,
      '방어력': 1.0,
      '생명력': 1.0,
      '치명타': 1.0,
      '명중': 1.0
    },
    magical: {
      '마법 증폭력': 1.0,
      '정신력': 1.0,
      '마법 정확도': 1.0,
      '방어력': 1.0
    }
  },
  
  support: {
    // 서포트형
    physical: {
      '이동 속도': 1.3,
      '전투 속도': 1.2,
      '재생': 1.2,
      '생명력': 1.1
    },
    magical: {
      '정신력': 1.4,
      '재생': 1.3,
      '시전 속도': 1.1,
      '정신력 소모량 감소': 1.2
    }
  }
}

/**
 * 능력치 타입 분류
 */
export class CombatClassifier {
  /**
   * 능력치를 전투 계열로 분류
   */
  static classify(stats: StatDetail[]): CombatClassification {
    // 능력치 종류별 그룹화
    const groupedStats = this.groupStatsByType(stats)
    
    // 물리/마법 우세성 판단
    const dominance = this.determineDominance(groupedStats)
    
    // 각 전투 스타일 점수 계산
    const styleScores = this.calculateStyleScores(groupedStats, dominance)
    
    // 최적 스타일 결정
    const bestStyle = this.determineBestStyle(styleScores)
    
    // 특화 및 약점 분석
    const specialization = this.analyzeSpecialization(groupedStats, bestStyle)
    const weaknesses = this.analyzeWeaknesses(groupedStats, bestStyle)
    
    // 개선 추천
    const recommendations = this.generateRecommendations(specialization, weaknesses)
    
    // 역할 추천
    const roleSuggestion = this.suggestRole(bestStyle, dominance, specialization)

    return {
      style: bestStyle,
      score: styleScores[bestStyle],
      dominantType: dominance,
      specialization,
      weaknesses,
      recommendations,
      roleSuggestion
    }
  }

  /**
   * 능력치를 타입별로 그룹화
   */
  private static groupStatsByType(stats: StatDetail[]): Record<string, number[][]> {
    const groups: Record<string, number[][]> = {}
    
    stats.forEach(stat => {
      const category = this.getStatCategory(stat.name)
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push([
        stat.totalValue,
        stat.totalPercentage
      ])
    })
    
    return groups
  }

  /**
   * 능력치 카테고리 분류
   */
  private static getStatCategory(statName: string): string {
    const name = statName.toLowerCase()
    
    // 공격 계열
    if (name.includes('공격력') || name.includes('위력') || 
        name.includes('강타') || name.includes('공격 속도')) {
      return 'physical_attack'
    }
    
    if (name.includes('마법 증폭력') || name.includes('마법 공격력')) {
      return 'magical_attack'
    }
    
    // 방어 계열
    if (name.includes('방어력') || name.includes('막기') || 
        name.includes('회피') || name.includes('철벽') ||
        name.includes('치명타 저항') || name.includes('완벽 저항')) {
      return 'physical_defense'
    }
    
    if (name.includes('마법 저항력')) {
      return 'magical_defense'
    }
    
    // 치명 계열
    if (name.includes('치명타') || name.includes('치명타 공격력')) {
      return 'critical'
    }
    
    // 유틸리티
    if (name.includes('정신력') || name.includes('이동 속도') ||
        name.includes('전투 속도') || name.includes('시전 속도') ||
        name.includes('재생') || name.includes('정신력 소모량')) {
      return 'utility'
    }
    
    // 생존
    if (name.includes('생명력') || name.includes('체력') ||
        name.includes('hp') || name.includes('hp')) {
      return 'survival'
    }
    
    // 정확성
    if (name.includes('명중') || name.includes('마법 정확도') ||
        name.includes('적중')) {
      return 'accuracy'
    }
    
    return 'other'
  }

  /**
   * 물리/마법 우세성 판단
   */
  private static determineDominance(groupedStats: Record<string, number[][]>): 'physical' | 'magical' | 'hybrid' {
    const physicalAttack = this.sumCategoryValues(groupedStats, ['physical_attack'])
    const magicalAttack = this.sumCategoryValues(groupedStats, ['magical_attack'])
    
    const physicalDefense = this.sumCategoryValues(groupedStats, ['physical_defense', 'survival'])
    const magicalDefense = this.sumCategoryValues(groupedStats, ['magical_defense'])
    
    const physicalTotal = physicalAttack + physicalDefense
    const magicalTotal = magicalAttack + magicalDefense
    
    const threshold = 0.6 // 60% 이상이면 해당 타입으로 판단
    
    if (physicalTotal >= magicalTotal * (1 + threshold)) {
      return 'physical'
    } else if (magicalTotal >= physicalTotal * (1 + threshold)) {
      return 'magical'
    } else {
      return 'hybrid'
    }
  }

  /**
   * 카테고리 값 합산
   */
  private static sumCategoryValues(groupedStats: Record<string, number[][]>, categories: string[]): number {
    return categories.reduce((sum, category) => {
      const values = groupedStats[category] || []
      return sum + values.reduce((catSum, [value, percentage]) => catSum + value + percentage, 0)
    }, 0)
  }

  /**
   * 전투 스타일 점수 계산
   */
  private static calculateStyleScores(
    groupedStats: Record<string, number[][]>,
    dominance: 'physical' | 'magical' | 'hybrid'
  ): Record<CombatStyle, number> {
    const scores: Record<CombatStyle, number> = {
      offensive: 0,
      defensive: 0,
      balanced: 0,
      support: 0,
      mixed: 0
    }

    // 각 스타일별 점수 계산
    Object.entries(COMBAT_STYLE_WEIGHTS).forEach(([style, weights]) => {
      let score = 0
      
      // 물리 능력치 점수
      Object.entries(weights.physical).forEach(([statName, weight]) => {
        const category = this.getStatCategory(statName)
        const values = groupedStats[category] || []
        score += values.reduce((sum, [value]) => sum + value, 0) * weight
      })
      
      // 마법 능력치 점수
      Object.entries(weights.magical).forEach(([statName, weight]) => {
        const category = this.getStatCategory(statName)
        const values = groupedStats[category] || []
        score += values.reduce((sum, [value]) => sum + value, 0) * weight
      })
      
      // 우세성 보너스
      if (style === 'offensive' && dominance === 'physical') score *= 1.2
      if (style === 'offensive' && dominance === 'magical') score *= 1.2
      if (style === 'defensive' && dominance === 'physical') score *= 1.1
      if (style === 'defensive' && dominance === 'magical') score *= 1.1
      
      scores[style as CombatStyle] = Math.floor(score)
    })

    return scores
  }

  /**
   * 최적 스타일 결정
   */
  private static determineBestStyle(scores: Record<CombatStyle, number>): CombatStyle {
    const maxScore = Math.max(...Object.values(scores))
    const bestStyles = Object.entries(scores)
      .filter(([_, score]) => score >= maxScore * 0.9) // 90% 이상인 스타일들
      .map(([style]) => style as CombatStyle)
    
    // 여러 스타일이 비슷한 점수를 받은 경우
    if (bestStyles.length === 1) {
      return bestStyles[0]
    } else if (bestStyles.includes('balanced')) {
      return 'balanced'
    } else if (bestStyles.includes('offensive')) {
      return 'offensive'
    } else if (bestStyles.includes('defensive')) {
      return 'defensive'
    } else {
      return 'mixed'
    }
  }

  /**
   * 특화 능력치 분석
   */
  private static analyzeSpecialization(
    groupedStats: Record<string, number[][]>,
    style: CombatStyle
  ): string[] {
    const specialization: string[] = []
    
    // 상위 능력치 식별 (평균 이상)
    const allValues = Object.values(groupedStats).flat()
    const avgValue = allValues.reduce((sum, [value]) => sum + value, 0) / allValues.length
    
    Object.entries(groupedStats).forEach(([category, values]) => {
      const categoryTotal = values.reduce((sum, [value]) => sum + value, 0)
      if (categoryTotal > avgValue * 1.2) { // 평균의 120% 이상
        const statName = this.getRepresentativeStatName(category)
        if (statName) {
          specialization.push(statName)
        }
      }
    })
    
    return specialization
  }

  /**
   * 약점 능력치 분석
   */
  private static analyzeWeaknesses(
    groupedStats: Record<string, number[][]>,
    style: CombatStyle
  ): string[] {
    const weaknesses: string[] = []
    
    // 스타일에 중요한 능력치들이 부족한지 확인
    const importantStats = this.getImportantStatsForStyle(style)
    
    importantStats.forEach(([category, statName, threshold]) => {
      const values = groupedStats[category] || []
      const total = values.reduce((sum, [value]) => sum + value, 0)
      
      if (total < threshold) {
        weaknesses.push(statName)
      }
    })
    
    return weaknesses
  }

  /**
   * 스타일별 중요 능력치 목록
   */
  private static getImportantStatsForStyle(style: CombatStyle): Array<[string, string, number]> {
    switch (style) {
      case 'offensive':
        return [
          ['physical_attack', '공격력', 500],
          ['magical_attack', '마법 증폭력', 400],
          ['critical', '치명타', 300],
          ['accuracy', '명중', 300]
        ]
      case 'defensive':
        return [
          ['physical_defense', '방어력', 600],
          ['magical_defense', '마법 저항력', 400],
          ['survival', '생명력', 5000],
          ['critical', '치명타 저항', 200]
        ]
      case 'balanced':
        return [
          ['physical_attack', '공격력', 400],
          ['physical_defense', '방어력', 400],
          ['critical', '치명타', 250],
          ['accuracy', '명중', 250]
        ]
      case 'support':
        return [
          ['utility', '이동 속도', 120],
          ['utility', '전투 속도', 100],
          ['survival', '생명력', 4000],
          ['utility', '정신력', 3000]
        ]
      default:
        return []
    }
  }

  /**
   * 개선 추천 생성
   */
  private static generateRecommendations(
    specialization: string[],
    weaknesses: string[]
  ): string[] {
    const recommendations: string[] = []
    
    if (weaknesses.length > 0) {
      recommendations.push(`${weaknesses.join(', ')} 능력치를 보완하세요`)
    }
    
    if (specialization.length > 0) {
      recommendations.push(`${specialization.join(', ')}에 특화된 빌드입니다`)
    }
    
    return recommendations
  }

  /**
   * 역할 추천
   */
  private static suggestRole(
    style: CombatStyle,
    dominance: 'physical' | 'magical' | 'hybrid',
    specialization: string[]
  ): string {
    const hasHighDamage = specialization.some(s => s.includes('공격력') || s.includes('치명타'))
    const hasHighDefense = specialization.some(s => s.includes('방어력') || s.includes('생명력'))
    const hasSupport = specialization.some(s => s.includes('이동') || s.includes('재생'))
    
    if (style === 'offensive' && hasHighDamage) {
      return dominance === 'magical' ? '마법 딜러' : '물리 딜러'
    } else if (style === 'defensive' && hasHighDefense) {
      return dominance === 'magical' ? '마법 탱커' : '물리 탱커'
    } else if (style === 'balanced') {
      return '밸런스형 전사'
    } else if (style === 'support' || hasSupport) {
      return '서포터'
    } else {
      return '멀티플레이어'
    }
  }

  /**
   * 카테고리 대표 능력치명
   */
  private static getRepresentativeStatName(category: string): string | null {
    const representativeStats: Record<string, string> = {
      'physical_attack': '공격력',
      'magical_attack': '마법 증폭력',
      'physical_defense': '방어력',
      'magical_defense': '마법 저항력',
      'critical': '치명타',
      'accuracy': '명중',
      'utility': '이동 속도',
      'survival': '생명력'
    }
    
    return representativeStats[category] || null
  }

  /**
   * 전투 스타일 이름 변환
   */
  static getStyleDisplayName(style: CombatStyle): string {
    const styleNames: Record<CombatStyle, string> = {
      offensive: '공격형',
      defensive: '방어형',
      balanced: '균형형',
      support: '서포트형',
      mixed: '복합형'
    }
    
    return styleNames[style] || '알 수 없음'
  }

  /**
   * 우세성 이름 변환
   */
  static getDominanceDisplayName(dominance: string): string {
    const dominanceNames: Record<string, string> = {
      'physical': '물리 우세',
      'magical': '마법 우세',
      'hybrid': '균형'
    }
    
    return dominanceNames[dominance] || '알 수 없음'
  }
}

export default CombatClassifier