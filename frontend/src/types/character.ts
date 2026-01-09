export interface RecentCharacter {
    id: string;          // server_id + '_' + character_name
    name: string;        // Character Name
    server: string;      // Server Name (e.g., Siel)
    serverId: number;    // Server ID
    race: string;        // Race (elyos/asmodian)
    class: string;       // Class Name
    level: number;       // Character Level
    itemLevel: number;   // Item Level (Combat Power-like metric)
    profileImage: string;// Profile Image URL
    timestamp: number;   // Timestamp for sorting
}

export interface RankingCharacter {
    character_id: string;
    server_id: number;
    name: string;
    level: number;
    class_name: string;
    race_name: string;
    guild_name?: string;
    combat_power?: number;
    profile_image?: string;
    noa_score?: number;        // HITON 전투력 (DB 컬럼명)
    hiton_score?: number;      // HITON 전투력 (별칭)
    ranking_ap?: number;
    ranking_gp?: number;
    item_level?: number;       // 아이템 레벨
    prev_rank?: number | null; // 이전 순위 (null = NEW)
    prev_tier?: string;        // 이전 티어 (진급 하이라이트용)
}

export interface ComparisonCharacter extends RankingCharacter {
    hp: number
    mp: number
    attack_power: number
    magic_boost: number
    accuracy: number
    magic_accuracy: number
    crit_strike: number
    magic_crit: number
    defense: number
    magic_resist: number
    evasion: number
    parry: number
    block: number
    pvp_attack: number
    pvp_defense: number
    equipment: ComparisonEquipmentItem[]

    // 대바니온 스탯
    daevanion_justice?: number
    daevanion_freedom?: number
    daevanion_destruction?: number
    daevanion_death?: number
    daevanion_time?: number
    daevanion_life?: number
}

export interface ComparisonEquipmentItem {
    slot: string
    name: string
    enhancement: string
    tier: number
    itemLevel?: number
    grade?: string
    image?: string
    category?: string
    breakthrough?: number
    soulEngraving?: {
        grade: string
        percentage: number
    }
    manastones?: Array<{
        type: string
        value: number
    }>
}

