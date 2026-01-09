// 복사본 클래스를 여기에 포함시켜 테스트
class ConsolidatedStatCalculator {
  static extractIncreases(statSecondList) {
    const increases = []
    
    for (const entry of statSecondList) {
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

  static belongsToGroup(statName, group) {
    const normalizedName = statName.toLowerCase().replace(/\s/g, '')
    
    for (const baseStat of group.baseStats) {
      if (normalizedName.includes(baseStat.toLowerCase().replace(/\s/g, ''))) {
        return true
      }
    }
    
    return false
  }

  static increaseBelongsToGroup(increase, group) {
    const normalizedSource = increase.source.toLowerCase().replace(/\s/g, '')
    
    for (const keyword of group.increaseKeywords) {
      if (normalizedSource.includes(keyword.toLowerCase().replace(/\s/g, ''))) {
        return true
      }
    }
    
    return false
  }

  static calculateConsolidatedStats(statList) {
    const results = []
    const STAT_GROUPS = [
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
    
    for (const group of STAT_GROUPS) {
      const groupStats = statList.filter(stat => 
        this.belongsToGroup(stat.name, group)
      )
      
      if (groupStats.length === 0) continue
      
      const baseValue = groupStats.reduce((sum, stat) => sum + (stat.value || 0), 0)
      
      const allIncreases = []
      for (const stat of groupStats) {
        if (stat.statSecondList) {
          const statIncreases = this.extractIncreases(stat.statSecondList)
          const groupIncreases = statIncreases.filter(increase => 
            this.increaseBelongsToGroup(increase, group)
          )
          allIncreases.push(...groupIncreases)
        }
      }
      
      const totalIncreasePercentage = allIncreases.reduce((sum, inc) => sum + inc.percentage, 0)
      const finalValue = Math.floor(baseValue * (1 + totalIncreasePercentage / 100))
      
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

  static calculateIndividualStat(stat) {
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
}

// 실제 API 데이터로 테스트
const testData = [
  {
    "type": "STR",
    "name": "위력",
    "value": 129,
    "statSecondList": ["공격력 증가 +12.9%"]
  },
  {
    "type": "CON", 
    "name": "체력",
    "value": 77,
    "statSecondList": ["생명력 증가 +7.7%"]
  },
  {
    "type": "Life",
    "name": "생명력[유스티엘]",
    "value": 71,
    "statSecondList": ["생명력 증가 +14.2%", "재생 +14.2%"]
  },
  {
    "type": "Justice",
    "name": "정의[네자칸]",
    "value": 65,
    "statSecondList": ["방어력 증가 +13%", "완벽 +13%"]
  },
  {
    "type": "WIS",
    "name": "의지[루미엘]",
    "value": 82,
    "statSecondList": ["정신력 증가 +16.4%", "상태이상 저항 +16.4%"]
  }
]

console.log("=== 통합 능력치 계산 테스트 ===")
const results = ConsolidatedStatCalculator.calculateConsolidatedStats(testData)

for (const result of results) {
  console.log(`\n${result.name}:`)
  console.log(`  기본값: ${result.baseValue}`)
  console.log(`  최종값: ${result.finalValue}`)
  console.log(`  공식: ${result.calculationFormula}`)
  if (result.increases.length > 0) {
    console.log(`  증가들:`)
    result.increases.forEach(inc => {
      console.log(`    ${inc.source}: +${inc.percentage}%`)
    })
  } else {
    console.log(`  증가: 없음`)
  }
}

// 개별 능력치 테스트
console.log("\n=== 개별 능력치 계산 테스트 ===")
const individualStat = testData[0] // 위력
const individualResult = ConsolidatedStatCalculator.calculateIndividualStat(individualStat)

if (individualResult) {
  console.log(`\n${individualResult.name}:`)
  console.log(`  기본값: ${individualResult.baseValue}`)
  console.log(`  최종값: ${individualResult.finalValue}`)
  console.log(`  공식: ${individualResult.calculationFormula}`)
  console.log(`  증가들:`, individualResult.increases)
}