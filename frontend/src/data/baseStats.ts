/**
 * AION 2 직업별 기본 능력치 상수
 * 레벨 45 만렙 기준 기본 스탯 값 (장비/타이틀/기타 보너스 제외)
 * 
 * 작성일: 2025-01-15
 * 파일: frontend/src/data/baseStats.ts
 */

/**
 * 직업별 기본 능력치 정의
 */
export interface ClassBaseStats {
  id: string                    // 클래스 ID
  name: string                  // 한국어 클래스명
  englishName: string           // 영어 클래스명
  baseStats: {
    health: number              // 생명력
    mana: number                // 정신력  
    attack: number             // 공격력
    defense: number            // 방어력
    accuracy: number           // 명중
    evasion: number            // 회피
    parry: number              // 막기
    block: number              // 철벽
    critical: number           // 치명타
    magicBoost: number         // 마법 증폭력
    magicAccuracy: number      // 마법 정확도
    magicResist: number        // 마법 저항력
    speed: number              // 이동 속도
    attackSpeed: number        // 공격 속도
    castingSpeed: number       // 시전 속도
    hpRegen: number           // 생명력 재생
    mpRegen: number           // 정신력 재생
  }
}

/**
 * 모든 직업별 기본 능력치 데이터
 */
export const CLASS_BASE_STATS: ClassBaseStats[] = [
  // 전사 계열
  {
    id: '6',
    name: '검성',
    englishName: 'Gladiator',
    baseStats: {
      health: 3500,
      mana: 2800,
      attack: 120,
      defense: 110,
      accuracy: 150,
      evasion: 80,
      parry: 90,
      block: 0,
      critical: 180,
      magicBoost: 50,
      magicAccuracy: 120,
      magicResist: 300,
      speed: 6,
      attackSpeed: 1.2,
      castingSpeed: 1.0,
      hpRegen: 15,
      mpRegen: 8
    }
  },
  {
    id: '10',
    name: '수호성',
    englishName: 'Templar',
    baseStats: {
      health: 4500,
      mana: 2600,
      attack: 100,
      defense: 140,
      accuracy: 130,
      evasion: 70,
      parry: 110,
      block: 120,
      critical: 150,
      magicBoost: 40,
      magicAccuracy: 110,
      magicResist: 380,
      speed: 6,
      attackSpeed: 1.1,
      castingSpeed: 1.0,
      hpRegen: 18,
      mpRegen: 7
    }
  },

  // 정찰 계열
  {
    id: '14',
    name: '궁성',
    englishName: 'Ranger',
    baseStats: {
      health: 3000,
      mana: 3200,
      attack: 140,
      defense: 85,
      accuracy: 200,
      evasion: 180,
      parry: 70,
      block: 0,
      critical: 250,
      magicBoost: 60,
      magicAccuracy: 180,
      magicResist: 260,
      speed: 7,
      attackSpeed: 1.3,
      castingSpeed: 1.0,
      hpRegen: 12,
      mpRegen: 10
    }
  },
  {
    id: '18',
    name: '살성',
    englishName: 'Assassin',
    baseStats: {
      health: 2800,
      mana: 3000,
      attack: 160,
      defense: 75,
      accuracy: 180,
      evasion: 220,
      parry: 80,
      block: 0,
      critical: 300,
      magicBoost: 50,
      magicAccuracy: 160,
      magicResist: 240,
      speed: 7,
      attackSpeed: 1.4,
      castingSpeed: 1.0,
      hpRegen: 10,
      mpRegen: 9
    }
  },

  // 법사 계열
  {
    id: '22',
    name: '정령성',
    englishName: 'Spiritmaster',
    baseStats: {
      health: 2500,
      mana: 4500,
      attack: 80,
      defense: 70,
      accuracy: 120,
      evasion: 90,
      parry: 60,
      block: 0,
      critical: 120,
      magicBoost: 180,
      magicAccuracy: 200,
      magicResist: 320,
      speed: 6,
      attackSpeed: 1.0,
      castingSpeed: 1.3,
      hpRegen: 8,
      mpRegen: 15
    }
  },
  {
    id: '26',
    name: '마도성',
    englishName: 'Sorcerer',
    baseStats: {
      health: 2400,
      mana: 4800,
      attack: 75,
      defense: 65,
      accuracy: 110,
      evasion: 85,
      parry: 50,
      block: 0,
      critical: 110,
      magicBoost: 200,
      magicAccuracy: 220,
      magicResist: 300,
      speed: 6,
      attackSpeed: 1.0,
      castingSpeed: 1.4,
      hpRegen: 7,
      mpRegen: 16
    }
  },

  // 성직자 계열
  {
    id: '30',
    name: '치유성',
    englishName: 'Cleric',
    baseStats: {
      health: 4000,
      mana: 4200,
      attack: 85,
      defense: 120,
      accuracy: 100,
      evasion: 75,
      parry: 100,
      block: 80,
      critical: 100,
      magicBoost: 120,
      magicAccuracy: 150,
      magicResist: 400,
      speed: 6,
      attackSpeed: 1.1,
      castingSpeed: 1.2,
      hpRegen: 16,
      mpRegen: 14
    }
  },
  {
    id: '34',
    name: '호법성',
    englishName: 'Chanter',
    baseStats: {
      health: 3600,
      mana: 3500,
      attack: 110,
      defense: 100,
      accuracy: 140,
      evasion: 100,
      parry: 95,
      block: 70,
      critical: 140,
      magicBoost: 100,
      magicAccuracy: 130,
      magicResist: 340,
      speed: 6,
      attackSpeed: 1.2,
      castingSpeed: 1.1,
      hpRegen: 14,
      mpRegen: 11
    }
  }
]

/**
 * 클래스별 스탯 가중치 매핑
 * 특정 능력치가 해당 클래스에 미치는 영향도
 */
export const CLASS_STAT_WEIGHTS: Record<string, Record<string, number>> = {
  '검성': {
    '공격력': 1.5,
    '치명타': 1.4,
    '명중': 1.2,
    '방어력': 0.8,
    '생명력': 0.9
  },
  '수호성': {
    '방어력': 1.8,
    '생명력': 1.5,
    '막기': 1.6,
    '회피': 0.8,
    '공격력': 0.7,
    '치명타': 0.6
  },
  '궁성': {
    '공격력': 1.4,
    '치명타': 1.6,
    '명중': 1.5,
    '회피': 1.2,
    '이동 속도': 1.3,
    '방어력': 0.6
  },
  '살성': {
    '공격력': 1.6,
    '치명타': 1.8,
    '명중': 1.4,
    '회피': 1.5,
    '이동 속도': 1.4,
    '공격 속도': 1.3
  },
  '정령성': {
    '마법 증폭력': 1.6,
    '정신력': 1.5,
    '마법 정확도': 1.3,
    '마법 저항력': 1.2,
    '생명력': 0.8
  },
  '마도성': {
    '마법 증폭력': 1.8,
    '정신력': 1.6,
    '마법 정확도': 1.5,
    '마법 저항력': 1.1,
    '시전 속도': 1.4
  },
  '치유성': {
    '생명력': 1.6,
    '정신력': 1.5,
    '마법 증폭력': 1.3,
    '마법 저항력': 1.4,
    '방어력': 1.2
  },
  '호법성': {
    '공격력': 1.2,
    '생명력': 1.3,
    '정신력': 1.2,
    '방어력': 1.1,
    '마법 증폭력': 1.1
  }
}

/**
 * 레벨별 능력치 보정 계수 (만렙 45 기준)
 */
export const LEVEL_MULTIPLIER = {
  1: 0.1,   2: 0.12,  3: 0.14,  4: 0.16,  5: 0.18,
  6: 0.2,    7: 0.22,  8: 0.24,  9: 0.26,  10: 0.28,
  15: 0.4,   20: 0.5,   25: 0.6,   30: 0.7,   35: 0.75,
  40: 0.9,   45: 1.0    // 만렙 45
}

/**
 * 클래스 ID로 기본 스탯 조회
 */
export function getBaseStatsByClass(classId: string): ClassBaseStats | null {
  return CLASS_BASE_STATS.find(cls => cls.id === classId) || null
}

/**
 * 클래스명으로 기본 스탯 조회
 */
export function getBaseStatsByName(className: string): ClassBaseStats | null {
  return CLASS_BASE_STATS.find(cls => 
    cls.name === className || cls.englishName === className
  ) || null
}

/**
 * 레벨 보정된 스탯 계산
 */
export function calculateLevelAdjustedStats(
  baseStats: ClassBaseStats, 
  characterLevel: number
): Partial<ClassBaseStats['baseStats']> {
  const levelMultiplier = LEVEL_MULTIPLIER[characterLevel as keyof typeof LEVEL_MULTIPLIER] || 1.0
  const adjustedStats: Partial<ClassBaseStats['baseStats']> = {}
  
  Object.entries(baseStats.baseStats).forEach(([stat, value]) => {
    adjustedStats[stat as keyof ClassBaseStats['baseStats']] = Math.floor(value * levelMultiplier)
  })
  
  return adjustedStats
}

/**
 * 클래스별 스탯 가중치 계산
 */
export function calculateWeightedStatValue(
  statName: string, 
  baseValue: number, 
  className: string
): number {
  const weights = CLASS_STAT_WEIGHTS[className]
  if (!weights) return baseValue
  
  const weight = weights[statName] || 1.0
  return Math.floor(baseValue * weight)
}

/**
 * NOA 점수 계산용 스탯 조합
 */
export function calculateNOAScore(
  baseStats: Partial<ClassBaseStats['baseStats']>,
  className: string
): number {
  const weights = CLASS_STAT_WEIGHTS[className]
  if (!weights) return 0
  
  let score = 0
  
  // 물리 클래스
  if (['검성', '수호성', '궁성', '살성', '호법성'].includes(className)) {
    score = (baseStats.attack || 0) * weights['공격력'] +
           (baseStats.critical || 0) * weights['치명타'] +
           (baseStats.accuracy || 0) * weights['명중'] +
           (baseStats.defense || 0) * weights['방어력'] +
           (baseStats.health || 0) * weights['생명력']
  }
  // 마법 클래스
  else if (['정령성', '마도성', '치유성'].includes(className)) {
    score = (baseStats.magicBoost || 0) * weights['마법 증폭력'] +
           (baseStats.mana || 0) * weights['정신력'] +
           (baseStats.magicAccuracy || 0) * weights['마법 정확도'] +
           (baseStats.magicResist || 0) * weights['마법 저항력'] +
           (baseStats.health || 0) * weights['생명력']
  }
  
  return Math.floor(score)
}

/**
 * 디버그용 기본 스탯 정보 출력
 */
export function debugBaseStats(classId: string, characterLevel: number = 45): void {
  const baseStats = getBaseStatsByClass(classId)
  if (!baseStats) {
    console.log(`클래스 ID ${classId}를 찾을 수 없습니다.`)
    return
  }
  
  const adjustedStats = calculateLevelAdjustedStats(baseStats, characterLevel)
  const noaScore = calculateNOAScore(adjustedStats, baseStats.name)
  
  console.log(`=== ${baseStats.name} (${baseStats.englishName}) 기본 스탯 ===`)
  console.log(`레벨: ${characterLevel}`)
  console.log(`생명력: ${adjustedStats.health}`)
  console.log(`정신력: ${adjustedStats.mana}`)
  console.log(`공격력: ${adjustedStats.attack}`)
  console.log(`방어력: ${adjustedStats.defense}`)
  console.log(`치명타: ${adjustedStats.critical}`)
  console.log(`명중: ${adjustedStats.accuracy}`)
  console.log(`NOA 점수: ${noaScore}`)
  console.log('')
}

export default {
  CLASS_BASE_STATS,
  CLASS_STAT_WEIGHTS,
  LEVEL_MULTIPLIER,
  getBaseStatsByClass,
  getBaseStatsByName,
  calculateLevelAdjustedStats,
  calculateWeightedStatValue,
  calculateNOAScore,
  debugBaseStats
}