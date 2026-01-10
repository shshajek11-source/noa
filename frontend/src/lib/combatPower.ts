/**
 * AION2 전투력 계산 시스템 v1.0
 *
 * 캐릭터의 종합 전투력을 계산합니다.
 * 공식: 전투력 = DPS 기본 점수 × 다단히트 계수 × 스킬 보너스 계수
 */

import type { StatDetail } from '../types/stats'

/**
 * 전투력 계산에 필요한 스탯 인터페이스
 */
export interface CombatStats {
  // 공격력 관련
  공격력: number
  추가공격력: number
  공격력증가: number      // %
  보스공격력: number
  PVE공격력: number

  // 피해 증폭 관련
  피해증폭: number        // %
  PVE피해증폭: number     // %
  보스피해증폭: number    // %

  // 무기 증폭
  무기피해증폭: number    // %

  // 치명타 관련
  치명타: number
  정확: number
  치명타피해증폭: number  // %

  // 전투 효율
  전투속도: number        // %
  재사용감소: number      // %

  // 기타
  강타: number            // %
  다단히트: number        // %

  // 스킬 보너스 (선택)
  스킬보너스?: number     // %
}

/**
 * 전투력 계산 결과 상세
 */
export interface CombatPowerResult {
  // 최종 점수
  totalScore: number

  // 각 계수 상세
  coefficients: {
    공격력계수: number
    피해증폭계수: number
    무기증폭계수: number
    치명타계수: number
    전투효율계수: number
    강타계수: number
    다단히트계수: number
    스킬보너스계수: number
  }

  // 중간 계산값
  details: {
    최종공격력: number
    총피해증폭: number
    치명타확률: number
    치명타피해배율: number
    실제다단확률: number
    DPS기본점수: number
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
function calculateMultiHitCoefficient(다단히트스탯: number): { coefficient: number, 실제확률: number } {
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
 * - 현재 랭킹 1등 (~37,000) = D5
 * - 미래 성장 여유 충분히 확보
 */
const TIER_CONFIG = [
  { name: 'Diamond', abbr: 'D', color: '#B9F2FF', min: 35000, max: 100000 },  // 현재 탑 = D5
  { name: 'Ruby', abbr: 'R', color: '#E0115F', min: 25000, max: 35000 },
  { name: 'Sapphire', abbr: 'Sa', color: '#0F52BA', min: 17000, max: 25000 },
  { name: 'Emerald', abbr: 'E', color: '#50C878', min: 11000, max: 17000 },
  { name: 'Platinum', abbr: 'P', color: '#E5E4E2', min: 7000, max: 11000 },
  { name: 'Gold', abbr: 'G', color: '#FFD700', min: 4000, max: 7000 },
  { name: 'Silver', abbr: 'Si', color: '#C0C0C0', min: 2000, max: 4000 },
  { name: 'Bronze', abbr: 'B', color: '#CD7F32', min: 0, max: 2000 },
]

/**
 * 전투력 등급 계산 (보석 티어 시스템)
 * - 각 티어 1~5 세분화 (1이 최고)
 * - D1이 최상위 등급
 */
function calculateGrade(score: number): { grade: string, color: string } {
  // Diamond 최대치 이상은 D1 고정
  if (score >= 100000) {
    return { grade: 'D1', color: '#B9F2FF' }
  }

  // 각 티어에서 세분화 계산
  for (const tier of TIER_CONFIG) {
    if (score >= tier.min) {
      const range = tier.max - tier.min
      const position = score - tier.min
      // 5등분하여 1~5 계산 (높을수록 1에 가까움)
      const subdivision = 5 - Math.min(4, Math.floor((position / range) * 5))
      return { grade: `${tier.abbr}${subdivision}`, color: tier.color }
    }
  }

  return { grade: 'B5', color: '#CD7F32' }
}

/**
 * 캘리브레이션 상수
 * - 기준: 지켈 서버 마족 "죄수" 캐릭터 = 37132 전투력
 * - 퍼센트만 사용하는 새 계산식 기준
 */
const CALIBRATION_FACTOR = 2.32

/**
 * 전투력 계산 메인 함수
 */
export function calculateCombatPower(stats: CombatStats): CombatPowerResult {
  // 1. 공격력 계수 (1000 기준 정규화)
  const 기본공격력 = stats.공격력 + stats.추가공격력
  const 최종공격력 = (기본공격력 * (1 + stats.공격력증가 / 100))
                    + stats.보스공격력 + stats.PVE공격력
  const 공격력계수 = 최종공격력 / 1000

  // 2. 피해 증폭 계수
  const 총피해증폭 = stats.피해증폭 + stats.PVE피해증폭 + stats.보스피해증폭
  const 피해증폭계수 = 1 + (총피해증폭 / 100)

  // 3. 무기 증폭 계수
  const 무기증폭계수 = 1 + (stats.무기피해증폭 / 100)

  // 4. 치명타 계수
  const 치명타확률 = Math.min(100, (stats.치명타 * 0.7) / 10 + (stats.정확 / 10))
  const 치명타피해배율 = 0.5 + (stats.치명타피해증폭 / 100)
  const 치명타계수 = 1 + (치명타확률 / 100) * 치명타피해배율

  // 5. 전투 효율 계수
  const 전투효율계수 = (1 + stats.전투속도 / 100) * (1 + stats.재사용감소 / 100)

  // 6. 강타 계수
  const 강타계수 = 1 + (stats.강타 / 100)

  // 7. DPS 기본 점수
  const DPS기본점수 = 공격력계수 * 피해증폭계수 * 무기증폭계수
                     * 치명타계수 * 전투효율계수 * 강타계수

  // 8. 다단히트 계수
  const { coefficient: 다단히트계수, 실제확률: 실제다단확률 } =
    calculateMultiHitCoefficient(stats.다단히트)

  // 9. 스킬 보너스 계수
  const 스킬보너스계수 = 1 + ((stats.스킬보너스 || 0) / 100)

  // 10. 최종 전투력
  const 전투력 = DPS기본점수 * 다단히트계수 * 스킬보너스계수

  // 1000 단위로 정규화 + 캘리브레이션 적용
  const totalScore = Math.round(전투력 * 1000 * CALIBRATION_FACTOR)

  // 등급 계산
  const { grade, color: gradeColor } = calculateGrade(totalScore)

  return {
    totalScore,
    coefficients: {
      공격력계수: Math.round(공격력계수 * 1000) / 1000,
      피해증폭계수: Math.round(피해증폭계수 * 1000) / 1000,
      무기증폭계수: Math.round(무기증폭계수 * 1000) / 1000,
      치명타계수: Math.round(치명타계수 * 1000) / 1000,
      전투효율계수: Math.round(전투효율계수 * 1000) / 1000,
      강타계수: Math.round(강타계수 * 1000) / 1000,
      다단히트계수: Math.round(다단히트계수 * 1000) / 1000,
      스킬보너스계수: Math.round(스킬보너스계수 * 1000) / 1000,
    },
    details: {
      최종공격력: Math.round(최종공격력),
      총피해증폭: Math.round(총피해증폭 * 10) / 10,
      치명타확률: Math.round(치명타확률 * 10) / 10,
      치명타피해배율: Math.round(치명타피해배율 * 1000) / 1000,
      실제다단확률: Math.round(실제다단확률 * 10) / 10,
      DPS기본점수: Math.round(DPS기본점수 * 1000) / 1000,
    },
    grade,
    gradeColor,
  }
}

/**
 * aggregatedStats에서 CombatStats 추출
 */
export function extractCombatStats(aggregatedStats: StatDetail[], baseStats?: any): CombatStats {
  // 스탯 이름으로 값 찾기 헬퍼
  const getStat = (name: string): { value: number, percentage: number } => {
    const stat = aggregatedStats.find(s => s.name === name)
    return {
      value: stat?.totalValue || 0,
      percentage: stat?.totalPercentage || 0
    }
  }

  // 정확 스탯은 baseStats에서 가져옴 (AGI 기반)
  let 정확값 = 0
  if (baseStats?.statList) {
    const 정확Stat = baseStats.statList.find((s: any) => s.name === '정확')
    if (정확Stat) {
      정확값 = parseFloat(정확Stat.value) || 0
    }
  }

  return {
    // 공격력 관련 - 고정값 사용
    공격력: getStat('공격력').value,
    추가공격력: getStat('추가 공격력').value,
    공격력증가: getStat('공격력 증가').percentage,  // 퍼센트만
    보스공격력: getStat('보스 공격력').value,
    PVE공격력: getStat('PVE 공격력').value,

    // 피해 증폭 관련 - 퍼센트만 사용 (고정값은 별도 계산 필요)
    피해증폭: getStat('피해 증폭').percentage,
    PVE피해증폭: getStat('PVE 피해 증폭').percentage,
    보스피해증폭: getStat('보스 피해 증폭').percentage,

    // 무기 증폭 - 퍼센트만 사용
    무기피해증폭: getStat('무기 피해 증폭').percentage,

    // 치명타 관련 - 고정값 사용, 피해증폭은 퍼센트
    치명타: getStat('치명타').value,
    정확: 정확값,
    치명타피해증폭: getStat('치명타 피해 증폭').percentage,

    // 전투 효율 - 퍼센트만 사용
    전투속도: getStat('전투 속도').percentage,
    재사용감소: getStat('재사용 시간 감소').percentage + getStat('재사용 시간').percentage,

    // 기타 - 퍼센트만 사용
    강타: getStat('강타').percentage,
    다단히트: getStat('다단 히트 적중').percentage,

    // 스킬 보너스는 별도 계산 필요
    스킬보너스: 0,
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

  // 디버그: 추출된 스탯 확인
  if (typeof window !== 'undefined' && (window as any).DEBUG_COMBAT_POWER) {
    console.log('[CombatPower] Extracted Stats:', combatStats)
    console.log('[CombatPower] Available Stats:', aggregatedStats.map(s => `${s.name}: ${s.totalValue}+${s.totalPercentage}%`))
  }

  return calculateCombatPower(combatStats)
}
