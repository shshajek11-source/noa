// HITON Combat Power & Tier System
// 상대 평가 시스템: 1등 기준으로 티어 계산
// 티어 순서: Bronze → Silver → Gold → Platinum → Emerald → Sapphire → Ruby → Diamond (모든 티어 1~5)

export interface TierInfo {
    tier: string
    subLevel: number
    color: string
    displayName: string
    image: string
    percentage: number // 1등 대비 비율
}

// 티어 설정 (순서대로)
// 각 티어는 전체의 약 12.5% 구간 (8티어 x 5단계 = 40단계)
export const TIER_CONFIG = [
    { name: 'Bronze', color: '#CD7F32', image: '/tear/bronze.png' },
    { name: 'Silver', color: '#C0C0C0', image: '/tear/silver.png' },
    { name: 'Gold', color: '#FFD700', image: '/tear/gold.png' },
    { name: 'Platinum', color: '#E5E4E2', image: '/tear/platinum.png' },
    { name: 'Emerald', color: '#50C878', image: '/tear/emarald.png' },
    { name: 'Sapphire', color: '#0F52BA', image: '/tear/sapa.png' },
    { name: 'Ruby', color: '#E0115F', image: '/tear/rubi.png' },
    { name: 'Diamond', color: '#B9F2FF', image: '/tear/diamond.png' },
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
 * 상대 평가 시스템: 1등 전투력 기준으로 티어 계산
 * 1등 = Diamond 2 기준 (현재 임시, 나중에 전투력 상승하면 Diamond 3,4,5도 가능)
 *
 * @param combatPower - 해당 캐릭터의 전투력
 * @param topPower - 1등의 전투력
 */
export function getTierInfo(combatPower: number, topPower?: number): TierInfo {
    // 1등 전투력이 없으면 기본값 사용
    const maxPower = topPower || combatPower || 1

    // 1등 = Diamond 2 기준으로 계산
    // Diamond 2 = 37단계 (8티어 x 5단계 = 40단계 중 37번째)
    // 1등 전투력을 37단계로 매핑
    const diamond2Step = 37
    const stepPerPower = diamond2Step / maxPower

    // 현재 캐릭터의 단계 계산
    const currentStep = Math.min(40, Math.max(1, Math.floor(combatPower * stepPerPower)))

    // 단계에서 티어와 세부 레벨 계산
    // 1~5: Bronze 1~5, 6~10: Silver 1~5, ... 36~40: Diamond 1~5
    const tierIndex = Math.min(7, Math.floor((currentStep - 1) / 5))
    const subLevel = ((currentStep - 1) % 5) + 1

    const tierConfig = TIER_CONFIG[tierIndex]
    const percentage = Math.min(100, (combatPower / maxPower) * 100)

    return {
        tier: tierConfig.name,
        subLevel,
        color: tierConfig.color,
        displayName: `${tierConfig.name} ${subLevel}`,
        image: tierConfig.image,
        percentage: Math.round(percentage * 10) / 10
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
