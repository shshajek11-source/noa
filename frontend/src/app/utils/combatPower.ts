// HITON Combat Power & Tier System
// 절대 평가 시스템: 전투력 기준으로 티어 계산
// 티어 순서: Bronze → Silver → Gold → Platinum → Emerald → Sapphire → Ruby → Diamond (모든 티어 1~5)

export interface TierInfo {
    tier: string
    subLevel: number
    color: string
    displayName: string
    image: string
    percentage: number // 1등 대비 비율 (레거시 호환)
}

// 티어 설정 (순서대로) - 절대 전투력 기준
// 현재 랭킹 1등 (~37,000) = D5, 미래 성장 여유 확보
export const TIER_CONFIG = [
    { name: 'Bronze', abbr: 'B', color: '#CD7F32', image: '/tear/bronze.png', min: 0, max: 2000 },
    { name: 'Silver', abbr: 'Si', color: '#C0C0C0', image: '/tear/silver.png', min: 2000, max: 4000 },
    { name: 'Gold', abbr: 'G', color: '#FFD700', image: '/tear/gold.png', min: 4000, max: 7000 },
    { name: 'Platinum', abbr: 'P', color: '#E5E4E2', image: '/tear/platinum.png', min: 7000, max: 11000 },
    { name: 'Emerald', abbr: 'E', color: '#50C878', image: '/tear/emarald.png', min: 11000, max: 17000 },
    { name: 'Sapphire', abbr: 'Sa', color: '#0F52BA', image: '/tear/sapa.png', min: 17000, max: 25000 },
    { name: 'Ruby', abbr: 'R', color: '#E0115F', image: '/tear/rubi.png', min: 25000, max: 35000 },
    { name: 'Diamond', abbr: 'D', color: '#B9F2FF', image: '/tear/diamond.png', min: 35000, max: 100000 },
]

// Stat weights for combat power calculation
const STAT_WEIGHTS: { [key: string]: number } = {
    '위력': 1.5,
    'Power': 1.5,
    '공격력': 1.5,
    '민첩': 1.2,
    'Agility': 1.2,
    '공격속도': 1.2,
    '정확': 1.0,
    'Accuracy': 1.0,
    '명중': 1.0,
    '의지': 1.0,
    'Will': 1.0,
    '마법저항': 1.0,
    '지식': 1.3,
    'Knowledge': 1.3,
    '마법력': 1.3,
    '체력': 0.8,
    'Stamina': 0.8,
    'HP': 0.8,
    '생명력': 0.8
}

/**
 * Calculate combat power from character stats and equipment
 */
export function calculateCombatPower(stats: any, equipment: any[]): number {
    let totalPower = 0

    // 1. Base stats contribution
    if (stats?.statList) {
        for (const stat of stats.statList) {
            const statName = stat.name || stat.statName
            const statValue = typeof stat.value === 'string'
                ? parseInt(stat.value.replace(/,/g, ''))
                : (stat.value || stat.statValue || 0)

            const weight = STAT_WEIGHTS[statName] || 0.5
            totalPower += statValue * weight
        }
    }

    // 2. Equipment contribution
    for (const item of equipment) {
        if (!item) continue

        if (item.itemLevel) {
            totalPower += item.itemLevel * 10
        }

        if (item.enhancement) {
            const enhanceLevel = parseInt(item.enhancement.replace('+', ''))
            totalPower += enhanceLevel * 50
        }

        if (item.breakthrough) {
            totalPower += item.breakthrough * 100
        }

        if (item.soulEngraving) {
            const grade = item.soulEngraving.grade
            if (grade === 'S') totalPower += 200
            else if (grade === 'A') totalPower += 150
            else if (grade === 'B') totalPower += 100
        }

        if (item.manastones) {
            totalPower += item.manastones.length * 20
        }
    }

    return Math.floor(totalPower)
}

/**
 * 절대 평가 시스템: 전투력 기준으로 티어 계산
 * 현재 랭킹 1등 (~37,000) = D5
 * 각 티어 내에서 5단계로 세분화 (1이 최고, 5가 최저)
 *
 * @param combatPower - 해당 캐릭터의 전투력
 * @param topPower - 1등의 전투력 (레거시 호환, 사용하지 않음)
 */
export function getTierInfo(combatPower: number, topPower?: number): TierInfo {
    // Diamond 최대치 이상은 D1 고정
    if (combatPower >= 100000) {
        const tierConfig = TIER_CONFIG[7] // Diamond
        return {
            tier: tierConfig.name,
            subLevel: 1,
            color: tierConfig.color,
            displayName: `${tierConfig.abbr}1`,
            image: tierConfig.image,
            percentage: 100
        }
    }

    // 각 티어에서 세분화 계산
    for (let i = TIER_CONFIG.length - 1; i >= 0; i--) {
        const tier = TIER_CONFIG[i]
        if (combatPower >= tier.min) {
            const range = tier.max - tier.min
            const position = combatPower - tier.min
            // 5등분하여 1~5 계산 (높을수록 1에 가까움)
            const subLevel = 5 - Math.min(4, Math.floor((position / range) * 5))

            return {
                tier: tier.name,
                subLevel,
                color: tier.color,
                displayName: `${tier.abbr}${subLevel}`,
                image: tier.image,
                percentage: topPower ? Math.min(100, (combatPower / topPower) * 100) : 0
            }
        }
    }

    // 기본값: Bronze 5
    const tierConfig = TIER_CONFIG[0]
    return {
        tier: tierConfig.name,
        subLevel: 5,
        color: tierConfig.color,
        displayName: `${tierConfig.abbr}5`,
        image: tierConfig.image,
        percentage: 0
    }
}

/**
 * Get tier badge style for UI
 */
export function getTierBadgeStyle(tierInfo: TierInfo) {
    return {
        background: `linear-gradient(135deg, ${tierInfo.color}20, ${tierInfo.color}10)`,
        border: `1px solid ${tierInfo.color}60`,
        color: tierInfo.color,
        fontWeight: 'bold',
        padding: '0.3rem 0.6rem',
        borderRadius: '6px',
        fontSize: '0.75rem',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em'
    }
}

/**
 * Get tier image path
 */
export function getTierImage(tierName: string): string {
    const tier = TIER_CONFIG.find(t => t.name.toLowerCase() === tierName.toLowerCase())
    return tier?.image || '/tear/bronze.png'
}
