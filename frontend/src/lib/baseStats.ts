/**
 * AION 2 클래스별 기본 능력치
 * 각 클래스의 레벨 1 기준 기본 능력치
 * 
 * 작성일: 2025-01-15
 * 파일: frontend/src/lib/baseStats.ts
 */

/**
 * 클래스별 기본 능력치 타입
 */
export interface ClassBaseStats {
  className: string
  classId: string
  baseStats: {
    attack: number
    defense: number
    critical: number
    accuracy: number
    health: number
    mana: number
    speed: number
    regeneration: number
  }
  growthRates: {
    attack: number
    defense: number
    critical: number
    accuracy: number
    health: number
    mana: number
    speed: number
    regeneration: number
  }
}

/**
 * 클래스별 기본 능력치 데이터
 */
export const CLASS_BASE_STATS: Record<string, ClassBaseStats> = {
  '6': { // 검성 (Gladiator)
    className: '검성',
    classId: '6',
    baseStats: {
      attack: 120,
      defense: 100,
      critical: 80,
      accuracy: 90,
      health: 1500,
      mana: 800,
      speed: 60,
      regeneration: 5
    },
    growthRates: {
      attack: 2.5,
      defense: 2.0,
      critical: 1.8,
      accuracy: 1.5,
      health: 25,
      mana: 12,
      speed: 0.5,
      regeneration: 0.1
    }
  },
  
  '10': { // 수호성 (Templar)
    className: '수호성',
    classId: '10',
    baseStats: {
      attack: 100,
      defense: 140,
      critical: 70,
      accuracy: 85,
      health: 1800,
      mana: 900,
      speed: 55,
      regeneration: 6
    },
    growthRates: {
      attack: 2.0,
      defense: 2.8,
      critical: 1.5,
      accuracy: 1.4,
      health: 30,
      mana: 14,
      speed: 0.4,
      regeneration: 0.12
    }
  },
  
  '14': { // 궁성 (Ranger)
    className: '궁성',
    classId: '14',
    baseStats: {
      attack: 110,
      defense: 85,
      critical: 95,
      accuracy: 110,
      health: 1200,
      mana: 1000,
      speed: 75,
      regeneration: 4
    },
    growthRates: {
      attack: 2.2,
      defense: 1.7,
      critical: 2.2,
      accuracy: 2.0,
      health: 20,
      mana: 16,
      speed: 0.8,
      regeneration: 0.08
    }
  },
  
  '18': { // 살성 (Assassin)
    className: '살성',
    classId: '18',
    baseStats: {
      attack: 130,
      defense: 80,
      critical: 110,
      accuracy: 100,
      health: 1100,
      mana: 950,
      speed: 80,
      regeneration: 4
    },
    growthRates: {
      attack: 2.8,
      defense: 1.6,
      critical: 2.5,
      accuracy: 1.8,
      health: 18,
      mana: 15,
      speed: 0.9,
      regeneration: 0.08
    }
  },
  
  '22': { // 정령성 (Spiritmaster)
    className: '정령성',
    classId: '22',
    baseStats: {
      attack: 85,
      defense: 75,
      critical: 70,
      accuracy: 80,
      health: 1000,
      mana: 1400,
      speed: 60,
      regeneration: 8
    },
    growthRates: {
      attack: 1.7,
      defense: 1.5,
      critical: 1.4,
      accuracy: 1.6,
      health: 16,
      mana: 24,
      speed: 0.5,
      regeneration: 0.15
    }
  },
  
  '26': { // 마도성 (Sorcerer)
    className: '마도성',
    classId: '26',
    baseStats: {
      attack: 90,
      defense: 70,
      critical: 75,
      accuracy: 85,
      health: 950,
      mana: 1500,
      speed: 60,
      regeneration: 8
    },
    growthRates: {
      attack: 1.8,
      defense: 1.4,
      critical: 1.6,
      accuracy: 1.7,
      health: 15,
      mana: 26,
      speed: 0.5,
      regeneration: 0.16
    }
  },
  
  '30': { // 치유성 (Cleric)
    className: '치유성',
    classId: '30',
    baseStats: {
      attack: 80,
      defense: 90,
      critical: 65,
      accuracy: 75,
      health: 1300,
      mana: 1300,
      speed: 55,
      regeneration: 10
    },
    growthRates: {
      attack: 1.6,
      defense: 1.8,
      critical: 1.3,
      accuracy: 1.5,
      health: 22,
      mana: 22,
      speed: 0.4,
      regeneration: 0.2
    }
  },
  
  '34': { // 호법성 (Chanter)
    className: '호법성',
    classId: '34',
    baseStats: {
      attack: 95,
      defense: 95,
      critical: 75,
      accuracy: 85,
      health: 1250,
      mana: 1100,
      speed: 65,
      regeneration: 7
    },
    growthRates: {
      attack: 1.9,
      defense: 1.9,
      critical: 1.5,
      accuracy: 1.7,
      health: 21,
      mana: 18,
      speed: 0.6,
      regeneration: 0.14
    }
  }
}

/**
 * 클래스 이름으로 기본 능력치 가져오기
 */
export function getBaseStatsByClass(classIdentifier: string): ClassBaseStats | null {
  // 클래스 ID로 직접 찾기
  if (CLASS_BASE_STATS[classIdentifier]) {
    return CLASS_BASE_STATS[classIdentifier]
  }
  
  // 클래스 이름으로 찾기
  const classEntry = Object.values(CLASS_BASE_STATS).find(
    stats => 
      stats.className.toLowerCase() === classIdentifier.toLowerCase() ||
      stats.className === classIdentifier
  )
  
  return classEntry || null
}

/**
 * 레벨별 능력치 계산
 */
export function calculateStatsAtLevel(
  baseStats: ClassBaseStats,
  level: number
): ClassBaseStats['baseStats'] {
  const calculatedStats: ClassBaseStats['baseStats'] = {
    attack: 0,
    defense: 0,
    critical: 0,
    accuracy: 0,
    health: 0,
    mana: 0,
    speed: 0,
    regeneration: 0
  }
  
  // 레벨 1부터 시작하므로 level-1 만큼 성장 적용
  const levelsGrown = Math.max(0, level - 1)
  
  Object.keys(calculatedStats).forEach(stat => {
    const statKey = stat as keyof ClassBaseStats['baseStats']
    const baseValue = baseStats.baseStats[statKey]
    const growthRate = baseStats.growthRates[statKey]
    
    calculatedStats[statKey] = Math.floor(baseValue + (growthRate * levelsGrown))
  })
  
  return calculatedStats
}

/**
 * 모든 클래스 목록
 */
export function getAllClasses(): ClassBaseStats[] {
  return Object.values(CLASS_BASE_STATS)
}

/**
 * 클래스별 특성 요약
 */
export function getClassCharacteristics(classId: string): {
  strengths: string[]
  weaknesses: string[]
  playstyle: string
  description: string
} | null {
  const classStats = CLASS_BASE_STATS[classId]
  if (!classStats) return null
  
  const characteristics: Record<string, any> = {
    '6': { // 검성
      strengths: ['높은 공격력', '근접 전투 특화'],
      weaknesses: ['낮은 방어력', '마나 소모 많음'],
      playstyle: '공격형',
      description: '강력한 근접 공격력을 가진 전사 클래스'
    },
    '10': { // 수호성
      strengths: ['높은 방어력', '뛰어난 생존력'],
      weaknesses: ['낮은 공격력', '느린 속도'],
      playstyle: '방어형',
      description: '최고의 방어력을 자랑하는 탱커 클래스'
    },
    '14': { // 궁성
      strengths: ['높은 명중률', '원거리 공격'],
      weaknesses: ['낮은 방어력', '근접 취약'],
      playstyle: '원거리 공격형',
      description: '정확한 원거리 물리 공격이 특기인 클래스'
    },
    '18': { // 살성
      strengths: ['높은 치명타', '빠른 속도'],
      weaknesses: ['낮은 체력', '높은 난이도'],
      playstyle: '암살형',
      description: '치명적인 암살이 특기인 은신 클래스'
    },
    '22': { // 정령성
      strengths: ['소환수', '지속 데미지'],
      weaknesses: ['낮은 체력', '소환수 의존'],
      playstyle: '소환사형',
      description: '정령을 소환해 싸우는 마법 클래스'
    },
    '26': { // 마도성
      strengths: ['강력한 마법', '범위 공격'],
      weaknesses: ['낮은 체력', '마나 소모 많음'],
      playstyle: '마법 공격형',
      description: '강력한 원거리 마법 공격이 특기인 클래스'
    },
    '30': { // 치유성
      strengths: ['치유 능력', '높은 생존력'],
      weaknesses: ['낮은 공격력', '느린 속도'],
      playstyle: '힐러/서포터',
      description: '아군 치유와 지원이 특기인 클래스'
    },
    '34': { // 호법성
      strengths: ['균형 잡힌 능력', '버프/디버프'],
      weaknesses: '특화된 능력 부족',
      playstyle: '하이브리드 서포터',
      description: '공격과 지원 모두 가능한 만능 클래스'
    }
  }
  
  return characteristics[classId] || null
}

export default CLASS_BASE_STATS