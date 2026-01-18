/**
 * 장비 슬롯 위치 상수
 *
 * AION2 게임 데이터의 슬롯 위치(slotPos) 기준 분류
 * 돌파(breakthrough) 보너스 계산 시 사용:
 * - 무기: 공격력 증가 %
 * - 방어구: 방어력 증가 %
 * - 장신구: 공격력 증가 %
 *
 * 이 파일은 슬롯 분류의 "단일 진실 소스(Single Source of Truth)"입니다.
 */

/**
 * 무기 슬롯 위치
 * - 1: 주무기
 * - 2: 보조무기
 */
export const WEAPON_SLOT_POSITIONS = [1, 2] as const

/**
 * 방어구 슬롯 위치
 * - 3: 투구
 * - 4: 견갑
 * - 5: 흉갑
 * - 6: 각반
 * - 7: 장갑
 * - 8: 장화
 * - 17: 허리띠
 * - 19: 망토
 */
export const ARMOR_SLOT_POSITIONS = [3, 4, 5, 6, 7, 8, 17, 19] as const

/**
 * 장신구 슬롯 위치
 * - 9: (기타 장신구)
 * - 10: 목걸이
 * - 11: 귀걸이1
 * - 12: 귀걸이2
 * - 13: 반지1
 * - 14: 반지2
 * - 15: 팔찌2 (해방자)
 * - 16: 팔찌1 (각성)
 * - 22: 아뮬렛
 * - 23: 룬1
 * - 24: 룬2
 */
export const ACCESSORY_SLOT_POSITIONS = [9, 10, 11, 12, 13, 14, 15, 16, 22, 23, 24] as const

/**
 * 아르카나 슬롯 위치
 * - 41~45: 아르카나 슬롯
 */
export const ARCANA_SLOT_POSITIONS = [41, 42, 43, 44, 45] as const

/**
 * 펫/날개 슬롯 위치
 * - 51: 펫
 * - 52: 날개
 */
export const PET_WING_SLOT_POSITIONS = [51, 52] as const

// ============================================
// 슬롯 분류 헬퍼 함수
// ============================================

/**
 * slotPos로 무기인지 판별
 */
export function isWeaponSlot(slotPos: number): boolean {
  return WEAPON_SLOT_POSITIONS.includes(slotPos as typeof WEAPON_SLOT_POSITIONS[number])
}

/**
 * slotPos로 방어구인지 판별
 */
export function isArmorSlot(slotPos: number): boolean {
  return ARMOR_SLOT_POSITIONS.includes(slotPos as typeof ARMOR_SLOT_POSITIONS[number])
}

/**
 * slotPos로 장신구인지 판별
 */
export function isAccessorySlot(slotPos: number): boolean {
  return ACCESSORY_SLOT_POSITIONS.includes(slotPos as typeof ACCESSORY_SLOT_POSITIONS[number])
}

/**
 * slotPos로 아르카나인지 판별
 */
export function isArcanaSlot(slotPos: number): boolean {
  return ARCANA_SLOT_POSITIONS.includes(slotPos as typeof ARCANA_SLOT_POSITIONS[number])
}

/**
 * slotPos로 펫/날개인지 판별
 */
export function isPetWingSlot(slotPos: number): boolean {
  return PET_WING_SLOT_POSITIONS.includes(slotPos as typeof PET_WING_SLOT_POSITIONS[number])
}

/**
 * 장비 카테고리 타입
 */
export type EquipmentCategory = 'weapon' | 'armor' | 'accessory' | 'arcana' | 'petWing' | 'unknown'

/**
 * slotPos로 장비 카테고리 판별
 */
export function getEquipmentCategory(slotPos: number): EquipmentCategory {
  if (isWeaponSlot(slotPos)) return 'weapon'
  if (isArmorSlot(slotPos)) return 'armor'
  if (isAccessorySlot(slotPos)) return 'accessory'
  if (isArcanaSlot(slotPos)) return 'arcana'
  if (isPetWingSlot(slotPos)) return 'petWing'
  return 'unknown'
}

// ============================================
// 슬롯 이름 매핑
// ============================================

/**
 * slotPos -> 한국어 슬롯 이름 매핑
 */
export const SLOT_POS_TO_NAME: Record<number, string> = {
  1: '주무기',
  2: '보조무기',
  3: '투구',
  4: '견갑',
  5: '흉갑',
  6: '각반',
  7: '장갑',
  8: '장화',
  9: '목걸이',  // 또는 기타 장신구
  10: '목걸이',
  11: '귀걸이1',
  12: '귀걸이2',
  13: '반지1',
  14: '반지2',
  15: '팔찌2',
  16: '팔찌1',
  17: '허리띠',
  19: '망토',
  22: '아뮬렛',
  23: '룬1',
  24: '룬2',
  51: '펫',
  52: '날개'
}
