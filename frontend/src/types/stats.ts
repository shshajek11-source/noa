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

export interface StatSources {
  equipment: StatSource[]        // 장비별 상세
  titles: StatSource[]           // 타이틀별 상세
  daevanion: StatSource[]        // 대바니온별 상세
  baseValue: number              // 기본값
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
