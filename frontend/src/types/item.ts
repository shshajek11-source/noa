// 아이템 검색 결과
export interface ItemSearchResult {
    itemId: string
    name: string
    categoryName: string
    grade: ItemGrade | string
    itemLevel: number
    icon: string
    slotPos: number
    slotName?: string
    classRestriction?: string[]

    // 기본 스탯
    attack?: number
    magicAttack?: number
    defense?: number
    magicDefense?: number
    hp?: number

    // 세트 정보
    setName?: string

    // 획득처
    source?: string
}

// 아이템 상세 정보
export interface ItemDetail extends ItemSearchResult {
    options: ItemOption[]
    randomOptions?: ItemOption[]
    setEffects?: SetEffect[]
    manastoneSlots?: number
    godstoneSlot?: boolean
}

export interface ItemOption {
    name: string
    value: string | number
    isRandom?: boolean
}

export interface SetEffect {
    setName: string
    pieces: number
    bonuses: SetBonus[]
    items: SetItem[]
}

export interface SetBonus {
    degree: number          // 2세트, 3세트 등
    descriptions: string[]
}

export interface SetItem {
    itemId: string
    name: string
    equipped: boolean
}

// 아이템 사용 통계
export interface ItemUsageStat {
    itemId: string
    itemName: string
    slotPos: number
    slotName: string
    grade: string
    icon: string
    usageCount: number
    usagePercent: number
    avgEnhanceLevel: number
    avgBreakthrough: number
}

// 슬롯별 티어 리스트
export interface SlotTierList {
    slotPos: number
    slotName: string
    tierItems: TierItem[]
}

export interface TierItem {
    tier: ItemTier
    items: ItemUsageStat[]
}

// 아이템 티어
export type ItemTier = 'S' | 'A' | 'B' | 'C' | 'D'

// 아이템 카테고리
export type ItemCategory =
    | 'weapon'      // 주무기
    | 'subweapon'   // 보조무기
    | 'armor'       // 방어구
    | 'accessory'   // 장신구
    | 'rune'        // 룬
    | 'arcana'      // 아르카나

// 아이템 등급
export type ItemGrade =
    | 'Mythic'
    | 'Legendary'
    | 'Unique'
    | 'Epic'
    | 'Fabled'
    | 'Rare'
    | 'Common'

// 슬롯 포지션 맵
export const SLOT_POS_MAP: Record<number, string> = {
    1: '주무기',
    2: '보조무기',
    3: '투구',
    4: '견갑',
    5: '흉갑',
    6: '장갑',
    7: '각반',
    8: '장화',
    9: '목걸이',
    10: '귀걸이1',
    11: '귀걸이2',
    12: '반지1',
    13: '반지2',
    15: '팔찌2',
    16: '팔찌1',
    17: '허리띠',
    19: '망토',
    22: '아뮬렛',
    23: '룬1',
    24: '룬2',
    41: '아르카나1',
    42: '아르카나2',
    43: '아르카나3',
    44: '아르카나4',
    45: '아르카나5',
}

// 슬롯 카테고리 분류
export const SLOT_CATEGORIES: Record<ItemCategory, number[]> = {
    weapon: [1],
    subweapon: [2],
    armor: [3, 4, 5, 6, 7, 8, 17, 19],
    accessory: [9, 10, 11, 12, 13, 15, 16, 22],
    rune: [23, 24],
    arcana: [41, 42, 43, 44, 45]
}

// 슬롯 그룹 정의 (UI용)
export const SLOT_GROUPS = [
    { name: '무기', slots: [1, 2] },
    { name: '방어구', slots: [3, 4, 5, 6, 7, 8, 17, 19] },
    { name: '장신구', slots: [9, 10, 11, 12, 13, 15, 16, 22] },
    { name: '룬', slots: [23, 24] }
]

// 등급 색상
export const GRADE_COLORS: Record<string, string> = {
    'Mythic': '#09CE9F',
    'Legendary': '#FB9800',
    'Unique': '#FFB84D',
    'Epic': '#7E3DCF',
    'Fabled': '#EE6C2A',
    'Rare': '#3B82F6',
    'Common': '#9CA3AF'
}

// 티어 색상
export const TIER_COLORS: Record<ItemTier, string> = {
    'S': '#FF6B6B',
    'A': '#FF922B',
    'B': '#FFD43B',
    'C': '#69DB7C',
    'D': '#9CA3AF'
}

// 티어 분류 함수 (사용률 기반)
export function getTierByPercent(percent: number): ItemTier {
    if (percent >= 30) return 'S'
    if (percent >= 15) return 'A'
    if (percent >= 5) return 'B'
    if (percent >= 1) return 'C'
    return 'D'
}

// 티어 라벨
export const TIER_LABELS: Record<ItemTier, string> = {
    'S': '최상위',
    'A': '상위',
    'B': '중상위',
    'C': '중위',
    'D': '하위'
}
