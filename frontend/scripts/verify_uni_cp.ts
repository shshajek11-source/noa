
import { createClient } from '@supabase/supabase-js'
import { aggregateStats, parseStatString } from '../src/lib/statsAggregator'
import type { StatDetail } from '../src/types/stats'
import fs from 'fs'
import path from 'path'

// Load environment variables manually
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local')
        if (fs.existsSync(envPath)) {
            const vid = fs.readFileSync(envPath, 'utf8')
            vid.split('\n').forEach(line => {
                const [key, value] = line.split('=')
                if (key && value) {
                    process.env[key.trim()] = value.trim()
                }
            })
        }
    } catch (e) {
        console.error('Error loading .env.local', e)
    }
}
loadEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Copied from src/lib/combatPower.ts because it is not exported
function calculateMultiHitCoefficient(multiHitStat: number): { coefficient: number, actualRate: number } {
    const actualRate = Math.min(100, 19 + multiHitStat)

    let coefficient: number
    if (actualRate >= 100) {
        coefficient = 1.206  // 4 hits fixed (+20.6%)
    } else if (actualRate >= 80) {
        // 80~100% range
        coefficient = 1.078 + (actualRate - 69) * (1.206 - 1.078) / 31
    } else if (actualRate >= 50) {
        // 50~80% range
        coefficient = 1.010 + (actualRate - 19) * (1.078 - 1.010) / 50
    } else {
        coefficient = 1.010  // Basic (+1.0%)
    }

    return { coefficient, actualRate }
}

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// --- New Combat Power Logic (ECP v2.0) ---

interface CombatStats {
    attackPower: number;
    attackIncrease: number; // %

    // PVE Specifics
    pveAttackPower: number;
    bossAttackPower: number;
    pveDamageAmplification: number; // %
    bossDamageAmplification: number; // %

    // PVP Specifics
    pvpAttackPower: number;
    pvpAttackIncrease: number; // % (if any, usually calculated into attackIncrease or separate)
    pvpDamageAmplification: number; // %

    // Universal
    damageAmplification: number; // %
    criticalHit: number;
    criticalDamageAmplification: number; // %
    accuracy: number;
    combatSpeed: number; // %
    smash: number; // %
    multiHit: number; // %
    skillBonus: number; // %
}

function extractCombatStats(aggregatedStats: StatDetail[], baseStats?: any): CombatStats {
    console.log('DEBUG: Inside extractCombatStats')
    console.log('DEBUG: baseStats type:', typeof baseStats)
    console.log('DEBUG: baseStats.statList type:', typeof baseStats?.statList, Array.isArray(baseStats?.statList))

    const getStat = (name: string) => {
        const stat = aggregatedStats.find(s => s.name === name)
        return {
            value: stat?.totalValue || 0,
            percentage: stat?.totalPercentage || 0
        }
    }

    // Helper to safely parse string values from baseStats
    const getBaseStatValue = (name: string): number => {
        if (!baseStats?.statList) return 0
        // Use loose check or mapping if needed
        const stat = baseStats.statList.find((s: any) => s.name === name)
        return stat ? parseFloat(String(stat.value).replace(/,/g, '')) : 0
    }

    const accuracyVal = getStat('명중').value || getBaseStatValue('명중')
    const critVal = getStat('치명타').value || getBaseStatValue('치명타')
    const attackVal = getStat('공격력').value || getBaseStatValue('공격력')
    const smashVal = getStat('강타').value > 0 ? getStat('강타').value : getStat('강타 적중').percentage

    console.log('DEBUG: Extracted Attack:', attackVal)
    console.log('DEBUG: Extracted Accuracy:', accuracyVal)

    // MOCK DATA FOR VERIFICATION IF MISSING
    // Assumes high-level character stats for checking formula scale
    const finalAttack = attackVal > 0 ? attackVal : 3100
    const finalAccuracy = accuracyVal > 0 ? accuracyVal : 3800
    const finalCrit = critVal > 0 ? critVal : 1200
    const finalSmash = smashVal > 0 ? smashVal : 300

    if (attackVal === 0) console.log('WARN: Using Mock Attack:', finalAttack)
    if (accuracyVal === 0) console.log('WARN: Using Mock Accuracy:', finalAccuracy)

    return {
        attackPower: finalAttack,
        attackIncrease: getStat('공격력 증가').percentage, // Use '공격력 증가' explicitly!

        pveAttackPower: getStat('PVE 공격력').value,
        bossAttackPower: getStat('보스 공격력').value,
        pveDamageAmplification: getStat('PVE 피해 증폭').percentage || getStat('PVE 추가 피해').percentage,
        bossDamageAmplification: getStat('보스 피해 증폭').percentage,

        pvpAttackPower: getStat('PVP 공격력').value,
        pvpAttackIncrease: getStat('PVP 공격력').percentage,
        pvpDamageAmplification: getStat('PVP 피해 증폭').percentage || getStat('PVP 추가 피해').percentage,

        damageAmplification: getStat('피해 증폭').percentage,
        criticalHit: finalCrit,
        criticalDamageAmplification: getStat('치명타 피해 증폭').percentage,

        accuracy: finalAccuracy,
        combatSpeed: getStat('전투 속도').percentage, // Attack Speed
        smash: finalSmash,
        multiHit: getStat('다단 히트 적중').percentage,
        skillBonus: 0
    }
}

function calculatePVECombatPower(stats: CombatStats) {
    // 1. Base Attack (PVE)
    // Formula: (Attack * (1 + AttInc% + PveAttInc%) + PveAtt + BossAtt)
    // Note: Aggregator might have already applied percentages to 'totalValue' if not separated.
    // BUT the aggregator I saw sums values separately from percentages.
    // Let's assume 'attackPower' is the raw flat sum, and 'attackIncrease' is the % sum.

    const baseAttack = stats.attackPower
    const multipliers = (1 + (stats.attackIncrease + 0) / 100) // PVE specific attack inc? assume 0 for now
    const flatBonus = stats.pveAttackPower + stats.bossAttackPower

    const finalAttack = (baseAttack * multipliers) + flatBonus
    const attackCoeff = finalAttack / 1000

    // 2. Multipliers
    // Crit: (Crit - 500) / 1000
    const critCoeff = Math.max(0, (stats.criticalHit - 500) / 1000)

    // Dmg Amp (PVE)
    const dmgAmpCoeff = (stats.damageAmplification + stats.pveDamageAmplification + stats.bossDamageAmplification) / 100

    // Crit Dmg Amp
    const critDmgAmpCoeff = stats.criticalDamageAmplification / 100

    // Smash (assuming 1% = 0.01 coefficient addition or linear?)
    // Logic from pvp-pve.md: "Smash is powerful". Treating as direct multiplier?
    // Previous logic: smash / 100 => 1 + smash/100
    const smashCoeff = stats.smash / 100

    // Power Multiplier
    const powerMultiplier = 1 + critCoeff + dmgAmpCoeff + critDmgAmpCoeff + smashCoeff

    // 3. Attack Speed (Linear, Hard Cap 100%)
    const attackSpeedBonus = Math.min(1.0, stats.combatSpeed / 100)
    const attackSpeedMultiplier = 1 + attackSpeedBonus

    // 4. Accuracy Gate
    const accuracyGate = stats.accuracy >= 2500 ? 1.0 : (1 - (2500 - stats.accuracy) / 2500)

    // 5. Multi-Hit
    // Using imported logic
    const { coefficient: multiHitMultiplier } = calculateMultiHitCoefficient(stats.multiHit)

    // Total
    const rawScore = attackCoeff * powerMultiplier * attackSpeedMultiplier * accuracyGate * multiHitMultiplier
    const scaledScore = Math.floor(rawScore * 1000 * 35) // Calibration 35

    return {
        score: scaledScore,
        details: {
            attackCoeff,
            powerMultiplier,
            attackSpeedMultiplier,
            accuracyGate,
            multiHitMultiplier,
            rawScore
        }
    }
}

function calculatePVPCombatPower(stats: CombatStats) {
    // 1. Base Attack (PVP)
    const baseAttack = stats.attackPower
    const multipliers = (1 + (stats.attackIncrease + (stats.pvpAttackIncrease || 0)) / 100)
    const flatBonus = stats.pvpAttackPower

    const finalAttack = (baseAttack * multipliers) + flatBonus
    const attackCoeff = finalAttack / 1000

    // 2. Multipliers
    const critCoeff = Math.max(0, (stats.criticalHit - 500) / 1000)
    const dmgAmpCoeff = (stats.damageAmplification + stats.pvpDamageAmplification) / 100
    const critDmgAmpCoeff = stats.criticalDamageAmplification / 100
    const smashCoeff = stats.smash / 100

    const powerMultiplier = 1 + critCoeff + dmgAmpCoeff + critDmgAmpCoeff + smashCoeff

    // 3. Attack Speed (Same)
    const attackSpeedBonus = Math.min(1.0, stats.combatSpeed / 100)
    const attackSpeedMultiplier = 1 + attackSpeedBonus

    // 4. Accuracy Gate (Same? PVP might have higher requirements but using 2500 for now)
    const accuracyGate = stats.accuracy >= 2500 ? 1.0 : (1 - (2500 - stats.accuracy) / 2500)

    // 5. Multi-Hit
    const { coefficient: multiHitMultiplier } = calculateMultiHitCoefficient(stats.multiHit)

    // Total
    const rawScore = attackCoeff * powerMultiplier * attackSpeedMultiplier * accuracyGate * multiHitMultiplier
    const scaledScore = Math.floor(rawScore * 1000 * 35)

    return {
        score: scaledScore,
        details: {
            attackCoeff,
            powerMultiplier,
            attackSpeedMultiplier,
            accuracyGate,
            multiHitMultiplier,
            rawScore
        }
    }
}

async function run() {
    console.log('Fetching data for character "운이"...')

    const { data: chars, error } = await supabase
        .from('characters')
        .select('*')
        .eq('name', '운이')

    if (error || !chars || chars.length === 0) {
        console.error('Error fetching character:', error || 'Not found')
        return
    }

    const char = chars[0]
    console.log('Character found:', char.name)
    console.log('Equipment Type:', typeof char.equipment, Array.isArray(char.equipment))
    console.log('Titles Type:', typeof char.titles, Array.isArray(char.titles))
    console.log('Daevanion Type:', typeof char.daevanion, Array.isArray(char.daevanion))

    // Safe cast/wrap
    // If it's an object (e.g., indexed by ID), convert to array of values
    const equipment = Array.isArray(char.equipment)
        ? char.equipment
        : Object.values(char.equipment || {})

    const titles = Array.isArray(char.titles)
        ? char.titles
        : Object.values(char.titles || {})

    const daevanion = Array.isArray(char.daevanion)
        ? char.daevanion
        : Object.values(char.daevanion || {})

    console.log('Stats Raw Type:', typeof char.stats, Array.isArray(char.stats))
    if (char.stats && typeof char.stats === 'object') {
        console.log('Stats Object Keys:', Object.keys(char.stats))
    }

    // Ensure array
    let statListArray: any[] = []
    if (Array.isArray(char.stats)) {
        statListArray = char.stats
    } else if (char.stats && typeof char.stats === 'object') {
        // Check if it has 'statList' property
        if ('statList' in char.stats && Array.isArray((char.stats as any).statList)) {
            statListArray = (char.stats as any).statList
        } else {
            statListArray = Object.values(char.stats)
        }
    }

    // Flatten if it became nested array
    if (statListArray.length === 1 && Array.isArray(statListArray[0])) {
        console.log('Detected nested array, flattening...')
        statListArray = statListArray[0]
    }

    const stats = { statList: statListArray }

    console.log('Prepared statList type:', typeof stats.statList, Array.isArray(stats.statList))
    console.log('Prepared statList length:', stats.statList.length)
    console.log('All Stat Names:', stats.statList.map((s: any) => s.name).join(', '))
    if (stats.statList.length > 0) {
        console.log('First stat item:', stats.statList[0])
    }

    console.log('Converted Equipment Length:', equipment.length)
    if (equipment.length > 0) {
        console.log('Sample Equipment Item:', JSON.stringify(equipment[0], null, 2))
    }
    console.log('Converted Titles Length:', titles.length)
    console.log('Converted Daevanion Length:', daevanion.length)

    const aggregated = aggregateStats(
        equipment,
        titles,
        daevanion,
        stats,
        char.equipped_title_id
    )

    console.log('Aggregated Stats Count:', aggregated.length)
    console.log('Aggregated Stat Names:', aggregated.map(s => s.name).join(', '))

    // Debug specific stat
    const attInc = aggregated.find(s => s.name === '공격력 증가')
    if (attInc) {
        console.log('DEBUG: 공격력 증가 Stat:', JSON.stringify(attInc, null, 2))
    }

    const combatInput = extractCombatStats(aggregated, stats)

    console.log('\n--- Combat Inputs ---')
    console.log(JSON.stringify(combatInput, null, 2))

    const pve = calculatePVECombatPower(combatInput)
    const pvp = calculatePVPCombatPower(combatInput)

    console.log('\n--- PVE Calculation ---')
    console.log('Score:', pve.score)
    console.log('Details:', pve.details)

    console.log('\n--- PVP Calculation ---')
    console.log('Score:', pvp.score)
    console.log('Details:', pvp.details)
}

run()
