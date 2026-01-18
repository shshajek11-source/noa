/**
 * AION 2 능력치 집계 시스템
 * 
 * 작성일: 2025-01-15
 * 파일: frontend/src/lib/statsAggregator.ts
 */

import type { StatDetail, StatSource, StatThresholds, StatCategory, PercentageSource, StatPageCategory } from '../types/stats'
import { getDaevanionStats, getDaevanionStatsByName } from '../data/daevanionStats'
import {
  WEAPON_SLOT_POSITIONS,
  ARMOR_SLOT_POSITIONS,
  ACCESSORY_SLOT_POSITIONS,
  isWeaponSlot,
  isArmorSlot,
  isAccessorySlot
} from '../app/constants/slots'

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
 * 이름에 '증가'/'감소'가 없어도 항상 퍼센트인 스탯들
 * 장비, 대바니온, 기본 스탯 등 모든 소스에서 공통으로 사용
 */
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
 * 페이지별 스탯 분류 매핑 (이미지 순서 기준)
 */
const STAT_PAGE_CATEGORY_MAP: Record<string, StatPageCategory> = {
  // 1번 이미지: 기본 능력치 (basic)
  '공격력': 'basic',
  '방어력': 'basic',
  '명중': 'basic',
  '회피': 'basic',
  '치명타': 'basic',
  '치명타 저항': 'basic',
  '생명력': 'basic',
  '정신력': 'basic',
  '전투 속도': 'basic',
  '이동 속도': 'basic',

  // 주요스탯 (basic 페이지에 포함, 기본 능력치 뒤에 표시)
  '위력': 'basic',
  '민첩': 'basic',
  '지식': 'basic',
  '정확': 'basic',
  '의지': 'basic',
  '체력': 'basic',

  // 2번 이미지 상단: 전투 스탯 (combat)
  '관통': 'combat',
  '봉혼석 추가 피해': 'combat',
  '치명타 공격력': 'combat',
  '치명타 방어력': 'combat',
  '후방 공격력': 'combat',
  '후방 방어력': 'combat',
  '피해 증폭': 'combat',
  '피해 내성': 'combat',
  '무기 피해 증폭': 'combat',
  '무기 피해 내성': 'combat',
  '치명타 피해 증폭': 'combat',
  '치명타 피해 내성': 'combat',
  '후방 피해 증폭': 'combat',
  '후방 피해 내성': 'combat',

  // 2번 이미지 하단: 판정 스탯 (judgment)
  '다단 히트 적중': 'judgment',
  '다단 히트 저항': 'judgment',
  '후방 치명타': 'judgment',
  '후방 치명타 저항': 'judgment',
  '막기 관통': 'judgment',
  '막기': 'judgment',
  '철벽 관통': 'judgment',
  '철벽': 'judgment',
  '재생 관통': 'judgment',
  '재생': 'judgment',
  '완벽': 'judgment',
  '완벽 저항': 'judgment',
  '강타': 'judgment',
  '강타 저항': 'judgment',

  // 3번 이미지: PVP/PVE 스탯 (pvpPve)
  'PVP 공격력': 'pvpPve',
  'PVP 방어력': 'pvpPve',
  'PVP 피해 증폭': 'pvpPve',
  'PVP 피해 내성': 'pvpPve',
  'PVP 명중': 'pvpPve',
  'PVP 회피': 'pvpPve',
  'PVP 치명타': 'pvpPve',
  'PVP 치명타 저항': 'pvpPve',
  'PVE 공격력': 'pvpPve',
  'PVE 방어력': 'pvpPve',
  'PVE 명중': 'pvpPve',
  'PVE 회피': 'pvpPve',
  'PVE 피해 증폭': 'pvpPve',
  'PVE 피해 내성': 'pvpPve',
  '보스 공격력': 'pvpPve',
  '보스 방어력': 'pvpPve',
  '보스 피해 증폭': 'pvpPve',
  '보스 피해 내성': 'pvpPve',

  // 4번 이미지: 특수/자원 스탯 (special)
  '질주 속도': 'special',
  '비행 속도': 'special',
  '탑승물 지상 이동 속도': 'special',
  '탑승물 질주 행동력 소모': 'special',
  '치유 증폭': 'special',
  '받는 치유량': 'special',
  '재사용 시간': 'special',
  '적대치 획득량': 'special',
  '행동력': 'special',
  '비행력': 'special',
  '전투 생명력 자연 회복': 'special',
  '비전투 생명력 자연 회복': 'special',
  '생명력 물약 회복': 'special',
  '생명력 물약 회복 증가': 'special',
  '전투 정신력 자연 회복': 'special',
  '비전투 정신력 자연 회복': 'special',
  '정신력 소모량': 'special',
  '정신력 획득 증가': 'special',
  '전투 행동력 자연 회복': 'special',
  '비전투 행동력 자연 회복': 'special',
  '전투 비행력 자연 회복': 'special',
  '비전투 비행력 자연 회복': 'special',
}

/**
 * 스탯 이름에서 페이지 카테고리 반환
 */
export function getStatPageCategory(statName: string): StatPageCategory {
  return STAT_PAGE_CATEGORY_MAP[statName] || 'special'
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
  // 엄격한 체크: breakthrough 또는 exceedLevel이 숫자이고 1 이상이어야 함
  // 클라이언트에서는 breakthrough, 서버에서는 exceedLevel 사용
  const rawBreakthrough = item.breakthrough ?? item.exceedLevel ?? 0
  const breakthrough = typeof rawBreakthrough === 'number' ? rawBreakthrough : parseInt(rawBreakthrough) || 0
  if (!breakthrough || breakthrough <= 0) return []

  // 클라이언트: slot, category / 서버: slotPosName, categoryName
  const slot = (item.slot || item.slotPosName || '').toLowerCase()
  const category = (item.category || item.categoryName || '').toLowerCase()
  const slotPos = item.slotPos || item.raw?.slotPos || 0
  const bonuses: { name: string, value: number, percentage: number }[] = []

  // slotPos 기반 분류 (가장 신뢰할 수 있는 방법)
  // 상수 정의: constants/slots.ts 참조
  const isWeaponByPos = isWeaponSlot(slotPos)
  const isArmorByPos = isArmorSlot(slotPos)
  const isAccessoryByPos = isAccessorySlot(slotPos)

  // 무기/가더 (MainHand, OffHand with 가더)
  // 서버 API는 영어(main, mainhand), 클라이언트는 한국어(주무기)
  const isWeapon = isWeaponByPos ||
    slot.includes('주무기') || slot.includes('무기') ||
    slot === 'mainhand' || slot === 'main' || slot.includes('mainhand') ||
    slot.includes('보조') || slot.includes('가더') || category.includes('가더') ||
    slot === 'offhand' || slot === 'sub' || slot.includes('offhand')
  // isGuard is now merged into isWeapon since they have the same bonus
  const isGuard = false

  // 방어구 (투구, 견갑, 상의, 하의, 장갑, 신발)
  // 서버 API 영어 이름: head, shoulder, torso/chest, legs/pants, gloves/hand, shoes/foot
  const isArmor = isArmorByPos ||
    slot.includes('투구') || slot.includes('견갑') || slot.includes('상의') ||
    slot.includes('하의') || slot.includes('장갑') || slot.includes('신발') ||
    slot.includes('흉갑') || slot.includes('각반') || slot.includes('장화') ||
    slot.includes('망토') || slot.includes('허리') ||
    slot === 'head' || slot === 'shoulder' || slot === 'chest' || slot === 'torso' ||
    slot === 'pants' || slot === 'legs' || slot === 'leg' ||
    slot === 'gloves' || slot === 'glove' || slot === 'hand' ||
    slot === 'shoes' || slot === 'foot' || slot === 'feet' || slot === 'boots' ||
    slot === 'cape' || slot === 'waist' || slot === 'belt' ||
    slot.includes('helmet') || slot.includes('pauldron') || slot.includes('greaves')

  // 장신구 (귀걸이, 목걸이, 반지, 팔찌, 룬, 아뮬렛)
  // 서버 API 영어 이름: earring, necklace, ring, bracelet, rune, amulet
  const isAccessory = isAccessoryByPos ||
    slot.includes('귀걸이') || slot.includes('목걸이') ||
    slot.includes('반지') || slot.includes('팔찌') ||
    slot.includes('룬') || slot.includes('아뮬렛') ||
    slot === 'earring' || slot.includes('earring') ||
    slot === 'necklace' || slot.includes('necklace') ||
    slot === 'ring' || slot.includes('ring') ||
    slot === 'bracelet' || slot.includes('bracelet') ||
    slot === 'rune' || slot.includes('rune') ||
    slot === 'amulet' || slot.includes('amulet')

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

    // 클라이언트: name, slot / 서버: name, slotPosName
    const itemName = item.name || item.slot || item.slotPosName || '알 수 없음'

    // 이 아이템에서 나오는 스탯을 임시로 모음 (같은 스탯명 합산용)
    const itemStatsTemp = new Map<string, { value: number, percentage: number }>()

    // 스탯 추가 헬퍼 함수 (항상 퍼센트인 스탯 자동 변환)
    const addToItemStats = (statName: string, value: number, percentage: number) => {
      if (!statName) return

      // 항상 퍼센트로 처리해야 하는 스탯인 경우 value를 percentage로 변환
      const isAlwaysPercent = ALWAYS_PERCENTAGE_STATS.has(statName)
      const finalValue = isAlwaysPercent ? 0 : value
      const finalPercentage = isAlwaysPercent ? (value + percentage) : percentage

      if (!itemStatsTemp.has(statName)) {
        itemStatsTemp.set(statName, { value: 0, percentage: 0 })
      }
      const current = itemStatsTemp.get(statName)!
      current.value += finalValue
      current.percentage += finalPercentage
    }

    // 1. 마석 (Manastones) - { type: "공격력", value: 80 } 또는 { type: "공격력", value: "+80" } 형식
    // 클라이언트: manastones / 서버: manastoneList
    const manastones = item.manastones || item.manastoneList || []
    if (manastones && Array.isArray(manastones)) {
      manastones.forEach((manastone: any) => {
        const statName = manastone.type || manastone.name || ''
        const rawValue = manastone.value || manastone.point || 0

        // "+80" 형식의 문자열도 파싱
        const statValue = typeof rawValue === 'string'
          ? parseFloat(rawValue.replace(/[+%]/g, '')) || 0
          : rawValue

        if (statName && statValue > 0) {
          addToItemStats(statName, statValue, 0)
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

      // 마석 데이터 처리 - item.manastones가 없을 때만 detail에서 가져옴 (중복 방지)
      const hasItemManastones = item.manastones && item.manastones.length > 0

      // Manastones from detail.manastones
      if (!hasItemManastones && detail.manastones && Array.isArray(detail.manastones)) {
        detail.manastones.forEach((stone: any) => {
          const statName = stone.type || stone.name || ''
          const rawValue = stone.value || 0

          // "+80" 형식의 문자열도 파싱
          const statValue = typeof rawValue === 'string'
            ? parseFloat(rawValue.replace(/[+%]/g, '')) || 0
            : rawValue

          if (statName && statValue > 0) {
            addToItemStats(statName, statValue, 0)
          }
        })
      }

      // magicStoneStat from _raw - item.manastones와 detail.manastones 둘 다 없을 때만
      if (!hasItemManastones && (!detail.manastones || detail.manastones.length === 0)) {
        if (rawDetail.magicStoneStat && Array.isArray(rawDetail.magicStoneStat)) {
          rawDetail.magicStoneStat.forEach((stone: any) => {
            const statName = stone.name
            const statValue = stone.value || ''
            if (!statName) return

            // "+80" 형식에서 숫자 추출
            const isPercent = String(statValue).includes('%')
            const numValue = parseFloat(String(statValue).replace(/[+%]/g, '')) || 0

            if (numValue > 0) {
              addToItemStats(statName, isPercent ? 0 : numValue, isPercent ? numValue : 0)
            }
          })
        }
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

  daevanion.boardList.forEach((board: any) => {
    // board.id 또는 board.name으로 스탯 가져오기
    let boardStats = getDaevanionStats(board.id, board.openNodeCount)

    // board.id로 못 찾으면 board.name으로 찾기
    if (!boardStats && board.name) {
      boardStats = getDaevanionStatsByName(board.name, board.openNodeCount, board.totalNodeCount)
    }

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

  stats.statList.forEach((stat: any) => {
    const baseName = stat.name || '알 수 없음'
    const baseValueStr = String(stat.value || '')

    // 1. 메인 스탯값 자체도 수집 (예: "명중", "공격력" 등이 statList의 최상위에 있을 경우)
    const parsedMain = parseStatString(`${baseName} ${baseValueStr}`)
    if (parsedMain && parsedMain.name && parsedMain.name !== '알 수 없음') {
      if (!statsMap.has(parsedMain.name)) {
        statsMap.set(parsedMain.name, [])
      }
      // 항상 퍼센트인 스탯 처리
      const isAlwaysPercent = ALWAYS_PERCENTAGE_STATS.has(parsedMain.name)
      const finalValue = isAlwaysPercent ? 0 : parsedMain.value
      const finalPercentage = isAlwaysPercent ? (parsedMain.value || parsedMain.percentage) : parsedMain.percentage

      statsMap.get(parsedMain.name)!.push({
        name: baseName,
        value: finalValue,
        percentage: finalPercentage,
        description: '기본 스탯 (메인)'
      })
    }

    // 2. statSecondList에서 2차 파생 능력치 추출
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
            description: '기본 스탯 (파생)'
          })
        }
      })
    }
  })

  return statsMap
}

/**
 * OCR 스탯 타입
 */
interface OcrStat {
  name: string
  value: string
  isPercentage?: boolean
}

/**
 * 모든 스탯 데이터를 집계하여 StatDetail 배열 반환
 * @param ocrStats - OCR로 추출한 스탯 (있으면 해당 스탯값을 오버라이드)
 */
export function aggregateStats(
  equipment: any[],
  titles: any,
  daevanion: any,
  stats: any,
  equippedTitleId?: number,
  ocrStats?: OcrStat[]
): StatDetail[] {
  // 각 소스에서 2차 파생 능력치 추출
  const equipmentStats = extractEquipmentStats(equipment)
  const titleStats = extractTitleStats(titles, equippedTitleId)
  const daevanionStats = extractDaevanionStats(daevanion)
  const baseStats = extractBaseStats(stats)

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

  // 먼저 퍼센트 증가 스탯의 총 퍼센트를 미리 계산 + 개별 출처 추적
  const percentageIncreaseValues: Record<string, number> = {}
  const percentageSourcesMap: Record<string, PercentageSource[]> = {}

  Object.entries(PERCENTAGE_INCREASE_MAP).forEach(([baseStat, increaseStatName]) => {
    const sources: PercentageSource[] = []

    // 장비에서 오는 % 증가
    const equipSources = equipmentStats.get(increaseStatName) || []
    equipSources.forEach(s => {
      if (s.percentage && s.percentage > 0) {
        sources.push({
          sourceName: s.name,
          sourceValue: s.value,
          statName: increaseStatName,
          percentage: s.percentage
        })
      }
    })

    // 타이틀에서 오는 % 증가
    const titleSources = titleStats.get(increaseStatName) || []
    titleSources.forEach(s => {
      if (s.percentage && s.percentage > 0) {
        sources.push({
          sourceName: s.name,
          sourceValue: s.value,
          statName: increaseStatName,
          percentage: s.percentage
        })
      }
    })

    // 대바니온에서 오는 % 증가
    const daevanionSources = daevanionStats.get(increaseStatName) || []
    daevanionSources.forEach(s => {
      if (s.percentage && s.percentage > 0) {
        sources.push({
          sourceName: s.name,
          sourceValue: s.value,
          statName: increaseStatName,
          percentage: s.percentage
        })
      }
    })

    // 기본 스탯에서 오는 % 증가 (위력, 파괴[지켈] 등)
    const baseSourcesForPercent = baseStats.get(increaseStatName) || []

    baseSourcesForPercent.forEach(s => {
      if (s.percentage && s.percentage > 0) {
        sources.push({
          sourceName: s.name,
          sourceValue: s.value,
          statName: increaseStatName,
          percentage: s.percentage
        })
      }
    })

    const totalPercent = sources.reduce((sum, s) => sum + s.percentage, 0)
    percentageIncreaseValues[increaseStatName] = totalPercent
    percentageSourcesMap[baseStat] = sources
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

    // percentageIncreaseValues[increaseStatName]이 0일 수 있으므로 !== undefined 체크
    if (increaseStatName && percentageIncreaseValues[increaseStatName] !== undefined && percentageIncreaseValues[increaseStatName] > 0) {
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
        baseStats: baseSources, // 기본 스탯에서 파생된 2차 능력치 + 증가 퍼센트
        percentageSources: percentageSourcesMap[statName] || [] // % 증가 출처 상세
      },
      color: getStatColor(statName, totalValue + totalPercentage),
      category: getStatCategory(statName),
      isExpanded: false
    })
  })

  // OCR 스탯으로 오버라이드 (있는 경우)
  if (ocrStats && ocrStats.length > 0) {
    const ocrMap = new Map<string, { value: number, isPercentage: boolean }>()
    ocrStats.forEach(ocr => {
      // OCR 값에서 숫자 추출 (예: "2438" → 2438, "38.4%" → 38.4)
      const cleanValue = ocr.value.replace(/[,%]/g, '')
      const numValue = parseFloat(cleanValue) || 0
      ocrMap.set(ocr.name, { value: numValue, isPercentage: ocr.isPercentage || false })
    })

    // 기존 스탯에서 OCR 값으로 오버라이드
    statDetails.forEach(stat => {
      const ocrData = ocrMap.get(stat.name)
      if (ocrData) {
        // 기존 소스들의 합계 계산 (고정값)
        const equipTotal = stat.sources.equipment?.reduce((sum, s) => sum + (s.value || 0), 0) || 0
        const titleTotal = stat.sources.titles?.reduce((sum, s) => sum + (s.value || 0), 0) || 0
        const daevanionTotal = stat.sources.daevanion?.reduce((sum, s) => sum + (s.value || 0), 0) || 0
        const baseTotal = stat.sources.baseStats?.reduce((sum, s) => sum + (s.value || 0), 0) || 0

        if (ocrData.isPercentage) {
          // 퍼센트 스탯의 경우
          const equipPctTotal = stat.sources.equipment?.reduce((sum, s) => sum + (s.percentage || 0), 0) || 0
          const titlePctTotal = stat.sources.titles?.reduce((sum, s) => sum + (s.percentage || 0), 0) || 0
          const daevanionPctTotal = stat.sources.daevanion?.reduce((sum, s) => sum + (s.percentage || 0), 0) || 0
          const basePctTotal = stat.sources.baseStats?.reduce((sum, s) => sum + (s.percentage || 0), 0) || 0

          const calculatedPctTotal = equipPctTotal + titlePctTotal + daevanionPctTotal + basePctTotal
          const difference = ocrData.value - calculatedPctTotal

          // 차이가 있으면 "기타 스탯" 소스 추가
          if (Math.abs(difference) >= 0.1) {
            stat.sources.petWork = [{
              name: '기타 스탯',
              value: 0,
              percentage: Math.round(difference * 10) / 10,
              description: 'OCR 총합과 계산값의 차이 (펫/외형 등)'
            }]
          }

          stat.totalPercentage = ocrData.value
          stat.totalValue = 0
        } else {
          // 고정값 스탯의 경우
          const calculatedTotal = equipTotal + titleTotal + daevanionTotal + baseTotal
          const difference = ocrData.value - calculatedTotal

          // 차이가 있으면 "기타 스탯" 소스 추가
          if (Math.abs(difference) >= 1) {
            stat.sources.petWork = [{
              name: '기타 스탯',
              value: Math.round(difference),
              percentage: 0,
              description: 'OCR 총합과 계산값의 차이 (펫/외형 등)'
            }]
          }

          stat.totalValue = ocrData.value
        }

        ; (stat as any).isOcrOverride = true
        // 색상 다시 계산
        stat.color = getStatColor(stat.name, stat.totalValue + stat.totalPercentage)
      }
    })

    // OCR에만 있고 기존 스탯에 없는 경우 추가
    ocrMap.forEach((ocrData, statName) => {
      const exists = statDetails.some(s => s.name === statName)
      if (!exists) {
        statDetails.push({
          name: statName,
          totalValue: ocrData.isPercentage ? 0 : ocrData.value,
          totalPercentage: ocrData.isPercentage ? ocrData.value : 0,
          sources: {
            equipment: [],
            titles: [],
            daevanion: [],
            baseValue: 0,
            baseStats: [{
              name: 'OCR 추출값',
              value: ocrData.isPercentage ? 0 : ocrData.value,
              percentage: ocrData.isPercentage ? ocrData.value : 0,
              description: 'OCR로 추출된 값'
            }],
            percentageSources: []
          },
          color: getStatColor(statName, ocrData.value),
          category: getStatCategory(statName),
          isExpanded: false,
          isOcrOverride: true
        } as StatDetail & { isOcrOverride: boolean })
      }
    })
  }

  // 총합 값 기준으로 정렬 (높은 순)
  return statDetails.sort((a, b) => {
    const aTotal = a.totalValue + a.totalPercentage
    const bTotal = b.totalValue + b.totalPercentage
    return bTotal - aTotal
  })
}