/**
 * AION2 전투력 계산 시스템 ECP v2.1
 *
 * 캐릭터의 PVE/PVP 전투력을 분리 계산합니다.
 * 공식: 전투력 = (공격력 계수 × 파워 멀티플라이어 × 전투 효율 × 정확도 보정 × 다단히트 보정) × Scaling
 */

import type { StatDetail } from '../types/stats'

/**
 * 전투력 계산에 필요한 스탯 인터페이스 (ECP v2.1)
 */
export interface CombatStats {
  attackPower: number;
  attackIncrease: number; // %

  // PVE Specifics
  pveAttackPower: number;
  bossAttackPower: number;
  pveDamageAmplification: number; // %
  bossDamageAmplification: number; // %

  // PVP Specifics
  pvpAttackPower: number;
  pvpAttackIncrease: number; // %
  pvpDamageAmplification: number; // %

  // Universal
  damageAmplification: number; // %
  criticalHit: number;
  criticalDamageAmplification: number; // %
  accuracy: number;
  combatSpeed: number; // %
  smash: number; // %
  multiHit: number; // %
  skillBonus: number; // %
}

/**
 * PVE/PVP 분리 전투력 결과
 */
export interface CombatPowerDualResult {
  pve: number;
  pvp: number;
  pveGrade: string;
  pveGradeColor: string;
  pvpGrade: string;
  pvpGradeColor: string;
}

/**
 * 전투력 계산 결과 상세 (단일 모드용)
 */
export interface CombatPowerResult {
  // 최종 점수
  totalScore: number

  // 각 계수 상세
  coefficients: {
    공격력계수: number
    피해증폭계수: number // Power Multiplier 구성 요소
    무기증폭계수: number // Deprecated in v2 but kept for structure or mapped to 0
    치명타계수: number
    전투효율계수: number
    강타계수: number
    다단히트계수: number
    스킬보너스계수: number

    // v2.0 New/Mapped
    파워멀티플라이어: number
    정확도보정: number
  }

  // 중간 계산값
  details: {
    최종공격력: number
    총피해증폭: number
    치명타확률: number // Not directly used in v2 formula as logic changed
    치명타피해배율: number
    실제다단확률: number
    DPS기본점수: number // Raw Score
  }

  // 등급
  grade: string
  gradeColor: string
}

/**
 * 다단히트 계수 계산
 * - 숨겨진 기본 확률 19% 존재
 * - 최대 4회 판정, 실패 시 중단
 */
export function calculateMultiHitCoefficient(다단히트스탯: number): { coefficient: number, 실제확률: number } {
  const 실제확률 = Math.min(100, 19 + 다단히트스탯)

  let coefficient: number
  if (실제확률 >= 100) {
    coefficient = 1.206  // 4타 고정 (+20.6%)
  } else if (실제확률 >= 80) {
    // 80~100% 구간: 선형 보간
    coefficient = 1.078 + (실제확률 - 69) * (1.206 - 1.078) / 31
  } else if (실제확률 >= 50) {
    // 50~80% 구간: 선형 보간
    coefficient = 1.010 + (실제확률 - 19) * (1.078 - 1.010) / 50
  } else {
    coefficient = 1.010  // 기본 (+1.0%)
  }

  return { coefficient, 실제확률 }
}

/**
 * 보석 티어 정의 (러프한 배분)
 * - 각 티어는 5개 세분화 (1이 최고, 5가 최저)
 * - 기준 점수 상향 조정 (1,543,000 기준)
 */
const TIER_CONFIG = [
  { name: 'Diamond', abbr: 'D', color: '#B9F2FF', min: 50000, max: 100000 },
  { name: 'Ruby', abbr: 'R', color: '#E0115F', min: 35000, max: 50000 },
  { name: 'Sapphire', abbr: 'Sa', color: '#0F52BA', min: 25000, max: 35000 },
  { name: 'Emerald', abbr: 'E', color: '#50C878', min: 18000, max: 25000 },
  { name: 'Platinum', abbr: 'P', color: '#E5E4E2', min: 13000, max: 18000 },
  { name: 'Gold', abbr: 'G', color: '#FFD700', min: 9000, max: 13000 },
  { name: 'Silver', abbr: 'Si', color: '#C0C0C0', min: 5000, max: 9000 },
  { name: 'Bronze', abbr: 'B', color: '#CD7F32', min: 0, max: 5000 },
]

/**
 * 전투력 등급 계산
 */
export function calculateGrade(score: number): { grade: string, color: string } {
  if (score >= 100000) {
    return { grade: 'D1', color: '#B9F2FF' }
  }

  for (const tier of TIER_CONFIG) {
    if (score >= tier.min) {
      const range = tier.max - tier.min
      const position = score - tier.min
      const subdivision = 5 - Math.min(4, Math.floor((position / range) * 5))
      return { grade: `${tier.abbr}${subdivision}`, color: tier.color }
    }
  }

  return { grade: 'B5', color: '#CD7F32' }
}

/**
 * 캘리브레이션 상수 (ECP v2.1)
 * - 기준: "도룡뇽" 캐릭터 (지켈 마족) -> 목표 16,000
 * - 계산: 8.483 * (16000 / 11276) ≈ 12.03
 */
const CALIBRATION_FACTOR = 12.03

/**
 * 전투력 계산 메인 함수 (ECP v2.0 - PVE Base)
 */
export function calculateCombatPower(stats: CombatStats): CombatPowerResult {
  // 1. Attack Coefficient
  // Formula: (Attack * (1 + AttInc%) + FlatBonuses) / 1000
  const baseAttack = stats.attackPower
  // 공격력 증가는 퍼센트 합산 (기본 0%)
  const attackMultipliers = 1 + (stats.attackIncrease / 100)
  const flatBonus = stats.pveAttackPower + stats.bossAttackPower

  const finalAttack = (baseAttack * attackMultipliers) + flatBonus
  const attackCoeff = finalAttack / 1000

  // 2. Power Multiplier Components
  // Crit: (Crit - 500) / 1000, Min 0
  const critCoeff = Math.max(0, (stats.criticalHit - 500) / 1000)

  // Dmg Amp (Total)
  const dmgAmpCoeff = (stats.damageAmplification + stats.pveDamageAmplification + stats.bossDamageAmplification) / 100

  // Crit Dmg Amp
  const critDmgAmpCoeff = stats.criticalDamageAmplification / 100

  // Smash (Assume direct %)
  const smashCoeff = stats.smash / 100

  // Total Power Multiplier
  const powerMultiplier = 1 + critCoeff + dmgAmpCoeff + critDmgAmpCoeff + smashCoeff

  // 3. Attack Speed (Linear, Hard Cap 100%)
  const attackSpeedBonus = Math.min(1.0, stats.combatSpeed / 100)
  const attackSpeedMultiplier = 1 + attackSpeedBonus

  // 4. Accuracy Gate
  // Soft gate around 2500? Using logic from verification script.
  // If Accuracy < 2500, penalty applied.
  const ACCURACY_THRESHOLD = 2500
  const accuracyGate = stats.accuracy >= ACCURACY_THRESHOLD
    ? 1.0
    : Math.max(0, 1 - (ACCURACY_THRESHOLD - stats.accuracy) / ACCURACY_THRESHOLD)

  // 5. Multi-Hit
  const { coefficient: multiHitMultiplier, 실제확률: 실제다단확률 } = calculateMultiHitCoefficient(stats.multiHit)

  // 6. Skill Bonus (Placeholder)
  const skillBonusCoeff = 1 + (stats.skillBonus / 100)

  // Total Raw Score
  const rawScore = attackCoeff * powerMultiplier * attackSpeedMultiplier * accuracyGate * multiHitMultiplier * skillBonusCoeff

  // Final Calibration
  const totalScore = Math.floor(rawScore * 1000 * CALIBRATION_FACTOR)

  // Grade
  const { grade, color: gradeColor } = calculateGrade(totalScore)

  return {
    totalScore,
    coefficients: {
      공격력계수: Math.round(attackCoeff * 1000) / 1000,
      피해증폭계수: Math.round(dmgAmpCoeff * 1000) / 1000,
      무기증폭계수: 0, // Not used
      치명타계수: Math.round(critCoeff * 1000) / 1000, // Now represents (Crit-500)/1000
      전투효율계수: Math.round(attackSpeedMultiplier * 1000) / 1000,
      강타계수: Math.round(smashCoeff * 1000) / 1000,
      다단히트계수: Math.round(multiHitMultiplier * 1000) / 1000,
      스킬보너스계수: Math.round(skillBonusCoeff * 1000) / 1000,

      파워멀티플라이어: Math.round(powerMultiplier * 1000) / 1000,
      정확도보정: Math.round(accuracyGate * 1000) / 1000
    },
    details: {
      최종공격력: Math.round(finalAttack),
      총피해증폭: Math.round(dmgAmpCoeff * 100), // Display as %
      치명타확률: 0, // Deprecated representation
      치명타피해배율: Math.round(critDmgAmpCoeff * 1000) / 1000,
      실제다단확률: Math.round(실제다단확률 * 10) / 10,
      DPS기본점수: Math.round(rawScore * 1000) / 1000
    },
    grade,
    gradeColor
  }
}

/**
 * aggregatedStats에서 CombatStats 추출
 * - 누락된 기본 스탯에 대한 Mock/Fallback 로직 포함
 */
export function extractCombatStats(aggregatedStats: StatDetail[], baseStats?: any): CombatStats {
  const getStat = (name: string): { value: number, percentage: number } => {
    const stat = aggregatedStats.find(s => s.name === name)
    return {
      value: stat?.totalValue || 0,
      percentage: stat?.totalPercentage || 0
    }
  }

  // Base Stat Helper
  const getBaseStatValue = (name: string): number => {
    if (!baseStats?.statList) return 0
    const stat = baseStats.statList.find((s: any) => s.name === name)
    return stat ? parseFloat(String(stat.value).replace(/,/g, '')) : 0
  }

  const accuracyVal = getStat('명중').value || getBaseStatValue('명중')
  const critVal = getStat('치명타').value || getBaseStatValue('치명타')
  const attackVal = getStat('공격력').value || getBaseStatValue('공격력')
  // 강타는 퍼센트 스탯으로 저장될 수 있으므로 percentage도 확인
  const smashStat = getStat('강타')
  const smashVal = smashStat.value > 0 ? smashStat.value :
                   smashStat.percentage > 0 ? smashStat.percentage :
                   getStat('강타 적중').percentage

  // [Calibration] Missing Data Fallback (Mock for verifiable average high-ranker)
  const finalAttack = attackVal > 0 ? attackVal : 3100
  const finalAccuracy = accuracyVal > 0 ? accuracyVal : 3800
  const finalCrit = critVal > 0 ? critVal : 1200
  const finalSmash = smashVal > 0 ? smashVal : 300

  return {
    attackPower: finalAttack,
    attackIncrease: getStat('공격력 증가').percentage,

    pveAttackPower: getStat('PVE 공격력').value,
    bossAttackPower: getStat('보스 공격력').value,
    pveDamageAmplification: getStat('PVE 피해 증폭').percentage || getStat('PVE 추가 피해').percentage,
    bossDamageAmplification: getStat('보스 피해 증폭').percentage,

    pvpAttackPower: getStat('PVP 공격력').value,
    pvpAttackIncrease: getStat('PVP 공격력').percentage,
    pvpDamageAmplification: getStat('PVP 피해 증폭').percentage || getStat('PVP 추가 피해').percentage,

    damageAmplification: getStat('피해 증폭').percentage,
    criticalHit: finalCrit,
    criticalDamageAmplification: getStat('치명타 피해 증폭').percentage,

    accuracy: finalAccuracy,
    combatSpeed: getStat('전투 속도').percentage,
    smash: finalSmash,
    multiHit: getStat('다단 히트 적중').percentage,
    skillBonus: 0
  }
}

/**
 * 간단한 전투력 계산 (aggregatedStats에서 직접)
 */
export function calculateCombatPowerFromStats(
  aggregatedStats: StatDetail[],
  baseStats?: any
): CombatPowerResult {
  const combatStats = extractCombatStats(aggregatedStats, baseStats)
  return calculateCombatPower(combatStats)
}

/**
 * PVE 전투력 계산 (기존 calculateCombatPower와 동일)
 */
export function calculatePveCombatPower(stats: CombatStats): number {
  const result = calculateCombatPower(stats)
  return result.totalScore
}

/**
 * PVP 전투력 계산
 * - PVP 공격력, PVP 피해 증폭 사용
 * - 보스 관련 스탯은 제외
 */
export function calculatePvpCombatPower(stats: CombatStats): number {
  // 1. Attack Coefficient (PVP용)
  const baseAttack = stats.attackPower
  // PVP 공격력 증가도 적용
  const attackMultipliers = 1 + ((stats.attackIncrease + stats.pvpAttackIncrease) / 100)
  const flatBonus = stats.pvpAttackPower // PVP 공격력만 사용

  const finalAttack = (baseAttack * attackMultipliers) + flatBonus
  const attackCoeff = finalAttack / 1000

  // 2. Power Multiplier Components (PVP용)
  const critCoeff = Math.max(0, (stats.criticalHit - 500) / 1000)

  // PVP 피해 증폭만 사용 (보스/PVE 제외)
  const dmgAmpCoeff = (stats.damageAmplification + stats.pvpDamageAmplification) / 100
  const critDmgAmpCoeff = stats.criticalDamageAmplification / 100
  const smashCoeff = stats.smash / 100

  const powerMultiplier = 1 + critCoeff + dmgAmpCoeff + critDmgAmpCoeff + smashCoeff

  // 3. Attack Speed
  const attackSpeedBonus = Math.min(1.0, stats.combatSpeed / 100)
  const attackSpeedMultiplier = 1 + attackSpeedBonus

  // 4. Accuracy Gate
  const ACCURACY_THRESHOLD = 2500
  const accuracyGate = stats.accuracy >= ACCURACY_THRESHOLD
    ? 1.0
    : Math.max(0, 1 - (ACCURACY_THRESHOLD - stats.accuracy) / ACCURACY_THRESHOLD)

  // 5. Multi-Hit
  const { coefficient: multiHitMultiplier } = calculateMultiHitCoefficient(stats.multiHit)

  // 6. Skill Bonus
  const skillBonusCoeff = 1 + (stats.skillBonus / 100)

  // Total Raw Score
  const rawScore = attackCoeff * powerMultiplier * attackSpeedMultiplier * accuracyGate * multiHitMultiplier * skillBonusCoeff

  // Final Calibration
  return Math.floor(rawScore * 1000 * CALIBRATION_FACTOR)
}

/**
 * PVE/PVP 전투력 동시 계산
 */
export function calculateDualCombatPower(stats: CombatStats): CombatPowerDualResult {
  const pveScore = calculatePveCombatPower(stats)
  const pvpScore = calculatePvpCombatPower(stats)

  const pveGrade = calculateGrade(pveScore)
  const pvpGrade = calculateGrade(pvpScore)

  return {
    pve: pveScore,
    pvp: pvpScore,
    pveGrade: pveGrade.grade,
    pveGradeColor: pveGrade.color,
    pvpGrade: pvpGrade.grade,
    pvpGradeColor: pvpGrade.color
  }
}

/**
 * aggregatedStats에서 PVE/PVP 전투력 계산
 */
export function calculateDualCombatPowerFromStats(
  aggregatedStats: StatDetail[],
  baseStats?: any
): CombatPowerDualResult {
  const combatStats = extractCombatStats(aggregatedStats, baseStats)
  return calculateDualCombatPower(combatStats)
}
