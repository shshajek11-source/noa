/**
 * AION2 External API Response Types
 */

// 외부 API 캐릭터 검색 결과
export interface ExternalCharacterResult {
    characterId: string
    name: string
    serverId: number
    serverName: string
    level: number
    pcId: number
    className?: string
    jobName?: string
    race: number
    raceName?: string
    profileImageUrl?: string
}

// 외부 API 캐릭터 프로필
export interface ExternalCharacterProfile {
    characterId: string
    serverId: string
    characterName: string
    characterLevel: number
    className: string
    raceName: string
    profileImage?: string
    pcId?: number
}

// 스탯 리스트 아이템
export interface StatListItem {
    name: string
    value: number
    type?: string
    extra?: string
}

// 스탯 데이터
export interface CharacterStats {
    statList?: StatListItem[]
    attack_phy?: number
    attack?: number
    boost_mag?: number
    magicBoost?: number
    crit_phy?: number
    crit?: number
    accuracy_phy?: number
    accuracy?: number
    accuracy_mag?: number
}

// 장비 아이템
export interface EquipmentItem {
    id?: string
    itemId?: string
    slotPos: number
    name?: string
    itemLevel?: number
    enchantLevel?: number
    exceedLevel?: number
    grade?: string
    icon?: string
    manastoneList?: ManastoneItem[]
    soulEngraving?: SoulEngraving
    detail?: TransformedItemDetail | null
}

// 변환된 아이템 상세 정보
export interface TransformedItemDetail {
    options: TransformedOption[]
    randomOptions: TransformedOption[]
    manastones: TransformedManastone[]
    godstones: TransformedGodstone[]
    arcanas: TransformedArcana[]
    setEffects: TransformedSetEffect[]
    source: string | null
    _raw?: unknown
}

export interface TransformedOption {
    name: string
    value: string | number
}

export interface TransformedManastone {
    type: string
    value: string | number
    grade?: string
    icon?: string
}

export interface TransformedGodstone {
    name: string
    desc?: string
    grade?: string
    icon?: string
}

export interface TransformedArcana {
    id?: string
    name: string
    level?: number
    desc?: string
    grade?: string
    icon?: string
    value?: string | number
}

export interface TransformedSetEffect {
    name: string
    equippedCount?: number
    bonuses?: unknown[]
    items?: unknown[]
}

// 마석 아이템
export interface ManastoneItem {
    type: string
    value: number
    grade?: string
}

// 영혼 각인
export interface SoulEngraving {
    grade: string
    percentage: number
}

// 외부 API 상세 응답
export interface ExternalDetailResponse {
    mainStats?: StatListItem[]
    subStats?: StatListItem[]
    magicStoneStat?: ManastoneItem[]
    godStoneStat?: GodstoneItem[]
    subSkills?: SubSkill[]
    arcanaStat?: ArcanaItem[]
    sources?: string[]
    set?: SetInfo
    setEffects?: TransformedSetEffect[]
}

export interface GodstoneItem {
    name: string
    desc?: string
    grade?: string
    icon?: string
}

export interface SubSkill {
    id: string
    name: string
    level?: number
    icon?: string
}

export interface ArcanaItem {
    name: string
    desc?: string
    grade?: string
    icon?: string
    value?: string | number
}

export interface SetInfo {
    name?: string
    equippedCount?: number
    bonuses?: unknown[]
    items?: unknown[]
}

// Local DB 캐릭터 레코드
export interface LocalCharacterRecord {
    character_id: string
    server_id: number
    name: string
    level: number
    class_name: string
    race_name: string
    profile_image?: string
    item_level?: number
    noa_score?: number
    pve_score?: number
    pvp_score?: number
}

// 전투력 계산용 장비 데이터
export interface EquipmentForCalc {
    itemLevel: number
    enhancement: string
    breakthrough: number
    soulEngraving?: SoulEngraving
    manastones: ManastoneItem[]
}
