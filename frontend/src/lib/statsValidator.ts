/**
 * AION 2 능력치 데이터 검증 시스템
 * 실시간 API 데이터와 계산된 능력치를 비교하여 불일치를 감지합니다.
 * 
 * 작성일: 2025-01-15
 * 파일: frontend/src/lib/statsValidator.ts
 */

import { StatDetail } from '../types/stats'

/**
 * 능력치 불일치 타입 정의
 */
export interface StatInconsistency {
  statName: string
  calculatedValue: number
  actualValue: number
  difference: number
  tolerance: number
  severity: 'low' | 'medium' | 'high'
  message: string
}

/**
 * 검증 결과 타입 정의
 */
export interface ValidationResult {
  isValid: boolean
  inconsistencies: StatInconsistency[]
  warnings: string[]
  totalDifferences: number
  accuracy: number
  timestamp: string
}

/**
 * 능력치별 허용 오차 범위 (실제 게임 데이터 기준)
 */
const STAT_TOLERANCES: Record<string, number> = {
  '공격력': 50,        // ±50 이상이면 경고
  '방어력': 30,        // ±30 이상이면 경고  
  '생명력': 500,       // ±500 이상이면 경고
  '치명타': 20,        // ±20 이상이면 경고
  '치명타 공격력': 15,  // ±15 이상이면 경고
  '명중': 25,          // ±25 이상이면 경고
  '회피': 15,          // ±15 이상이면 경고
  '정신력': 100,       // ±100 이상이면 경고
  '막기': 15,          // ±15 이상이면 경고
  '전투 속도': 5,     // ±5 이상이면 경고
  '이동 속도': 5,      // ±5 이상이면 경고
  '체력': 50,          // ±50 이상이면 경고
}

/**
 * 심각도별 차이 임계값
 */
const SEVERITY_THRESHOLDS = {
  low: 0.1,    // 10% 미만 차이
  medium: 0.25, // 25% 미만 차이  
  high: 0.5     // 50% 이상 차이
}

/**
 * 능력치 불일치 심각도 계산
 */
function calculateSeverity(
  difference: number, 
  actualValue: number
): 'low' | 'medium' | 'high' {
  const ratio = Math.abs(difference) / Math.max(actualValue, 1)
  
  if (ratio >= SEVERITY_THRESHOLDS.high) return 'high'
  if (ratio >= SEVERITY_THRESHOLDS.medium) return 'medium'
  return 'low'
}

/**
 * 실제 게임 API에서 능력치 데이터 가져오기
 */
export async function fetchRealTimeStats(
  characterId: string, 
  serverId: string
): Promise<any> {
  try {
    const response = await fetch(`/api/character?id=${characterId}&server=${serverId}`)
    
    if (!response.ok) {
      throw new Error(`API 요청 실패: ${response.status}`)
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    console.error('실시간 API 데이터 가져오기 실패:', error)
    throw error
  }
}

/**
 * 계산된 능력치와 실제 API 데이터 비교
 */
export function compareStats(
  calculatedStats: StatDetail[], 
  apiResponse: any
): ValidationResult {
  const inconsistencies: StatInconsistency[] = []
  const warnings: string[] = []
  let totalDifferences = 0

  if (!apiResponse?.stats?.statList) {
    warnings.push('API 응답에 statList가 없습니다.')
    return {
      isValid: false,
      inconsistencies,
      warnings,
      totalDifferences,
      accuracy: 0,
      timestamp: new Date().toISOString()
    }
  }

  const apiStats = apiResponse.stats.statList

  calculatedStats.forEach(calcStat => {
    // API에서 동일한 스탯 찾기
    const apiStat = apiStats.find((s: any) => {
      // 정확히 일치하는 경우
      if (s.name === calcStat.name) return true
      
      // 부분 일치 확인 (예: "공격력 증가" vs "공격력")
      const apiName = s.name.replace(/\s*(증가|감소|상승|하락)/g, '')
      const calcName = calcStat.name.replace(/\s*(증가|감소|상승|하락)/g, '')
      
      return apiName === calcName || apiName.includes(calcName) || calcName.includes(apiName)
    })

    if (!apiStat) {
      warnings.push(`API에 ${calcStat.name} 정보가 없습니다.`)
      return
    }

    const apiValue = apiStat.value || 0
    const calcValue = calcStat.totalValue + calcStat.totalPercentage
    const difference = Math.abs(calcValue - apiValue)
    const tolerance = STAT_TOLERANCES[calcStat.name] || 10
    
    // 차이가 허용 범위를 벗어나면 기록
    if (difference > tolerance) {
      const severity = calculateSeverity(difference, apiValue)
      
      inconsistencies.push({
        statName: calcStat.name,
        calculatedValue: calcValue,
        actualValue: apiValue,
        difference,
        tolerance,
        severity,
        message: `${calcStat.name}: 계산된 값(${calcValue}) vs 실제 값(${apiValue}) = 차이 ${difference}`
      })
      
      totalDifferences += difference
    }
  })

  // 전체 정확도 계산
  const totalPossibleValue = apiStats.reduce((sum: number, stat: any) => {
    return sum + (stat.value || 0)
  }, 0)
  
  const accuracy = totalPossibleValue > 0 
    ? Math.max(0, 100 - (totalDifferences / totalPossibleValue * 100))
    : 0

  return {
    isValid: inconsistencies.length === 0,
    inconsistencies,
    warnings,
    totalDifferences,
    accuracy: Math.round(accuracy * 100) / 100, // 소수점 2자리까지
    timestamp: new Date().toISOString()
  }
}

/**
 * 데이터 검증 및 오류 보고
 */
export async function validateCharacterStats(
  characterId: string,
  serverId: string,
  calculatedStats: StatDetail[]
): Promise<ValidationResult> {
  try {
    // 1. 실시간 API 데이터 가져오기
    console.log(`[${characterId}] 실시간 능력치 검증 시작...`)
    const apiResponse = await fetchRealTimeStats(characterId, serverId)
    
    // 2. 능력치 비교
    const result = compareStats(calculatedStats, apiResponse)
    
    // 3. 결과 로깅
    if (!result.isValid) {
      console.warn(`[${characterId}] 능력치 불일치 감지:`, result)
      
      // 심각도 높은 불일치는 즉시 알림
      const criticalIssues = result.inconsistencies.filter(i => i.severity === 'high')
      if (criticalIssues.length > 0) {
        console.error(`[${characterId}] 심각한 능력치 불일치:`, criticalIssues)
      }
    } else {
      console.log(`[${characterId}] 능력치 검증 통과 (정확도: ${result.accuracy}%)`)
    }
    
    return result
    
  } catch (error) {
    console.error(`[${characterId}] 능력치 검증 실패:`, error)
    
    return {
      isValid: false,
      inconsistencies: [],
      warnings: [`검증 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`],
      totalDifferences: 0,
      accuracy: 0,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * 자동 보정이 필요한 스탯 목록 생성
 */
export function generateAutoCorrections(
  inconsistencies: StatInconsistency[]
): Array<{ statName: string, correction: number, action: string }> {
  return inconsistencies.map(inconsistency => ({
    statName: inconsistency.statName,
    correction: inconsistency.actualValue - inconsistency.calculatedValue,
    action: `${inconsistency.severity === 'high' ? '즉시' : '권장'} 보정: ${
      inconsistency.actualValue > inconsistency.calculatedValue ? '+' : ''
    }${inconsistency.actualValue - inconsistency.calculatedValue}`
  }))
}

/**
 * 검증 결과를 캐시하고 주기적으로 재검증
 */
export class StatsValidationCache {
  private static cache = new Map<string, { result: ValidationResult, timestamp: number }>()
  private static readonly CACHE_DURATION = 5 * 60 * 1000 // 5분

  static get(key: string): ValidationResult | null {
    const cached = this.cache.get(key)
    if (!cached) return null
    
    // 캐시 만료 확인
    if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
      this.cache.delete(key)
      return null
    }
    
    return cached.result
  }

  static set(key: string, result: ValidationResult): void {
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    })
  }

  static clear(): void {
    this.cache.clear()
  }

  static isValid(key: string): boolean {
    const cached = this.cache.get(key)
    return cached != null && cached.result.isValid
  }
}

/**
 * 개발 모드용 상세 디버그 정보 생성
 */
export function generateDebugInfo(
  calculatedStats: StatDetail[],
  validationResult: ValidationResult
): string {
  const lines = [
    '=== 능력치 검증 디버그 정보 ===',
    `검증 시간: ${validationResult.timestamp}`,
    `전체 정확도: ${validationResult.accuracy}%`,
    `불일치 개수: ${validationResult.inconsistencies.length}`,
    '',
    '--- 불일치 상세 ---'
  ]

  validationResult.inconsistencies.forEach(inconsistency => {
    lines.push(`[${inconsistency.severity.toUpperCase()}] ${inconsistency.statName}`)
    lines.push(`  계산: ${inconsistency.calculatedValue}`)
    lines.push(`  실제: ${inconsistency.actualValue}`)
    lines.push(`  차이: ${inconsistency.difference} (허용: ${inconsistency.tolerance})`)
    lines.push('')
  })

  if (validationResult.warnings.length > 0) {
    lines.push('--- 경고 ---')
    validationResult.warnings.forEach(warning => {
      lines.push(`⚠️ ${warning}`)
    })
  }

  return lines.join('\n')
}

/**
 * 사용자에게 표시할 요약 메시지 생성
 */
export function generateUserMessage(result: ValidationResult): string {
  if (result.isValid) {
    return `✅ 능력치 검증 통과 (정확도: ${result.accuracy}%)`
  }

  const criticalCount = result.inconsistencies.filter(i => i.severity === 'high').length
  const mediumCount = result.inconsistencies.filter(i => i.severity === 'medium').length

  if (criticalCount > 0) {
    return `❌ 심각한 능력치 불일치: ${criticalCount}개 항목`
  } else if (mediumCount > 0) {
    return `⚠️ 능력치 불일치: ${mediumCount}개 항목 (정확도: ${result.accuracy}%)`
  } else {
    return `🟡 미세한 능력치 차이: ${result.inconsistencies.length}개 항목`
  }
}

/**
 * 환경 변수로 디버그 모드 제어
 */
export const DEBUG_CONFIG = {
  enabled: process.env.NODE_ENV === 'development' || 
            process.env.NEXT_PUBLIC_DEBUG_STATS === 'true',
  
  autoValidation: process.env.NEXT_PUBLIC_AUTO_VALIDATE_STATS === 'true',
  
  logLevel: process.env.NEXT_PUBLIC_STATS_LOG_LEVEL || 'info', // 'debug', 'info', 'warn', 'error'
  
  showComparisonDetails: process.env.NEXT_PUBLIC_SHOW_COMPARISON === 'true'
}

export default {
  validateCharacterStats,
  compareStats,
  fetchRealTimeStats,
  generateAutoCorrections,
  generateDebugInfo,
  generateUserMessage,
  StatsValidationCache
}