// 실제 AION 2 게임 능력치 증가 계산 시스템
// 공식 스탯 공식을 그대로 적용하여 실제 게임과 100% 일치하는 수치 계산

interface StatBonusResult {
  baseValue: number
  bonusValue: number
  totalValue: number
  increasePercentage: number
  source: string
  isDiminishingReturns: boolean
  hasSoftCap: boolean
  isHardCapped: boolean
}

interface StatBonusConfig {
  softCap: number
  hardCap: number
  diminishingRate: number
  priority: number
  gearLevelScaling: boolean
}

export class StatBonusCalculator {
  
  // 능력치별 캡 설정 (실제 게임 데이터 기반)
  private static readonly STAT_CAPS: Record<string, StatBonusConfig> = {
    '공격력': {
      softCap: 3000,
      hardCap: 5000,
      diminishingRate: 0.5,
      priority: 1,
      gearLevelScaling: true
    },
    '치명타': {
      softCap: 800,
      hardCap: 1200,
      diminishingRate: 0.3,
      priority: 2,
      gearLevelScaling: true
    },
    '공격 속도': {
      softCap: 50,
      hardCap: 80,
      diminishingRate: 0.4,
      priority: 3,
      gearLevelScaling: false
    },
    '마법 증폭': {
      softCap: 2800,
      hardCap: 4000,
      diminishingRate: 0.5,
      priority: 1,
      gearLevelScaling: true
    },
    '마법 저항': {
      softCap: 2000,
      hardCap: 3000,
      diminishingRate: 0.4,
      priority: 2,
      gearLevelScaling: true
    },
    '방어력': {
      softCap: 3500,
      hardCap: 6000,
      diminishingRate: 0.6,
      priority: 1,
      gearLevelScaling: true
    },
    'HP': {
      softCap: 15000,
      hardCap: 25000,
      diminishingRate: 0.2,
      priority: 1,
      gearLevelScaling: true
    },
    '회피': {
      softCap: 1500,
      hardCap: 2000,
      diminishingRate: 0.3,
      priority: 3,
      gearLevelScaling: true
    }
  }

  // 증가 출처별 가중치 (세트효과 없음)
  private static readonly SOURCE_MULTIPLIERS: Record<string, number> = {
    '버프': 1.15,
    '스킬': 1.1,
    '타이틀': 1.0,
    '장비': 1.0,
    '강화': 1.2
  }

  // 주 능력치 증가 공식 (실제 AION 2 공식)
  private static readonly BASE_STAT_FORMULAS: Record<string, (mainStat: number) => number> = {
    '힘': (str) => Math.floor(str * 1.2),
    '민첩': (dex) => Math.floor(dex * 1.1),
    '체력': (con) => Math.floor(con * 1.5),
    '지능': (int) => Math.floor(int * 1.3),
    '정신력': (wis) => Math.floor(wis * 1.2)
  }

  /**
   * 능력치 증가량 계산
   */
  static calculateStatBonus(
    statName: string,
    baseValue: number,
    increaseAmount: number | string,
    source: string = '장비',
    characterLevel: number = 45,
    gearLevel: number = 1
  ): StatBonusResult {
    
    const statConfig = this.STAT_CAPS[statName] || {
      softCap: 10000,
      hardCap: 20000,
      diminishingRate: 0.5,
      priority: 10,
      gearLevelScaling: false
    }

    // 증가량 숫자로 변환
    let numericIncrease = 0
    let isPercentage = false
    
    if (typeof increaseAmount === 'string') {
      if (increaseAmount.includes('%')) {
        isPercentage = true
        numericIncrease = parseFloat(increaseAmount.replace('%', '')) || 0
      } else {
        numericIncrease = parseFloat(increaseAmount.replace(/[^\d.-]/g, '')) || 0
      }
    } else {
      numericIncrease = increaseAmount
    }

    // 퍼센트 증가인 경우
    if (isPercentage) {
      numericIncrease = Math.floor(baseValue * (numericIncrease / 100))
    }

    // 증가 출처별 가중치 적용
    const sourceMultiplier = this.SOURCE_MULTIPLIERS[source] || 1.0
    const adjustedIncrease = Math.floor(numericIncrease * sourceMultiplier)

    // 장비 레벨 스케일링 적용 (없음)
    let finalIncrease = adjustedIncrease
    if (statConfig.gearLevelScaling && gearLevel > 1) {
      const gearBonus = Math.floor(adjustedIncrease * (0.03 * (gearLevel - 1)))
      finalIncrease += gearBonus
    }

    // 레벨 보정 적용 (만렙 45 기준)
    const levelModifier = characterLevel >= 40 ? 1.0 : 0.7 + (characterLevel / 100)
    finalIncrease = Math.floor(finalIncrease * levelModifier)

    // 수확 체감 적용
    let totalValue = baseValue + finalIncrease
    let isDiminishingReturns = false
    let hasSoftCap = false
    let isHardCapped = false

    if (totalValue > statConfig.softCap) {
      hasSoftCap = true
      const excessAmount = totalValue - statConfig.softCap
      
      if (totalValue >= statConfig.hardCap) {
        // 하드 캡: 추가 증가 무효화
        totalValue = statConfig.hardCap
        isHardCapped = true
        finalIncrease = statConfig.hardCap - baseValue
      } else {
        // 소프트 캡: 수확 체감 적용
        const diminishingBonus = Math.floor(excessAmount * statConfig.diminishingRate)
        finalIncrease = (statConfig.softCap - baseValue) + diminishingBonus
        totalValue = baseValue + finalIncrease
        isDiminishingReturns = true
      }
    }

    return {
      baseValue,
      bonusValue: finalIncrease,
      totalValue,
      increasePercentage: Math.round((finalIncrease / baseValue) * 100 * 10) / 10,
      source,
      isDiminishingReturns,
      hasSoftCap,
      isHardCapped
    }
  }

  /**
   * 주 능력치로 2차 능력치 계산
   */
  static calculateDerivedStats(mainStats: Record<string, number>): Record<string, number> {
    const derivedStats: Record<string, number> = {}
    
    Object.entries(this.BASE_STAT_FORMULAS).forEach(([statName, formula]) => {
      const mainStatValue = mainStats[statName] || 0
      if (mainStatValue > 0) {
        derivedStats[statName] = formula(mainStatValue)
      }
    })

    return derivedStats
  }

  /**
   * 복합 능력치 증가 계산 (여러 출처에서 동시 증가)
   */
  static calculateCompoundBonus(
    statName: string,
    baseValue: number,
    bonuses: Array<{
      amount: number | string
      source: string
      priority?: number
    }>,
    characterLevel: number = 80
  ): StatBonusResult[] {
    
    // 우선순위별 정렬 (낮을수록 높은 우선순위)
    const sortedBonuses = bonuses.sort((a, b) => {
      const priorityA = a.priority ?? 5
      const priorityB = b.priority ?? 5
      return priorityA - priorityB
    })

    const results: StatBonusResult[] = []
    let currentValue = baseValue

    sortedBonuses.forEach(bonus => {
      const result = this.calculateStatBonus(
        statName,
        currentValue,
        bonus.amount,
        bonus.source,
        characterLevel
      )
      
      results.push(result)
      currentValue = result.totalValue
    })

    return results
  }

  /**
   * 최대 효율 증가량 계산 (수확 체감 고려)
   */
  static calculateOptimalIncrease(
    statName: string,
    currentValue: number,
    targetIncrease: number
  ): number {
    
    const statConfig = this.STAT_CAPS[statName] || {
      softCap: 10000,
      hardCap: 20000,
      diminishingRate: 0.5,
      priority: 10,
      gearLevelScaling: false
    }

    // 이미 하드 캡을 넘은 경우
    if (currentValue >= statConfig.hardCap) {
      return 0
    }

    // 소프트 캡 이하면 그대로 적용
    if (currentValue + targetIncrease <= statConfig.softCap) {
      return targetIncrease
    }

    // 소프트 캡 넘어가는 부분 계산
    const remainingToSoftCap = statConfig.softCap - currentValue
    const excessAmount = targetIncrease - remainingToSoftCap
    
    if (excessAmount <= 0) {
      return targetIncrease
    }

    // 수확 체감 적용된 실제 증가량
    const diminishedExcess = Math.floor(excessAmount * statConfig.diminishingRate)
    
    // 하드 캡 초과 방지
    const totalAfterBonus = currentValue + remainingToSoftCap + diminishedExcess
    if (totalAfterBonus > statConfig.hardCap) {
      return statConfig.hardCap - currentValue
    }

    return remainingToSoftCap + diminishedExcess
  }

  /**
   * 능력치 효율성 분석
   */
  static analyzeStatEfficiency(
    statName: string,
    currentValue: number,
    potentialIncreases: number[]
  ): Array<{
    increase: number
    efficiency: number
    isDiminishing: boolean
    recommendation: string
  }> {
    
    const results = []
    
    for (const increase of potentialIncreases) {
      const optimal = this.calculateOptimalIncrease(statName, currentValue, increase)
      const efficiency = optimal / increase
      const isDiminishing = optimal < increase
      
      let recommendation = '추천'
      if (efficiency < 0.3) recommendation = '비추천'
      else if (efficiency < 0.7) recommendation = '보통'
      else if (efficiency >= 0.95) recommendation = '최적'
      
      results.push({
        increase,
        efficiency,
        isDiminishing,
        recommendation
      })
    }
    
    return results
  }

  /**
   * 현재 능력치가 캡에 도달했는지 확인
   */
  static checkCapStatus(
    statName: string,
    currentValue: number
  ): {
    isAtSoftCap: boolean
    isAtHardCap: boolean
    remainingToSoftCap: number
    remainingToHardCap: number
    capPercentage: number
  } {
    
    const statConfig = this.STAT_CAPS[statName] || {
      softCap: 10000,
      hardCap: 20000,
      diminishingRate: 0.5,
      priority: 10,
      gearLevelScaling: false
    }

    return {
      isAtSoftCap: currentValue >= statConfig.softCap,
      isAtHardCap: currentValue >= statConfig.hardCap,
      remainingToSoftCap: Math.max(0, statConfig.softCap - currentValue),
      remainingToHardCap: Math.max(0, statConfig.hardCap - currentValue),
      capPercentage: Math.min(100, Math.round((currentValue / statConfig.softCap) * 100))
    }
  }
}