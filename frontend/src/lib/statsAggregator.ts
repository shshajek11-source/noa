import type { StatDetail, StatSource, StatThresholds, StatCategory } from '../types/stats'

/**
 * 스탯 임계값 정의 (서버 평균 기준)
 */
const STAT_THRESHOLDS: StatThresholds = {
  '공격력': { high: 2000, medium: 1500, low: 1000 },
  '방어력': { high: 1500, medium: 1000, low: 600 },
  '치명타': { high: 500, medium: 350, low: 200 },
  '치명타 공격력': { high: 300, medium: 200, low: 100 },
  '명중': { high: 500, medium: 350, low: 200 },
  '회피': { high: 400, medium: 250, low: 150 },
  '생명력': { high: 10000, medium: 7000, low: 5000 },
  '정신력': { high: 5000, medium: 3500, low: 2000 },
  '막기': { high: 400, medium: 250, low: 150 },
  '전투 속도': { high: 300, medium: 200, low: 100 },
  '이동 속도': { high: 200, medium: 150, low: 100 },
}

/**
 * 스탯 카테고리 매핑
 */
const STAT_CATEGORY_MAP: Record<string, StatCategory> = {
  // 공격
  '공격력': 'attack',
  '위력': 'attack',
  '치명타': 'critical',
  '치명타 공격력': 'critical',
  '치명타 피해': 'critical',
  '완벽': 'critical',
  '강타': 'attack',
  '명중': 'attack',

  // 방어
  '방어력': 'defense',
  '생명력': 'defense',
  '체력': 'defense',
  '막기': 'defense',
  '회피': 'defense',
  '철벽': 'defense',
  '치명타 저항': 'defense',
  '완벽 저항': 'defense',
  '강타 저항': 'defense',

  // 유틸리티
  '정신력': 'utility',
  '전투 속도': 'utility',
  '이동 속도': 'utility',
  '재사용 시간': 'utility',
  '정신력 소모량': 'utility',
  '재생': 'utility',
}

/**
 * 스탯 값에 따른 색상 반환
 */
export function getStatColor(statName: string, value: number): string {
  const threshold = STAT_THRESHOLDS[statName]

  if (!threshold) {
    return '#9CA3AF' // 기본 회색
  }

  if (value >= threshold.high) return '#EF4444'   // 🔴 빨강 (높음)
  if (value >= threshold.medium) return '#FBBF24' // 🟡 노랑 (보통-높음)
  if (value >= threshold.low) return '#10B981'    // 🟢 초록 (보통)
  return '#3B82F6'                                 // 🔵 파랑 (낮음)
}

/**
 * 스탯 이름에서 카테고리 반환
 */
export function getStatCategory(statName: string): StatCategory {
  return STAT_CATEGORY_MAP[statName] || 'utility'
}

/**
 * 문자열에서 스탯 정보 파싱
 * 예: "공격력 +100" → { name: "공격력", value: 100 }
 *     "치명타 증가 +5%" → { name: "치명타", value: 0, percentage: 5 }
 */
export function parseStatString(statStr: string): { name: string, value: number, percentage: number } | null {
  if (!statStr) return null

  // 패턴: "스탯명 +숫자%" 또는 "스탯명 +숫자" 또는 "스탯명: +숫자"
  const percentMatch = statStr.match(/([가-힣\s]+)\s*[+\-]?\s*(\d+(?:\.\d+)?)\s*%/)
  if (percentMatch) {
    const name = percentMatch[1].trim()
      .replace(/증가|감소|저항|관통/g, '')
      .trim()
    return {
      name,
      value: 0,
      percentage: parseFloat(percentMatch[2])
    }
  }

  const valueMatch = statStr.match(/([가-힣\s]+)\s*[:+\-]?\s*(\d+(?:,\d+)*)/)
  if (valueMatch) {
    const name = valueMatch[1].trim()
      .replace(/증가|감소|저항|관통/g, '')
      .trim()
    return {
      name,
      value: parseInt(valueMatch[2].replace(/,/g, ''), 10),
      percentage: 0
    }
  }

  return null
}

/**
 * 장비에서 스탯 추출
 */
function extractEquipmentStats(equipment: any[]): Map<string, StatSource[]> {
  const statsMap = new Map<string, StatSource[]>()

  equipment.forEach(item => {
    if (!item) return

    const itemName = item.name || item.slot || '알 수 없음'

    // 마석 (Manastones)
    if (item.manastones && Array.isArray(item.manastones)) {
      item.manastones.forEach((manastone: any) => {
        const parsed = parseStatString(manastone.type || manastone.name || '')
        if (parsed && parsed.name) {
          if (!statsMap.has(parsed.name)) {
            statsMap.set(parsed.name, [])
          }
          statsMap.get(parsed.name)!.push({
            name: `${itemName} (마석)`,
            value: parsed.value,
            percentage: parsed.percentage
          })
        }
      })
    }

    // 장비 기본 옵션 (detail.statList 등이 있다면)
    if (item.raw?.detail?.statList && Array.isArray(item.raw.detail.statList)) {
      item.raw.detail.statList.forEach((stat: any) => {
        const parsed = parseStatString(stat.desc || stat.name || '')
        if (parsed && parsed.name) {
          if (!statsMap.has(parsed.name)) {
            statsMap.set(parsed.name, [])
          }
          statsMap.get(parsed.name)!.push({
            name: itemName,
            value: parsed.value,
            percentage: parsed.percentage
          })
        }
      })
    }
  })

  return statsMap
}

/**
 * 타이틀에서 스탯 추출
 */
function extractTitleStats(titles: any): Map<string, StatSource[]> {
  const statsMap = new Map<string, StatSource[]>()

  if (!titles || !titles.titleList) return statsMap

  titles.titleList.forEach((title: any) => {
    // 장착된 타이틀만 처리 (equipped가 true인 경우)
    // 또는 모든 타이틀의 statList 처리 (보유 효과)
    const titleName = title.name || '알 수 없는 타이틀'

    // statList (보유 시 적용되는 스탯)
    if (title.statList && Array.isArray(title.statList)) {
      title.statList.forEach((stat: any) => {
        const parsed = parseStatString(stat.desc || '')
        if (parsed && parsed.name) {
          if (!statsMap.has(parsed.name)) {
            statsMap.set(parsed.name, [])
          }
          statsMap.get(parsed.name)!.push({
            name: titleName,
            value: parsed.value,
            percentage: parsed.percentage,
            description: '보유 효과'
          })
        }
      })
    }

    // equipStatList (장착 시 적용되는 스탯) - 현재 장착 중인 타이틀만
    if (title.equipped && title.equipStatList && Array.isArray(title.equipStatList)) {
      title.equipStatList.forEach((stat: any) => {
        const parsed = parseStatString(stat.desc || '')
        if (parsed && parsed.name) {
          if (!statsMap.has(parsed.name)) {
            statsMap.set(parsed.name, [])
          }
          statsMap.get(parsed.name)!.push({
            name: `${titleName} (장착)`,
            value: parsed.value,
            percentage: parsed.percentage,
            description: '장착 효과'
          })
        }
      })
    }
  })

  return statsMap
}

/**
 * 대바니온에서 스탯 추출
 */
function extractDaevanionStats(daevanion: any): Map<string, StatSource[]> {
  const statsMap = new Map<string, StatSource[]>()

  if (!daevanion) return statsMap

  // boardList에서 각 신의 효과 추출
  if (daevanion.boardList && Array.isArray(daevanion.boardList)) {
    daevanion.boardList.forEach((board: any) => {
      const godName = board.name || '알 수 없는 신'

      // openStatEffectList가 있다면 처리
      if (board.openStatEffectList && Array.isArray(board.openStatEffectList)) {
        board.openStatEffectList.forEach((effect: any) => {
          const parsed = parseStatString(effect.desc || '')
          if (parsed && parsed.name) {
            if (!statsMap.has(parsed.name)) {
              statsMap.set(parsed.name, [])
            }
            statsMap.get(parsed.name)!.push({
              name: godName,
              value: parsed.value,
              percentage: parsed.percentage
            })
          }
        })
      }
    })
  }

  return statsMap
}

/**
 * 기본 스탯에서 추출
 */
function extractBaseStats(stats: any): Map<string, number> {
  const statsMap = new Map<string, number>()

  if (!stats || !stats.statList) return statsMap

  stats.statList.forEach((stat: any) => {
    if (stat.name && stat.value !== undefined) {
      statsMap.set(stat.name, typeof stat.value === 'string'
        ? parseInt(stat.value.replace(/,/g, ''), 10)
        : stat.value
      )
    }
  })

  return statsMap
}

/**
 * 모든 스탯 데이터를 집계하여 StatDetail 배열 반환
 */
export function aggregateStats(
  equipment: any[],
  titles: any,
  daevanion: any,
  stats: any
): StatDetail[] {
  // 각 소스에서 스탯 추출
  const equipmentStats = extractEquipmentStats(equipment)
  const titleStats = extractTitleStats(titles)
  const daevanionStats = extractDaevanionStats(daevanion)
  const baseStats = extractBaseStats(stats)

  // 모든 스탯 이름 수집
  const allStatNames = new Set<string>()
  equipmentStats.forEach((_, name) => allStatNames.add(name))
  titleStats.forEach((_, name) => allStatNames.add(name))
  daevanionStats.forEach((_, name) => allStatNames.add(name))
  baseStats.forEach((_, name) => allStatNames.add(name))

  // StatDetail 배열 생성
  const statDetails: StatDetail[] = []

  allStatNames.forEach(statName => {
    const equipSources = equipmentStats.get(statName) || []
    const titleSources = titleStats.get(statName) || []
    const daevanionSources = daevanionStats.get(statName) || []
    const baseValue = baseStats.get(statName) || 0

    // 합계 계산
    const totalValue = baseValue +
      equipSources.reduce((sum, s) => sum + s.value, 0) +
      titleSources.reduce((sum, s) => sum + s.value, 0) +
      daevanionSources.reduce((sum, s) => sum + s.value, 0)

    const totalPercentage =
      equipSources.reduce((sum, s) => sum + (s.percentage || 0), 0) +
      titleSources.reduce((sum, s) => sum + (s.percentage || 0), 0) +
      daevanionSources.reduce((sum, s) => sum + (s.percentage || 0), 0)

    statDetails.push({
      name: statName,
      totalValue,
      totalPercentage,
      sources: {
        equipment: equipSources,
        titles: titleSources,
        daevanion: daevanionSources,
        baseValue
      },
      color: getStatColor(statName, totalValue),
      category: getStatCategory(statName),
      isExpanded: false
    })
  })

  // 총합 값 기준으로 정렬 (높은 순)
  return statDetails.sort((a, b) => b.totalValue - a.totalValue)
}
