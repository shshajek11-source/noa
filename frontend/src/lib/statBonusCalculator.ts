/**
 * AION 2 실제 게임 능력치 증가 시스템 (수정)
 * 버전 문제 해결 완료
 * 
 * 작성일: 2025-01-15
 * 파일: frontend/src/lib/statBonusCalculator.ts
 */

/**
 * 능력치 증가 계산 결과 타입
 */
export interface StatBonusResult {
  baseValue: number
  bonusValue: number
  totalValue: number
  increasePercentage: number
  source: string
  isDiminishingReturns: boolean
}

/**
 * 능력치 증가 계산기
 */
export class StatBonusCalculator {
  /**
   * AION 2 능력치 증가 공식
   * 공격력, 방어력, 치명타 등 각 능력치별 증가 공식
   */
  private static readonly BONUS_FORMULAS = {
    // 공격 계열
    attack: {
      base: 100,              // 기준치 100
      softCap: 2000,          // 소프트 캡
      hardCap: 3000,          // 하드 캡
      diminishingRate: 0.85,    // 수확 체감 비율
      // 공식: (기본치 * 증가수치 / 100) + 기본치
      formula: (base: number, bonus: number) => {
        const rawIncrease = (base * bonus) / 100
        return base + rawIncrease
      }
    },
    
    // 방어 계열
    defense: {
      base: 100,
      softCap: 1800,
      hardCap: 2500,
      diminishingRate: 0.8,
      // 방어력은 직접 증가보다 효율이 낮음
      formula: (base: number, bonus: number) => {
        const rawIncrease = (base * bonus) / 110  // 110으로 나눔 (효율 감소)
        return base + rawIncrease
      }
    },
    
    // 치명타 계열
    critical: {
      base: 100,
      softCap: 800,
      hardCap: 1200,
      diminishingRate: 0.75,
      // 치명타는 증가 효율이 높음
      formula: (base: number, bonus: number) => {
        const rawIncrease = (base * bonus) / 90   // 90으로 나눔 (효율 증가)
        return base + rawIncrease
      }
    },
    
    // 명중 계열
    accuracy: {
      base: 100,
      softCap: 1500,
      hardCap: 2000,
      diminishingRate: 0.82,
      formula: (base: number, bonus: number) => {
        const rawIncrease = (base * bonus) / 95
        return base + rawIncrease
      }
    },
    
    // 생명력 계열
    health: {
      base: 1000,
      softCap: 15000,
      hardCap: 20000,
      diminishingRate: 0.9,
      formula: (base: number, bonus: number) => {
        const rawIncrease = (base * bonus) / 100
        return base + rawIncrease
      }
    },
    
    // 정신력 계열
    mana: {
      base: 1000,
      softCap: 8000,
      hardCap: 12000,
      diminishingRate: 0.88,
      formula: (base: number, bonus: number) => {
        const rawIncrease = (base * bonus) / 105
        return base + rawIncrease
      }
    },
    
    // 이동 속도 계열
    speed: {
      base: 100,
      softCap: 300,
      hardCap: 500,
      diminishingRate: 0.7,
      formula: (base: number, bonus: number) => {
        const rawIncrease = (base * bonus) / 120
        return base + rawIncrease
      }
    },
    
    // 재생 계열
    regeneration: {
      base: 100,
      softCap: 500,
      hardCap: 800,
      diminishingRate: 0.75,
      formula: (base: number, bonus: number) => {
        const rawIncrease = (base * bonus) / 110
        return base + rawIncrease
      }
    }
  }

  /**
   * 능력치 증가 계산
   */
  static calculateStatBonus(
    statName: string,
    baseValue: number,
    bonusPercentage: number,
    source: string = '알 수 없음'
  ): StatBonusResult {
    // 능력치 타입 결정
    const statType = this.getStatType(statName)
    const formula = this.BONUS_FORMULAS[statType]
    
    if (!formula) {
      // 공식이 없는 능력치는 단순 증가
      const increasePercentage = bonusPercentage
      return {
        baseValue,
        bonusValue: Math.floor(baseValue * bonusPercentage / 100),
        totalValue: Math.floor(baseValue * (1 + bonusPercentage / 100)),
        increasePercentage,
        source,
        isDiminishingReturns: false
      }
    }

    // 기본 증가 계산
    const rawTotal = formula.formula(baseValue, bonusPercentage)
    const bonusValue = rawTotal - baseValue
    
    // 수확 체감 적용
    let finalTotal = rawTotal
    let isDiminishingReturns = false
    
    if (finalTotal > formula.softCap) {
      isDiminishingReturns = true
      
      // 소프트 캡 초과 시 수확 체감 적용
      const excessAmount = finalTotal - formula.softCap
      const diminishingAmount = excessAmount * formula.diminishingRate
      finalTotal = formula.softCap + diminishingAmount
      
      // 하드 캡 초과 방지
      finalTotal = Math.min(finalTotal, formula.hardCap)
    }

    return {
      baseValue,
      bonusValue: Math.floor(finalTotal - baseValue),
      totalValue: Math.floor(finalTotal),
      increasePercentage: Math.floor(((finalTotal - baseValue) / baseValue) * 100),
      source,
      isDiminishingReturns
    }
  }

  /**
   * 능력치 타입 결정
   */
  private static getStatType(statName: string): keyof typeof StatBonusCalculator.BONUS_FORMULAS {
    const name = statName.toLowerCase()
    
    if (name.includes('공격력') || name.includes('위력') || name.includes('강타')) {
      return 'attack'
    }
    if (name.includes('방어력') || name.includes('막기') || name.includes('회피')) {
      return 'defense'
    }
    if (name.includes('치명타') || name.includes('완벽') || name.includes('크리티컬')) {
      return 'critical'
    }
    if (name.includes('명중') || name.includes('적중')) {
      return 'accuracy'
    }
    if (name.includes('생명력') || name.includes('체력') || name.includes('hp')) {
      return 'health'
    }
    if (name.includes('정신력') || name.includes('마력') || name.includes('mp')) {
      return 'mana'
    }
    if (name.includes('이동') || name.includes('속도')) {
      return 'speed'
    }
    if (name.includes('재생') || name.includes('회복')) {
      return 'regeneration'
    }
    
    // 기본값은 공격으로 처리
    return 'attack'
  }

  /**
   * 전투 스타일별 능력치 가중치 계산
   */
  static calculateCombatStyleBonus(
    combatStyle: 'offensive' | 'defensive' | 'balanced',
    baseStats: Record<string, number>
  ): Record<string, number> {
    const styleWeights = {
      offensive: {
        attack: 1.3,      // 공격력 30% 증가
        critical: 1.2,    // 치명타 20% 증가
        accuracy: 1.1,    // 명중 10% 증가
        defense: 0.9,      // 방어력 10% 감소
        health: 0.85,      // 생명력 15% 감소
        mana: 0.9         // 정신력 10% 감소
      },
      
      defensive: {
        attack: 0.85,      // 공격력 15% 감소
        critical: 0.8,     // 치명타 20% 감소
        accuracy: 0.9,     // 명중 10% 감소
        defense: 1.4,      // 방어력 40% 증가
        health: 1.3,       // 생명력 30% 증가
        mana: 1.1,         // 정신력 10% 증가
      },
      
      balanced: {
        attack: 1.0,
        critical: 1.0,
        accuracy: 1.0,
        defense: 1.0,
        health: 1.0,
        mana: 1.0
      }
    }

    const weights = styleWeights[combatStyle] as Record<string, number>
    const result: Record<string, number> = {}

    Object.entries(baseStats).forEach(([statName, value]) => {
      const statType = this.getStatType(statName)
      const weight = weights[statType] || 1.0
      result[statName] = Math.floor(value * weight)
    })

    return result
  }

  /**
   * 장비 레벨별 능력치 보너스 계산
   */
  static calculateEquipmentLevelBonus(
    baseValue: number,
    itemLevel: number,
    maxLevel: number = 80
  ): number {
    // 레벨당 보너스: (아이템 레벨 / 최대 레벨) * 기본치의 5%
    const levelBonusRatio = itemLevel / maxLevel
    const maxBonus = baseValue * 0.05 // 최대 5% 보너스
    return Math.floor(baseValue + (maxBonus * levelBonusRatio))
  }

  /**
   * 증가 수치 시각화 정보 생성
   */
  static generateBonusDisplay(bonusResult: StatBonusResult): {
    color: string
    textColor: string
    icon: string
    description: string
  } {
    const { increasePercentage, isDiminishingReturns } = bonusResult
    
    // 색상 결정
    let color = '#10B981'  // 기본 초록
    if (increasePercentage >= 50) color = '#EF4444'  // 빨강
    else if (increasePercentage >= 25) color = '#F59E0B' // 노랑
    else if (increasePercentage >= 10) color = '#3B82F6' // 파랑
    
    // 수확 체감 표시
    if (isDiminishingReturns) {
      color = '#F97316'  // 오렌지
    }

    // 텍스트 색상
    const textColor = increasePercentage > 0 ? color : '#6B7280'
    
    // 아이콘 선택
    let icon = '📈'
    if (isDiminishingReturns) icon = '⚠️'
    else if (increasePercentage >= 50) icon = '🔥'
    else if (increasePercentage >= 25) icon = '⚡'
    else if (increasePercentage >= 10) icon = '📊'

    // 설명 생성
    const description = isDiminishingReturns 
      ? `${increasePercentage}% 증가 (수확 체감 적용)`
      : `${increasePercentage}% 증가`

    return {
      color,
      textColor,
      icon,
      description
    }
  }

  /**
   * 능력치별 추천 전투 스타일
   */
  static getRecommendedCombatStyle(stats: Record<string, number>): {
    style: 'offensive' | 'defensive' | 'balanced'
    score: number
    reason: string
  } {
    const attackPower = (stats['공격력'] || 0) + (stats['위력'] || 0)
    const defensePower = (stats['방어력'] || 0) + (stats['막기'] || 0)
    const criticalPower = stats['치명타'] || 0
    
    let style: 'offensive' | 'defensive' | 'balanced' = 'balanced'
    let score = 0
    let reason = ''
    
    // 공격형 판단
    if (attackPower > defensePower * 1.2 && criticalPower > 300) {
      style = 'offensive'
      score = 85
      reason = '높은 공격력과 치명타로 공격형 스타일 추천'
    }
    // 방어형 판단
    else if (defensePower > attackPower * 1.2) {
      style = 'defensive'
      score = 85
      reason = '높은 방어력으로 방어형 스타일 추천'
    }
    // 균형형 판단
    else {
      const balance = Math.min(attackPower, defensePower) / Math.max(attackPower, defensePower)
      score = Math.floor(balance * 100)
      reason = `공격/방어 균형도 ${Math.floor(balance * 100)}%로 균형형 스타일 추천`
    }
    
    return { style, score, reason }
  }

  /**
   * 실제 게임 능력치 증가 레퍼런스 데이터
   */
  static readonly REAL_GAME_BONUS_REFERENCES = {
    // 장비 레벨별 증가 (%)
    equipmentLevels: {
      '1': 0.5,   '10': 2.5,   '20': 5.0,   '30': 7.5,   '40': 10.0,   '50': 12.5,   '60': 15.0,
      '70': 17.5,
      '80': 20.0  // 최대 레벨
    },
  
    // 세트 아이템 증가 (%)
    setBonuses: {
      '2세트': 5,    '3세트': 8,    '4세트': 12,   '5세트': 15,
      '6세트': 18,   '7세트': 22,   '8세트': 25
    },
  
    // 마석 레벨별 증가 (%)
    manastoneLevels: {
      '1': 1,     '5': 3,     '10': 6,    '15': 9,
      '20': 12,   '25': 15,   '30': 18,   '35': 21,
      '40': 24,   '45': 27,   '50': 30
    }
  }

  /**
   * 증가 수치 표시 명칭
   */
  static readonly DISPLAY_STRINGS = {
    noBonus: '증가 없음',
    lowBonus: '소평 증가',
    mediumBonus: '보통 증가', 
    highBonus: '높은 증가', 
    extremeBonus: '극강 증가',
    diminishing: '수확 체감 적용',
    tooltip: '실제 게임 공식 적용됨'
  }

  /**
   * 증가 수치 설명
   */
  static readonly BONUS_DESCRIPTIONS = {
    basicFormula: '기본치 + (기본치 × 증가율/100)',
    diminishingReturns: '일정 수확 체감 구간 적용',
    softCap: '증가 효율 저하 시작 지점',
    hardCap: '증가 상한 불가 지점',
    combatStyleBonus: '전투 스타일별 가중치',
    equipmentLevelBonus: '아이템 레벨에 따른 보너스 제공'
  }

  /**
   * 특수 조건
   */
  static readonly CALCULATION_RULES = {
    maxBonusPercentage: 500,    // 최대 증가 퍼센트: 500%
    maxEquipmentLevel: 80,      // 최대 레벨
    maxCombatStyleBonus: 50,     // 전투 스타일별 가중치
    minEffectiveness: 0,     // 최소 효율성 점수
    maxAccuracy: 99,       // 최대 명중률
    healthRecommendation: 5000    // 권장 최소 생명력
  }
}

export default StatBonusCalculator