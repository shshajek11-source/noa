/**
 * Stats aggregation and display types
 */

export type StatCategory = 'attack' | 'defense' | 'critical' | 'utility' | 'all'

export interface StatSource {
  name: string                   // '무기', '전투의 달인', '네자칸' 등
  value: number                  // +100
  percentage?: number            // +5% (옵션)
  description?: string           // 추가 설명
}

export interface PercentageSource {
  sourceName: string             // '위력', '파괴[지켈]' 등
  sourceValue: number            // 115, 20 등 (스탯 포인트)
  statName: string               // '공격력 증가' 등
  percentage: number             // 11.5, 4 등
}

export interface StatSources {
  equipment: StatSource[]        // 장비별 상세
  titles: StatSource[]           // 타이틀별 상세
  daevanion: StatSource[]        // 대바니온별 상세
  baseValue: number              // 기본값 (하위 호환용)
  baseStats?: StatSource[]       // 기본 스탯에서 파생된 2차 능력치
  percentageSources?: PercentageSource[]  // % 증가 출처 상세
}

export interface StatDetail {
  name: string                   // '공격력'
  totalValue: number             // 350
  totalPercentage: number        // 15% (합계)
  sources: StatSources
  color: string                  // '#EF4444'
  category: StatCategory
  isExpanded?: boolean           // 아코디언 펼침 상태
}

export interface StatColorThreshold {
  high: number
  medium: number
  low: number
}

export interface StatThresholds {
  [key: string]: StatColorThreshold
}

export interface StatBonusResult {
  baseValue: number              // 기본 수치
  bonusValue: number             // 증가 수치
  totalValue: number             // 최종 수치
  increasePercentage: number       // 증가 퍼센트
  source: string                 // 증가 출처 (장비, 스킬, 버프 등)
  isDiminishingReturns: boolean // 수확 체감 여부
}
