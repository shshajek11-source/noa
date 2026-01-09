/**
 * 능력치 검증 훅
 * 자동으로 능력치 데이터의 정확성을 검증하고 결과를 관리합니다.
 * 
 * 작성일: 2025-01-15
 * 파일: frontend/src/hooks/useStatsValidation.ts
 */

import { useState, useEffect, useCallback } from 'react'
import { validateCharacterStats, StatsValidationCache, ValidationResult, DEBUG_CONFIG } from '../lib/statsValidator'
import { StatDetail } from '../types/stats'

/**
 * 능력치 검증 훅 결과 타입
 */
export interface UseStatsValidationReturn {
  validationResult: ValidationResult | null
  isValidating: boolean
  isValid: boolean
  lastValidationTime: string | null
  inconsistencyCount: number
  accuracy: number
  refreshValidation: () => Promise<void>
  clearCache: () => void
  debugInfo: string | null
}

/**
 * 능력치 검증 훅
 */
export function useStatsValidation(
  characterId: string | undefined,
  serverId: string | undefined,
  calculatedStats: StatDetail[],
  autoValidate: boolean = DEBUG_CONFIG.autoValidation
): UseStatsValidationReturn {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [lastValidationTime, setLastValidationTime] = useState<string | null>(null)

  // 검증 실행 함수
  const performValidation = useCallback(async () => {
    if (!characterId || !serverId || calculatedStats.length === 0) {
      console.log('검증 조건 부족:', { characterId, serverId, statsLength: calculatedStats.length })
      return
    }

    const validationKey = `${characterId}-${serverId}`
    
    // 캐시 확인
    const cached = StatsValidationCache.get(validationKey)
    if (cached) {
      setValidationResult(cached)
      setLastValidationTime(cached.timestamp)
      return
    }

    setIsValidating(true)
    
    try {
      const result = await validateCharacterStats(characterId, serverId, calculatedStats)
      setValidationResult(result)
      setLastValidationTime(result.timestamp)

      // 결과 로깅
      if (DEBUG_CONFIG.logLevel === 'debug') {
        console.log(`[${characterId}] 능력치 검증 완료:`, {
          isValid: result.isValid,
          accuracy: result.accuracy,
          inconsistencies: result.inconsistencies.length,
          warnings: result.warnings.length
        })
      }

    } catch (error) {
      console.error(`[${characterId}] 능력치 검증 실패:`, error)
      
      // 오류 결과 생성
      const errorResult: ValidationResult = {
        isValid: false,
        inconsistencies: [],
        warnings: [`검증 중 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`],
        totalDifferences: 0,
        accuracy: 0,
        timestamp: new Date().toISOString()
      }
      
      setValidationResult(errorResult)
      setLastValidationTime(errorResult.timestamp)
      
    } finally {
      setIsValidating(false)
    }
  }, [characterId, serverId, calculatedStats])

  // 자동 검증
  useEffect(() => {
    if (!DEBUG_CONFIG.enabled || !autoValidate) {
      return
    }

    const validationKey = `${characterId}-${serverId}`
    
    // 이미 유효한 캐시가 있으면 스킵
    if (StatsValidationCache.isValid(validationKey)) {
      return
    }

    // 딜레이 후 검증 실행 (디바운스)
    const timer = setTimeout(() => {
      performValidation()
    }, 1000) // 1초 딜레이

    return () => clearTimeout(timer)
    
  }, [characterId, serverId, calculatedStats, autoValidate, performValidation])

  // 수동 새로고침
  const refreshValidation = useCallback(async () => {
    if (characterId && serverId) {
      StatsValidationCache.clear()
      await performValidation()
    }
  }, [characterId, serverId, performValidation])

  // 캐시 정리
  const clearCache = useCallback(() => {
    StatsValidationCache.clear()
    setValidationResult(null)
    setLastValidationTime(null)
  }, [])

  // 디버그 정보 생성
  const debugInfo = useCallback(() => {
    if (!validationResult) return null
    
    const lines = [
      '=== 능력치 검증 디버그 정보 ===',
      `캐릭터: ${characterId}`,
      `검증 시간: ${validationResult.timestamp}`,
      `상태: ${validationResult.isValid ? '정상' : '불일치'}`,
      `정확도: ${validationResult.accuracy}%`,
      `불일치 개수: ${validationResult.inconsistencies.length}`,
      `경고 개수: ${validationResult.warnings.length}`,
      ''
    ]

    if (validationResult.inconsistencies.length > 0) {
      lines.push('--- 불일치 목록 ---')
      validationResult.inconsistencies.forEach((inconsistency, index) => {
        lines.push(`${index + 1}. [${inconsistency.severity.toUpperCase()}] ${inconsistency.statName}`)
        lines.push(`   계산: ${inconsistency.calculatedValue}`)
        lines.push(`   실제: ${inconsistency.actualValue}`)
        lines.push(`   차이: ${inconsistency.difference} (허용: ${inconsistency.tolerance})`)
        lines.push('')
      })
    }

    if (validationResult.warnings.length > 0) {
      lines.push('--- 경고 ---')
      validationResult.warnings.forEach((warning, index) => {
        lines.push(`${index + 1}. ${warning}`)
      })
      lines.push('')
    }

    return lines.join('\n')
  }, [validationResult, characterId])

  return {
    validationResult,
    isValidating,
    isValid: validationResult?.isValid ?? false,
    lastValidationTime,
    inconsistencyCount: validationResult?.inconsistencies.length ?? 0,
    accuracy: validationResult?.accuracy ?? 0,
    refreshValidation,
    clearCache,
    debugInfo: debugInfo()
  }
}

/**
 * 간단한 검증 상태 훅
 */
export function useSimpleStatsValidation(
  characterId: string | undefined,
  serverId: string | undefined,
  calculatedStats: StatDetail[]
) {
  const {
    validationResult,
    isValidating,
    isValid,
    inconsistencyCount,
    accuracy,
    refreshValidation
  } = useStatsValidation(characterId, serverId, calculatedStats, false)

  return {
    status: isValidating ? '검증 중' : (isValid ? '정상' : '불일치'),
    hasIssues: !isValid,
    issueCount: inconsistencyCount,
    accuracy,
    refreshValidation
  }
}

/**
 * 개발 모드용 상세 디버그 훅
 */
export function useDebugStatsValidation(
  characterId: string | undefined,
  serverId: string | undefined,
  calculatedStats: StatDetail[]
) {
  const {
    validationResult,
    isValidating,
    isValid,
    inconsistencyCount,
    accuracy,
    refreshValidation,
    clearCache,
    debugInfo
  } = useStatsValidation(characterId, serverId, calculatedStats, true)

  return {
    isValid,
    isDebugging: true,
    validationResult,
    isValidating,
    inconsistencyCount,
    accuracy,
    refreshValidation,
    clearCache,
    debugInfo,
    // 상세 분석
    analysis: {
      criticalIssues: validationResult?.inconsistencies.filter(i => i.severity === 'high').length ?? 0,
      mediumIssues: validationResult?.inconsistencies.filter(i => i.severity === 'medium').length ?? 0,
      lowIssues: validationResult?.inconsistencies.filter(i => i.severity === 'low').length ?? 0,
      totalDifference: validationResult?.totalDifferences ?? 0
    }
  }
}

export default useStatsValidation