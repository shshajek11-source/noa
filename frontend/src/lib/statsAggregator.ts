/**
 * AION 2 능력치 집계 시스템
 * 
 * 작성일: 2025-01-15
 * 파일: frontend/src/lib/statsAggregator.ts
 */

import type { StatDetail, StatSource, StatThresholds, StatCategory } from '../types/stats'
import { getDaevanionStats } from '../data/daevanionStats'

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
 * 합산할 스탯 그룹 정의
 * key: 메인 스탯 이름, value: 합산할 스탯 이름들
 */
const STAT_MERGE_GROUPS: Record<string, string[]> = {
  '공격력': ['추가 공격력'],
  '방어력': ['추가 방어력'],
  '생명력': ['생명력 추가', '추가 생명력'],
}

/**
 * 퍼센트 증가 스탯 매핑
 * key: 기본 스탯, value: 퍼센트 증가 스탯
 * 기본 스탯에 퍼센트 증가를 적용하여 최종값 계산
 */
const PERCENTAGE_INCREASE_MAP: Record<string, string> = {
  '공격력': '공격력 증가',
  '방어력': '방어력 증가',
  '정신력': '정신력 증가',
  '생명력': '생명력 증가',
}

/**
 * 숨길 스탯 목록 (다른 스탯에 합산되어 적용됨)
 */
const HIDDEN_STATS = new Set([
  '공격력 증가',
  '방어력 증가',
  '정신력 증가',
  '생명력 증가',
])

/**
 * 스탯 카테고리 매핑
 */
const STAT_CATEGORY_MAP: Record<string, StatCategory> = {
  // 공격
  '공격력': 'attack',
  '추가 공격력': 'attack',
  '위력': 'attack',
  '강타': 'attack',
  '명중': 'attack',
  '피해 증폭': 'attack',
  '공격력 증가': 'attack',
  // PVE/PVP/보스 공격
  'PVE 공격력': 'attack',
  'PVE 명중': 'attack',
  'PVP 공격력': 'attack',
  'PVP 명중': 'attack',
  '보스 공격력': 'attack',

  // 치명 (공격에 포함)
  '치명타': 'attack',
  '치명타 공격력': 'attack',
  '치명타 피해': 'attack',
  '치명타 피해 증폭': 'attack',
  '치명타 증가': 'attack',
  '완벽': 'attack',
  '다단 히트 적중': 'attack',
  'PVP 치명타': 'attack',

  // 방어
  '방어력': 'defense',
  '추가 방어력': 'defense',
  '방어력 증가': 'defense',
  '생명력': 'defense',
  '체력': 'defense',
  '막기': 'defense',
  '회피': 'defense',
  '철벽': 'defense',
  '치명타 저항': 'defense',
  '치명타 피해 내성': 'defense',
  '완벽 저항': 'defense',
  '강타 저항': 'defense',
  '피해 내성': 'defense',
  '다단 히트 저항': 'defense',
  // PVE/PVP/보스 방어
  'PVE 방어력': 'defense',
  'PVE 회피': 'defense',
  'PVP 방어력': 'defense',
  'PVP 회피': 'defense',
  'PVP 치명타 저항': 'defense',
  '보스 방어력': 'defense',

  // 유틸리티
  '이동 속도': 'utility',
  '재사용 시간': 'utility',
  '재사용 시간 감소': 'utility',

  // 방어로 이동 (생존 관련)
  '재생': 'defense',
  '정신력 증가': 'defense',
  '생명력 증가': 'defense',

  // 정신력 소모량은 공격
  '정신력 소모량': 'attack',

  // 공격으로 이동
  '정신력': 'attack',
  '전투 속도': 'attack',
  '관통': 'attack',
  '철벽 관통': 'attack',
  '재생 관통': 'attack',
  'PVP 피해 증폭': 'attack',
  'PVE 피해 증폭': 'attack',
  '무기 피해 증폭': 'attack',
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
 * 문자열에서 스탯 정보 파싱 (개선된 버전)
 * 예: "공격력 +100" → { name: "공격력", value: 100 }
 *     "치명타 증가 +5%" → { name: "치명타 증가", value: 0, percentage: 5 }
 *     "생명력 1100 (+350)" → { name: "생명력", value: 1450 }
 *     "공격력: 800 (+200) (+5%)" → { name: "공격력", value: 1000, percentage: 5 }
 */
export function parseStatString(statStr: string): { name: string, value: number, percentage: number } | null {
  if (!statStr) return null

  const cleanStatStr = statStr.trim().replace(/\s+/g, ' ')

  // 패턴 0: 복합 형식 - 고정값 + 추가 보너스 + 퍼센트 보너스
  // 예: "공격력: 800 (+200) (+5%)", "생명력 1000 (+200) (+10%)"
  const complexMatch = cleanStatStr.match(/(.+?)\s*[:+\-]?\s*(\d+(?:[.,]\d+)*)\s*\(\s*[+\-]?\s*(\d+(?:[.,]\d+)*)\s*\)\s*\(\s*[+\-]?\s*(\d+(?:[.,]\d+)*)\s*%\s*\)/)
  if (complexMatch) {
    const baseValue = parseFloat(complexMatch[2].replace(/[,.]/g, m => m === ',' ? '' : '.'))
    const bonusValue = parseFloat(complexMatch[3].replace(/[,.]/g, m => m === ',' ? '' : '.'))
    const percentageValue = parseFloat(complexMatch[4].replace(/[,.]/g, ''))

    return {
      name: complexMatch[1].trim(),
      value: baseValue + bonusValue,
      percentage: percentageValue || 0
    }
  }

  // 패턴 1: 고정값 + 추가 보너스 (예: "생명력 1100 (+350)", "공격력 500 (+100)")
  const bonusMatch = cleanStatStr.match(/(.+?)\s*[:+\-]?\s*(\d+(?:[.,]\d+)*)\s*\(\s*[+\-]?\s*(\d+(?:[.,]\d*)*)\s*\)/)
  if (bonusMatch) {
    const baseValue = parseFloat(bonusMatch[2].replace(/[,.]/g, m => m === ',' ? '' : '.'))
    const bonusValue = parseFloat(bonusMatch[3].replace(/[,.]/g, m => m === ',' ? '' : '.'))

    return {
      name: bonusMatch[1].trim(),
      value: baseValue + bonusValue,
      percentage: 0
    }
  }

  // 패턴 2: 퍼센트 (예: "공격력 증가 +5%", "치명타 +10.5%", "명중 +15.2%")
  const percentMatch = cleanStatStr.match(/(.+?)\s*[+\-]?\s*(\d+(?:[.,]\d+)*)\s*%/)
  if (percentMatch) {
    return {
      name: percentMatch[1].trim(),
      value: 0,
      percentage: parseFloat(percentMatch[2].replace(/[,.]/g, m => m === ',' ? '' : '.'))
    }
  }

  // 패턴 3: 감소 형식 (예: "재사용 시간 -10%", "스킬 시전 시간 -0.5초")
  const reductionMatch = cleanStatStr.match(/(.+?)\s*[-−]\s*(\d+(?:[.,]\d+)*)\s*%?/)
  if (reductionMatch) {
    const value = parseFloat(reductionMatch[2].replace(/[,.]/g, m => m === ',' ? '' : '.'))
    return {
      name: reductionMatch[1].trim(),
      value: -value, // 음수로 표시
      percentage: cleanStatStr.includes('%') ? -value : 0
    }
  }

  // 패턴 4: 증감 키워드 포함 형식 (예: "증가 +15%", "감소 -20", "상승 +50")
  const keywordMatch = cleanStatStr.match(/(.+?)\s*(증가|감소|상승|하락)\s*[+\-]?\s*(\d+(?:[.,]\d+)*)\s*%?/)
  if (keywordMatch) {
    const value = parseFloat(keywordMatch[3].replace(/[,.]/g, m => m === ',' ? '' : '.'))
    const keyword = keywordMatch[2]
    const isNegative = keyword === '감소' || keyword === '하락'

    return {
      name: `${keywordMatch[1].trim()} ${keyword}`,
      value: isNegative ? -value : value,
      percentage: cleanStatStr.includes('%') ? (isNegative ? -value : value) : 0
    }
  }

  // 패턴 5: 범위 형식 (예: "공격력 100~200", "치명타 50-100")
  const rangeMatch = cleanStatStr.match(/(.+?)\s*[:+\-]?\s*(\d+(?:[.,]\d+)*)\s*[~\-~]\s*(\d+(?:[.,]\d+)*)/)
  if (rangeMatch) {
    const minValue = parseFloat(rangeMatch[2].replace(/[,.]/g, m => m === ',' ? '' : '.'))
    const maxValue = parseFloat(rangeMatch[3].replace(/[,.]/g, m => m === ',' ? '' : '.'))

    return {
      name: rangeMatch[1].trim(),
      value: Math.floor((minValue + maxValue) / 2), // 평균값 사용
      percentage: 0
    }
  }

  // 패턴 6: 고정값만 (예: "공격력 +100", "방어력: 200", "생명력 1000")
  const valueMatch = cleanStatStr.match(/(.+?)\s*[:+\-]?\s*(\d+(?:[.,]\d+)*)/)
  if (valueMatch) {
    return {
      name: valueMatch[1].trim(),
      value: parseFloat(valueMatch[2].replace(/[,.]/g, m => m === ',' ? '' : '.')),
      percentage: 0
    }
  }

  // 디버그: 파싱 실패한 경우 기록
  if (process.env.NODE_ENV === 'development') {
    console.warn('parseStatString: 파싱 실패', {
      original: statStr,
      cleaned: cleanStatStr
    })
  }

  return null
}

/**
 * 돌파(breakthrough) 보너스 계산
 * - 무기/가더: 공격력 +30, 공격력 증가 +1% (per level)
 * - 방어구: 방어력 +40, 생명력 +40, 방어력 증가 +1% (per level)
 * - 장신구: 공격력 +20, 방어력 +20, 공격력 증가 +1% (per level)
 */
function calculateBreakthroughBonus(item: any): { name: string, value: number, percentage: number }[] {
  // 엄격한 체크: breakthrough가 숫자이고 1 이상이어야 함
  const breakthrough = typeof item.breakthrough === 'number' ? item.breakthrough : parseInt(item.breakthrough) || 0
  if (!breakthrough || breakthrough <= 0) return []

  const slot = (item.slot || '').toLowerCase()
  const category = (item.category || '').toLowerCase()
  const bonuses: { name: string, value: number, percentage: number }[] = []

  // 무기/가더 (MainHand, OffHand with 가더)
  const isWeapon = slot.includes('주무기') || slot.includes('무기') || slot === 'mainhand'
  const isGuard = slot.includes('보조') || slot.includes('가더') || category.includes('가더') || slot === 'offhand'

  // 방어구 (투구, 견갑, 상의, 하의, 장갑, 신발)
  const isArmor = slot.includes('투구') || slot.includes('견갑') || slot.includes('상의') ||
                  slot.includes('하의') || slot.includes('장갑') || slot.includes('신발') ||
                  slot === 'head' || slot === 'shoulder' || slot === 'chest' ||
                  slot === 'pants' || slot === 'gloves' || slot === 'shoes'

  // 장신구 (귀걸이, 목걸이, 반지, 벨트)
  const isAccessory = slot.includes('귀걸이') || slot.includes('목걸이') ||
                      slot.includes('반지') || slot.includes('벨트') ||
                      slot === 'earring' || slot === 'necklace' || slot === 'ring' || slot === 'belt'

  if (isWeapon || isGuard) {
    // 무기/가더: 공격력 +30, 공격력 증가 +1%
    bonuses.push({ name: '공격력', value: 30 * breakthrough, percentage: 0 })
    bonuses.push({ name: '공격력 증가', value: 0, percentage: 1 * breakthrough })
  } else if (isArmor) {
    // 방어구: 방어력 +40, 생명력 +40, 방어력 증가 +1%
    bonuses.push({ name: '방어력', value: 40 * breakthrough, percentage: 0 })
    bonuses.push({ name: '생명력', value: 40 * breakthrough, percentage: 0 })
    bonuses.push({ name: '방어력 증가', value: 0, percentage: 1 * breakthrough })
  } else if (isAccessory) {
    // 장신구: 공격력 +20, 방어력 +20, 공격력 증가 +1%
    bonuses.push({ name: '공격력', value: 20 * breakthrough, percentage: 0 })
    bonuses.push({ name: '방어력', value: 20 * breakthrough, percentage: 0 })
    bonuses.push({ name: '공격력 증가', value: 0, percentage: 1 * breakthrough })
  }

  return bonuses
}

/**
 * 장비에서 스탯 추출 - 같은 아이템의 같은 스탯은 합산
 */
function extractEquipmentStats(equipment: any[]): Map<string, StatSource[]> {
  const statsMap = new Map<string, StatSource[]>()

  equipment.forEach(item => {
    if (!item) return

    const itemName = item.name || item.slot || '알 수 없음'

    // 이 아이템에서 나오는 스탯을 임시로 모음 (같은 스탯명 합산용)
    const itemStatsTemp = new Map<string, { value: number, percentage: number }>()

    // 스탯 추가 헬퍼 함수
    const addToItemStats = (statName: string, value: number, percentage: number) => {
      if (!statName) return
      if (!itemStatsTemp.has(statName)) {
        itemStatsTemp.set(statName, { value: 0, percentage: 0 })
      }
      const current = itemStatsTemp.get(statName)!
      current.value += value
      current.percentage += percentage
    }

    // 1. 마석 (Manastones)
    if (item.manastones && Array.isArray(item.manastones)) {
      item.manastones.forEach((manastone: any) => {
        const parsed = parseStatString(manastone.type || manastone.name || '')
        if (parsed && parsed.name) {
          addToItemStats(parsed.name, parsed.value, parsed.percentage)
        }
      })
    }

    // 2. 돌파(breakthrough) 보너스
    const breakthroughBonuses = calculateBreakthroughBonus(item)
    breakthroughBonuses.forEach(bonus => {
      addToItemStats(bonus.name, bonus.value, bonus.percentage)
    })

    // 3. 장비 기본 옵션
    const detail = item.detail || item.raw?.detail

    if (detail) {
      const rawDetail = detail._raw || detail

      // MainStats (기본 스탯 + 강화 보너스)
      if (rawDetail.mainStats && Array.isArray(rawDetail.mainStats)) {
        rawDetail.mainStats.forEach((stat: any) => {
          const statName = stat.name
          if (!statName) return

          const baseValue = parseFloat(stat.value) || 0
          const extraValue = parseFloat(stat.extra) || 0
          addToItemStats(statName, baseValue + extraValue, 0)
        })
      }

      // SubStats (영혼각인 옵션)
      const hasSubStats = rawDetail.subStats && Array.isArray(rawDetail.subStats) && rawDetail.subStats.length > 0
      if (hasSubStats) {
        rawDetail.subStats.forEach((stat: any) => {
          const statName = stat.name
          const statValue = stat.value || ''
          if (!statName) return

          const isPercent = String(statValue).includes('%')
          const numValue = parseFloat(String(statValue).replace('%', '')) || 0
          addToItemStats(statName, isPercent ? 0 : numValue, isPercent ? numValue : 0)
        })
      }

      // mainStats가 있으면 이미 처리했으므로 options는 건너뜀 (중복 방지)
      const hasMainStats = rawDetail.mainStats && Array.isArray(rawDetail.mainStats) && rawDetail.mainStats.length > 0

      // Options (기본 옵션) - mainStats가 없을 때만 사용 (legacy 지원)
      if (!hasMainStats && detail.options && Array.isArray(detail.options)) {
        detail.options.forEach((stat: any) => {
          const statText = stat.name + (stat.value ? ` ${stat.value}` : '')
          const parsed = parseStatString(statText)
          if (parsed && parsed.name) {
            addToItemStats(parsed.name, parsed.value, parsed.percentage)
          }
        })
      }

      // Random Options (랜덤 옵션) - subStats가 없을 때만 사용 (legacy 지원)
      if (!hasSubStats && detail.randomOptions && Array.isArray(detail.randomOptions)) {
        detail.randomOptions.forEach((stat: any) => {
          const statText = stat.name + (stat.value ? ` ${stat.value}` : '')
          const parsed = parseStatString(statText)
          if (parsed && parsed.name) {
            addToItemStats(parsed.name, parsed.value, parsed.percentage)
          }
        })
      }

      // Manastones from detail (마석) - 이미 위에서 item.manastones 처리했으므로 중복 체크
      if (!item.manastones && detail.manastones && Array.isArray(detail.manastones)) {
        detail.manastones.forEach((stone: any) => {
          const parsed = parseStatString(stone.type || stone.name || '')
          if (parsed && parsed.name) {
            addToItemStats(parsed.name, parsed.value, parsed.percentage)
          }
        })
      }
    }

    // 아이템별로 모은 스탯을 전역 statsMap에 추가 (같은 스탯은 합산된 상태)
    itemStatsTemp.forEach((statData, statName) => {
      if (statData.value > 0 || statData.percentage > 0) {
        if (!statsMap.has(statName)) {
          statsMap.set(statName, [])
        }
        statsMap.get(statName)!.push({
          name: itemName,
          value: statData.value,
          percentage: statData.percentage
        })
      }
    })
  })

  return statsMap
}

/**
 * 타이틀에서 스탯 추출
 */
function extractTitleStats(titles: any, equippedTitleId?: number): Map<string, StatSource[]> {
  const statsMap = new Map<string, StatSource[]>()

  if (!titles || !titles.titleList) return statsMap

  titles.titleList.forEach((title: any) => {
    const titleName = title.name || '알 수 없는 타이틀'
    const isEquipped = equippedTitleId && title.id === equippedTitleId
    const isCategoryTitle = title.equipCategory && ['Attack', 'Defense', 'Etc'].includes(title.equipCategory)

    // statList (보유 시 적용되는 스탯) - 카테고리 타이틀 제외한 모든 타이틀
    // 카테고리 타이틀은 equipStatList만 적용되므로 statList는 무시
    if (!isCategoryTitle && title.statList && Array.isArray(title.statList)) {
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

    // equipStatList (장착 시 적용되는 스탯) - 장착된 타이틀 또는 카테고리 대표 타이틀
    if ((isEquipped || isCategoryTitle) && title.equipStatList && Array.isArray(title.equipStatList)) {
      title.equipStatList.forEach((stat: any) => {
        const parsed = parseStatString(stat.desc || '')
        if (parsed && parsed.name) {
          if (!statsMap.has(parsed.name)) {
            statsMap.set(parsed.name, [])
          }

          // 카테고리 대표 타이틀인 경우 카테고리 표시
          const categoryLabel = isCategoryTitle
            ? title.equipCategory === 'Attack' ? '공격계열'
              : title.equipCategory === 'Defense' ? '방어계열'
                : '기타계열'
            : ''

          const sourceName = isCategoryTitle
            ? `${titleName} (${categoryLabel})`
            : `${titleName} (장착)`

          statsMap.get(parsed.name)!.push({
            name: sourceName,
            value: parsed.value,
            percentage: parsed.percentage,
            description: isCategoryTitle ? '카테고리 대표 타이틀' : '장착 효과'
          })
        }
      })
    }
  })

  return statsMap
}

/**
 * 대바니온에서 스탯 추출
 * 신 스탯 포인트 기반 비율 보너스는 stat.statList에 이미 포함되어 있음
 * 여기서는 활성화된 노드의 고정 수치 보너스를 추가
 */
function extractDaevanionStats(daevanion: any): Map<string, StatSource[]> {
  const statsMap = new Map<string, StatSource[]>()

  if (!daevanion || !daevanion.boardList) return statsMap

  // 이름에 '증가'/'감소'가 없어도 항상 퍼센트인 스탯들
  const ALWAYS_PERCENTAGE_STATS = new Set([
    '전투 속도',
    '이동 속도',
    '피해 증폭',
    '피해 내성',
    '치명타 피해 증폭',
    '치명타 피해 내성',
    '다단 히트 적중',
    '다단 히트 저항'
  ])

  daevanion.boardList.forEach((board: any) => {
    const boardStats = getDaevanionStats(board.id, board.openNodeCount)

    if (!boardStats) return

    // 각 스탯을 statsMap에 추가
    Object.entries(boardStats).forEach(([statName, value]) => {
      if (statName === 'skills' || value === undefined) return

      if (!statsMap.has(statName)) {
        statsMap.set(statName, [])
      }

      // 비율 스탯인지 고정 수치 스탯인지 확인
      const isPercentage = statName.includes('증가') || statName.includes('감소') || ALWAYS_PERCENTAGE_STATS.has(statName)

      statsMap.get(statName)!.push({
        name: `${board.name} (대바니온)`,
        value: isPercentage ? 0 : (value as number),
        percentage: isPercentage ? (value as number) : 0,
        description: `활성화 노드: ${board.openNodeCount}/${board.totalNodeCount}`
      })
    })
  })

  return statsMap
}

/**
 * 기본 스탯에서 2차 파생 능력치 추출 (statSecondList)
 */
function extractBaseStats(stats: any): Map<string, StatSource[]> {
  const statsMap = new Map<string, StatSource[]>()

  if (!stats || !stats.statList) {
    return statsMap
  }

  // 항상 퍼센트로 처리해야 하는 스탯들
  const ALWAYS_PERCENTAGE_STATS = new Set([
    '전투 속도',
    '이동 속도',
    '피해 증폭',
    '피해 내성',
    '치명타 피해 증폭',
    '치명타 피해 내성',
    '다단 히트 적중',
    '다단 히트 저항',
    '재사용 시간',
    '재사용 시간 감소'
  ])

  stats.statList.forEach((stat: any) => {
    const baseName = stat.name || '알 수 없음' // 위력, 민첩 등

    // statSecondList에서 2차 파생 능력치 추출
    if (stat.statSecondList && Array.isArray(stat.statSecondList)) {
      stat.statSecondList.forEach((secondStat: string) => {
        const parsed = parseStatString(secondStat)

        if (parsed && parsed.name) {
          if (!statsMap.has(parsed.name)) {
            statsMap.set(parsed.name, [])
          }

          // 항상 퍼센트인 스탯은 value를 percentage로 이동
          const isAlwaysPercent = ALWAYS_PERCENTAGE_STATS.has(parsed.name)
          const finalValue = isAlwaysPercent ? 0 : parsed.value
          const finalPercentage = isAlwaysPercent ? (parsed.value || parsed.percentage) : parsed.percentage

          statsMap.get(parsed.name)!.push({
            name: `${baseName} (${stat.value})`,
            value: finalValue,
            percentage: finalPercentage,
            description: '기본 스탯'
          })
        }
      })
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
  stats: any,
  equippedTitleId?: number
): StatDetail[] {
  // 각 소스에서 2차 파생 능력치 추출
  const equipmentStats = extractEquipmentStats(equipment)
  const titleStats = extractTitleStats(titles, equippedTitleId)
  const daevanionStats = extractDaevanionStats(daevanion)
  const baseStats = extractBaseStats(stats) // 이제 StatSource[] 반환

  // 모든 스탯 이름 수집
  const allStatNames = new Set<string>()
  equipmentStats.forEach((_, name) => allStatNames.add(name))
  titleStats.forEach((_, name) => allStatNames.add(name))
  daevanionStats.forEach((_, name) => allStatNames.add(name))
  baseStats.forEach((_, name) => allStatNames.add(name))

  // 스탯 합산을 위한 역 매핑 (서브 스탯 → 메인 스탯)
  const subStatToMain: Record<string, string> = {}
  Object.entries(STAT_MERGE_GROUPS).forEach(([main, subs]) => {
    subs.forEach(sub => {
      subStatToMain[sub] = main
    })
  })

  // 서브 스탯이 있으면 메인 스탯도 추가 (메인이 없어도 표시되도록)
  allStatNames.forEach(statName => {
    if (subStatToMain[statName]) {
      allStatNames.add(subStatToMain[statName])
    }
  })

  // 이미 처리한 스탯 추적 (서브 스탯은 메인에 합산되므로 별도 표시 안 함)
  const processedStats = new Set<string>()

  // StatDetail 배열 생성
  const statDetails: StatDetail[] = []

  // 먼저 퍼센트 증가 스탯의 총 퍼센트를 미리 계산
  const percentageIncreaseValues: Record<string, number> = {}
  Object.values(PERCENTAGE_INCREASE_MAP).forEach(increaseStatName => {
    const equipInc = (equipmentStats.get(increaseStatName) || []).reduce((sum, s) => sum + (s.percentage || 0), 0)
    const titleInc = (titleStats.get(increaseStatName) || []).reduce((sum, s) => sum + (s.percentage || 0), 0)
    const daevanionInc = (daevanionStats.get(increaseStatName) || []).reduce((sum, s) => sum + (s.percentage || 0), 0)
    const baseInc = (baseStats.get(increaseStatName) || []).reduce((sum, s) => sum + (s.percentage || 0), 0)
    percentageIncreaseValues[increaseStatName] = equipInc + titleInc + daevanionInc + baseInc
  })

  allStatNames.forEach(statName => {
    // 서브 스탯은 메인 스탯에서 처리하므로 건너뛰기 (별도 표시 안 함)
    if (subStatToMain[statName]) {
      return
    }

    // 숨김 스탯은 건너뛰기 (기본 스탯에 합산됨)
    if (HIDDEN_STATS.has(statName)) {
      return
    }

    // 이미 처리된 스탯 건너뛰기
    if (processedStats.has(statName)) {
      return
    }

    processedStats.add(statName)

    // 메인 스탯의 소스 수집
    let equipSources = [...(equipmentStats.get(statName) || [])]
    let titleSources = [...(titleStats.get(statName) || [])]
    let daevanionSources = [...(daevanionStats.get(statName) || [])]
    let baseSources = [...(baseStats.get(statName) || [])]

    // 서브 스탯들 합산 (예: 추가 공격력 → 공격력에 합산)
    const subStats = STAT_MERGE_GROUPS[statName] || []
    subStats.forEach(subStatName => {
      // 서브 스탯의 소스들을 메인에 합산
      const subEquip = equipmentStats.get(subStatName) || []
      const subTitle = titleStats.get(subStatName) || []
      const subDaevanion = daevanionStats.get(subStatName) || []
      const subBase = baseStats.get(subStatName) || []

      // 서브 스탯 소스의 이름에 원래 스탯명 표시
      subEquip.forEach(s => equipSources.push({ ...s, name: `${s.name} [${subStatName}]` }))
      subTitle.forEach(s => titleSources.push({ ...s, name: `${s.name} [${subStatName}]` }))
      subDaevanion.forEach(s => daevanionSources.push({ ...s, name: `${s.name} [${subStatName}]` }))
      subBase.forEach(s => baseSources.push({ ...s, name: `${s.name} [${subStatName}]` }))

      processedStats.add(subStatName)
    })

    // 기본 합계 계산
    let totalValue =
      equipSources.reduce((sum, s) => sum + s.value, 0) +
      titleSources.reduce((sum, s) => sum + s.value, 0) +
      daevanionSources.reduce((sum, s) => sum + s.value, 0) +
      baseSources.reduce((sum, s) => sum + s.value, 0)

    let totalPercentage =
      equipSources.reduce((sum, s) => sum + (s.percentage || 0), 0) +
      titleSources.reduce((sum, s) => sum + (s.percentage || 0), 0) +
      daevanionSources.reduce((sum, s) => sum + (s.percentage || 0), 0) +
      baseSources.reduce((sum, s) => sum + (s.percentage || 0), 0)

    // 퍼센트 증가 스탯 적용 (공격력, 방어력, 정신력)
    const increaseStatName = PERCENTAGE_INCREASE_MAP[statName]
    let appliedIncreasePercent = 0
    let increaseValue = 0

    if (increaseStatName && percentageIncreaseValues[increaseStatName]) {
      appliedIncreasePercent = percentageIncreaseValues[increaseStatName]
      increaseValue = Math.floor(totalValue * (appliedIncreasePercent / 100))
      totalValue += increaseValue

      // 툴팁에 증가 퍼센트 정보 추가
      if (appliedIncreasePercent > 0) {
        baseSources.push({
          name: `${increaseStatName} (+${appliedIncreasePercent.toFixed(1)}%)`,
          value: increaseValue,
          percentage: 0,
          description: `기본값의 ${appliedIncreasePercent.toFixed(1)}% 증가`
        })
      }
    }

    statDetails.push({
      name: statName,
      totalValue,
      totalPercentage,
      sources: {
        equipment: equipSources,
        titles: titleSources,
        daevanion: daevanionSources,
        baseValue: 0,
        baseStats: baseSources // 기본 스탯에서 파생된 2차 능력치 + 증가 퍼센트
      },
      color: getStatColor(statName, totalValue + totalPercentage),
      category: getStatCategory(statName),
      isExpanded: false
    })
  })

  // 총합 값 기준으로 정렬 (높은 순)
  return statDetails.sort((a, b) => {
    const aTotal = a.totalValue + a.totalPercentage
    const bTotal = b.totalValue + b.totalPercentage
    return bTotal - aTotal
  })
}