/**
 * AION 2 능력치 통합 계산 시스템
 * 비슷한 능력치들을 묶어서 더하고 퍼센트 증가 적용
 * 
 * 작성일: 2025-01-07
 * 파일: frontend/src/lib/consolidatedStatCalculator.ts
 */

/**
 * 능력치 증가 정보
 */
export interface StatIncrease {
  percentage: number    // 증가 퍼센트 (예: 12.9)
  source: string        // 출처 (예: "공격력 증가")
}

/**
 * 통합된 능력치 결과
 */
export interface ConsolidatedStatResult {
  name: string           // 능력치 이름 (예: "생명력")
  baseValue: number      // 기본값 합계
  finalValue: number     // 최종 계산값
  increases: StatIncrease[] // 증가 정보들
  calculationFormula: string // 계산 공식 표시
}

/**
 * 능력치 그룹 정보
 */
interface StatGroup {
  name: string
  baseStats: string[]    // 기본 능력치들
  increaseKeywords: string[] // 증가 키워드들
}

export class ConsolidatedStatCalculator {
  /**
   * 능력치 그룹 정의
   */
  private static readonly STAT_GROUPS: StatGroup[] = [
    {
      name: '생명력',
      baseStats: ['생명력', '체력', 'HP'],
      increaseKeywords: ['생명력 증가', '체력 증가']
    },
    {
      name: '공격력', 
      baseStats: ['공격력', '위력', '힘', 'STR'],
      increaseKeywords: ['공격력 증가', '위력 증가', '힘 증가']
    },
    {
      name: '방어력',
      baseStats: ['방어력', '막기', '회피', '물리 방어', '마법 방어'],
      increaseKeywords: ['방어력 증가', '막기 증가', '회피 증가']
    },
    {
      name: '정신력',
      baseStats: ['정신력', '마력', '지능', 'INT', 'MP', '지혜', 'WIS'],
      increaseKeywords: ['정신력 증가', '마력 증가', '지능 증가']
    }
  ]

  /**
   * statSecondList에서 퍼센트 증가 추출
   */
  static extractIncreases(statSecondList: string[]): StatIncrease[] {
    const increases: StatIncrease[] = []
    
    for (const entry of statSecondList) {
      // 정규식으로 퍼센트 추출: "생명력 증가 +12.9%" 또는 "생명력 증가 +12.9"
      const match = entry.match(/(.+?)\s*\+?(\d+(?:\.\d+)?)%?/)
      if (match) {
        const source = match[1].trim()
        const percentage = parseFloat(match[2])
        
        if (!isNaN(percentage) && percentage > 0) {
          increases.push({
            percentage,
            source
          })
        }
      }
    }
    
    return increases
  }

  /**
   * 능력치가 그룹에 속하는지 확인
   */
  private static belongsToGroup(statName: string, group: StatGroup): boolean {
    const normalizedName = statName.toLowerCase().replace(/\s/g, '')
    
    // 기본 능력치 확인
    for (const baseStat of group.baseStats) {
      if (normalizedName.includes(baseStat.toLowerCase().replace(/\s/g, ''))) {
        return true
      }
    }
    
    return false
  }

  /**
   * 증가 정보가 그룹에 속하는지 확인
   */
  private static increaseBelongsToGroup(increase: StatIncrease, group: StatGroup): boolean {
    const normalizedSource = increase.source.toLowerCase().replace(/\s/g, '')
    
    for (const keyword of group.increaseKeywords) {
      if (normalizedSource.includes(keyword.toLowerCase().replace(/\s/g, ''))) {
        return true
      }
    }
    
    return false
  }

  /**
   * 통합 능력치 계산
   */
  static calculateConsolidatedStats(statList: any[]): ConsolidatedStatResult[] {
    const results: ConsolidatedStatResult[] = []
    
    for (const group of this.STAT_GROUPS) {
      // 그룹에 속하는 기본 능력치 찾기
      const groupStats = statList.filter(stat => 
        this.belongsToGroup(stat.name, group)
      )
      
      if (groupStats.length === 0) continue
      
      // 기본값 합계 계산
      const baseValue = groupStats.reduce((sum, stat) => sum + (stat.value || 0), 0)
      
      // 그룹에 속하는 증가들 찾기
      const allIncreases: StatIncrease[] = []
      for (const stat of groupStats) {
        if (stat.statSecondList) {
          const statIncreases = this.extractIncreases(stat.statSecondList)
          const groupIncreases = statIncreases.filter(increase => 
            this.increaseBelongsToGroup(increase, group)
          )
          allIncreases.push(...groupIncreases)
        }
      }
      
      // 총 증가 퍼센트 계산
      const totalIncreasePercentage = allIncreases.reduce((sum, inc) => sum + inc.percentage, 0)
      
      // 최종 값 계산: (기본 + 추가) * (1 + 증가%)
      const finalValue = Math.floor(baseValue * (1 + totalIncreasePercentage / 100))
      
      // 계산 공식 생성
      const increaseText = totalIncreasePercentage > 0 
        ? ` × (1 + ${totalIncreasePercentage}%)` 
        : ''
      const calculationFormula = `${baseValue}${increaseText} = ${finalValue}`
      
      results.push({
        name: group.name,
        baseValue,
        finalValue,
        increases: allIncreases,
        calculationFormula
      })
    }
    
    return results
  }

  /**
   * 개별 능력치 계산 (그룹화 없이)
   */
  static calculateIndividualStat(stat: any): ConsolidatedStatResult | null {
    if (!stat || stat.value === undefined) return null
    
    const baseValue = stat.value
    const increases = stat.statSecondList ? this.extractIncreases(stat.statSecondList) : []
    const totalIncreasePercentage = increases.reduce((sum, inc) => sum + inc.percentage, 0)
    const finalValue = Math.floor(baseValue * (1 + totalIncreasePercentage / 100))
    
    const increaseText = totalIncreasePercentage > 0 
      ? ` × (1 + ${totalIncreasePercentage}%)` 
      : ''
    const calculationFormula = `${baseValue}${increaseText} = ${finalValue}`
    
    return {
      name: stat.name,
      baseValue,
      finalValue,
      increases,
      calculationFormula
    }
  }

  /**
   * UI에 사용할 간단한 형태로 그룹화된 능력치 변환
   * MainStatsCard 등에서 사용하기 위한 간단한 인터페이스
   */
  static getGroupedStatsForUI(statList: any[]): Array<{name: string, value: number}> {
    const consolidatedResults = this.calculateConsolidatedStats(statList)
    
    // 기존 statList 형식처럼 {name, value} 배열로 변환
    return consolidatedResults.map(result => ({
      name: result.name,
      value: result.finalValue
    }))
  }
}

export default ConsolidatedStatCalculator