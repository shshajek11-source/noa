import { SERVER_MAP } from '../app/constants/servers'
import type {
    ExternalCharacterResult,
    LocalCharacterRecord,
    CharacterStats,
    EquipmentItem,
    TransformedItemDetail
} from '../types/api'

const SUPABASE_PROJECT_URL = 'https://mnbngmdjiszyowfvnzhk.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uYm5nbWRqaXN6eW93ZnZuemhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5OTY0ODAsImV4cCI6MjA4MjU3MjQ4MH0.AIvvGxd_iQKpQDbmOBoe4yAmii1IpB92Pp7Scs8Lz7U'

export const getApiBaseUrl = () => {
    if (typeof window !== 'undefined') return ''
    return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'
}

export interface CharacterSearchResult {
    characterId: string
    name: string
    server: string
    server_id?: number // Added for detail fetch
    job: string
    className?: string // Alias for job
    level: number
    race: string
    imageUrl?: string
    profileImage?: string // Alias for imageUrl
    item_level?: number // 아이템 레벨
    noa_score?: number // HITON 전투력
    raw?: ExternalCharacterResult
}

// Use centralized server constants
export const SERVER_NAME_TO_ID: Record<string, number> = Object.entries(SERVER_MAP).reduce((acc, [id, name]) => {
    acc[name] = parseInt(id)
    return acc
}, {} as Record<string, number>)

export const SERVER_ID_TO_NAME: Record<number, string> = Object.entries(SERVER_MAP).reduce((acc, [id, name]) => {
    acc[parseInt(id)] = name
    return acc
}, {} as Record<number, string>)

export interface CharacterDetail {
    character_id: string
    server_id: number
    name: string
    level: number
    class_name: string
    race_name: string
    combat_power: number
    profile_image: string
    stats: CharacterStats | null
    equipment: { equipmentList?: EquipmentItem[] } | null
    titles: Record<string, unknown> | null
    rankings: Record<string, unknown> | null
    daevanion: Record<string, unknown> | null
    pet_wing: Record<string, unknown> | null
    skills: Record<string, unknown> | null
    created_at: string
    updated_at: string
}

// pcId to className mapping (extracted from AION2 API data)
// Comprehensive mapping based on actual API responses
const PC_ID_TO_CLASS_NAME: Record<number, string> = {
    // 전사 계열 (Warrior)
    6: '검성',   // Gladiator
    7: '검성',   // Gladiator
    8: '검성',   // Gladiator (variant)
    9: '검성',   // Gladiator (variant 2)
    10: '수호성', // Templar
    11: '수호성', // Templar
    12: '수호성', // Templar (variant)
    13: '수호성', // Templar (variant 2)

    // 정찰 계열 (Scout)
    14: '궁성',  // Ranger
    15: '궁성',  // Ranger
    16: '궁성',  // Ranger (variant)
    17: '궁성',  // Ranger (variant 2)
    18: '살성',  // Assassin
    19: '살성',  // Assassin
    20: '살성',  // Assassin
    21: '살성',  // Assassin (variant 2)

    // 법사 계열 (Mage)
    22: '정령성', // Spiritmaster
    23: '정령성', // Spiritmaster
    24: '정령성', // Spiritmaster (variant)
    25: '정령성', // Spiritmaster (variant 2)
    26: '마도성', // Sorcerer
    27: '마도성', // Sorcerer
    28: '마도성', // Sorcerer
    29: '마도성', // Sorcerer (variant 2)

    // 성직자 계열 (Priest)
    30: '치유성', // Cleric
    31: '치유성', // Cleric
    32: '치유성', // Cleric (variant - confirmed from API)
    33: '치유성', // Cleric (variant 2)
    34: '호법성', // Chanter
    35: '호법성', // Chanter
    36: '호법성', // Chanter (variant)
    37: '호법성', // Chanter (variant 2)

    // 기공사 계열 (Technist - if exists)
    38: '기공사',  // Thunderer/Gunner
    39: '기공사',  // Thunderer/Gunner
    40: '기공사',  // Thunderer/Gunner (variant)
    41: '기공사',  // Thunderer/Gunner (variant 2)
};

// Create reverse lookup for logging unknown pcIds
const KNOWN_PC_IDS = new Set(Object.keys(PC_ID_TO_CLASS_NAME).map(Number));

export const supabaseApi = {
    /**
     * Search for a character by name (Live AION API).
     */
    async searchCharacter(name: string, serverId?: number, race?: string, page: number = 1): Promise<CharacterSearchResult[]> {
        // Convert race string to ID if necessary
        let raceId: number | undefined
        if (race) {
            const r = race.toLowerCase()
            if (r === 'elyos' || r === '천족') raceId = 1
            else if (r === 'asmodian' || r === '마족') raceId = 2
            else if (!isNaN(Number(race))) raceId = Number(race)
        }

        const res = await fetch(`${getApiBaseUrl()}/api/search/live`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, serverId, race: raceId, page })
        })

        if (!res.ok) {
            const errorText = await res.text()
            throw new Error(`Search failed: ${errorText}`)
        }

        const data = await res.json()
        let allResults: CharacterSearchResult[] = []

        if (data && Array.isArray(data.list)) {
            const resolveRace = (raceValue: number | string | undefined, raceName?: string): string => {
                if (typeof raceName === 'string') {
                    if (raceName.includes('천족') || raceName.toLowerCase().includes('elyos')) return 'Elyos'
                    if (raceName.includes('마족') || raceName.toLowerCase().includes('asmodian')) return 'Asmodian'
                }

                if (typeof raceValue === 'number') {
                    if (raceValue === 2) return 'Asmodian'
                    if (raceValue === 0 || raceValue === 1) return 'Elyos'
                }

                if (typeof raceValue === 'string') {
                    const normalized = raceValue.toLowerCase()
                    if (normalized === 'elyos' || normalized === '천족' || normalized === '1' || normalized === '0') return 'Elyos'
                    if (normalized === 'asmodian' || normalized === '마족' || normalized === '2') return 'Asmodian'
                }

                return 'Asmodian'
            }

            const stripTags = (value: string): string => value.replace(/<\/?[^>]+(>|$)/g, '')

            allResults = (data.list as ExternalCharacterResult[])
                .filter((item) => {
                    // Validation: Skip characters with invalid data
                    if (!item.level || item.level <= 0) {
                        console.warn(`Skipping character: invalid level (${item.level})`);
                        return false;
                    }
                    if (!item.characterId) {
                        console.warn(`Skipping character: missing characterId`);
                        return false;
                    }
                    return true;
                })
                .map((item) => {
                    // Determine class name with multiple fallbacks
                    let jobName = PC_ID_TO_CLASS_NAME[item.pcId];
                    if (!jobName) {
                        // Fallback 1: Use className if available and Korean
                        if (item.className && /[가-힣]/.test(item.className)) {
                            jobName = item.className;
                        }
                        // Fallback 2: Use jobName if available
                        else if (item.jobName && /[가-힣]/.test(item.jobName)) {
                            jobName = item.jobName;
                        }
                        // Fallback 3: Log unknown pcId for future mapping
                        else {
                            console.warn(`[supabaseApi] Unknown pcId: ${item.pcId}, className: ${item.className}, jobName: ${item.jobName}`);
                            jobName = item.className || item.jobName || "Unknown";
                        }
                    }

                    return {
                        characterId: decodeURIComponent(item.characterId),
                        name: typeof item.name === 'string' ? stripTags(item.name) : item.name,
                        server: item.serverName,
                        server_id: item.serverId,
                        job: jobName,
                        level: item.level,
                        race: resolveRace(item.race, item.raceName),
                        imageUrl: item.profileImageUrl ? (item.profileImageUrl.startsWith('http') ? item.profileImageUrl : `https://profileimg.plaync.com${item.profileImageUrl}`) : undefined,
                        raw: item
                    };
                })
        }

        // 로컬 DB에서 추가 정보(item_level, noa_score) 조회하여 병합
        if (allResults.length > 0) {
            try {
                const characterIds = allResults.map(r => r.characterId).filter(Boolean)
                if (characterIds.length > 0) {
                    const localRes = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/characters?character_id=in.(${characterIds.map(id => `"${id}"`).join(',')})&select=character_id,item_level,noa_score`, {
                        method: 'GET',
                        headers: {
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                            'Content-Type': 'application/json'
                        }
                    })
                    if (localRes.ok) {
                        const localData: LocalCharacterRecord[] = await localRes.json()
                        const localMap = new Map<string, LocalCharacterRecord>(
                            localData.map((item) => [item.character_id, item])
                        )
                        allResults = allResults.map(r => {
                            const local = localMap.get(r.characterId)
                            if (local) {
                                return {
                                    ...r,
                                    item_level: local.item_level,
                                    noa_score: local.noa_score
                                }
                            }
                            return r
                        })
                    }
                }
            } catch (e) {
                console.warn('Failed to fetch local data for live results', e)
            }
        }

        return allResults
    },

    /**
     * Search for a character in Local DB via PostgREST.
     */
    async searchLocalCharacter(name: string, serverId?: number, race?: string): Promise<CharacterSearchResult[]> {
        const queryParams: Record<string, string> = {
            select: '*',
            name: `ilike.*${name}*`,
            limit: '20'
        }

        if (serverId) {
            queryParams.server_id = `eq.${serverId}`
        }

        if (race) {
            // Map 'elyos'/'asmodian' to DB values if stored differently, 
            // but usually we check if the DB stores 'Elyos' or 'ASMODIANS' etc.
            // Based on migrations: race_name TEXT
            // Let's assume standard 'Elyos'/'Asmodian' capitalization or partial match if unsure,
            // but usually specific values.
            // If input is 'elyos', we might want to search `race_name=eq.Elyos`
            const r = race.toLowerCase()
            if (r === 'elyos' || r === '천족') queryParams.race_name = `eq.Elyos`
            else if (r === 'asmodian' || r === '마족') queryParams.race_name = `eq.Asmodian`
        }

        const query = new URLSearchParams(queryParams)

        try {
            const res = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/characters?${query}`, {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'count=none'
                }
            })

            if (!res.ok) {
                console.error('Local search failed', res.status, await res.text())
                return []
            }

            const data = await res.json()

            if (!Array.isArray(data)) return []

            return (data as LocalCharacterRecord[]).map((item) => ({
                characterId: item.character_id,
                name: item.name,
                server: SERVER_ID_TO_NAME[item.server_id] || 'Unknown',
                server_id: item.server_id,
                job: item.class_name,
                level: item.level,
                race: item.race_name,
                imageUrl: item.profile_image ? (item.profile_image.startsWith('http') ? item.profile_image : `https://profileimg.plaync.com${item.profile_image}`) : undefined,
                item_level: item.item_level,
                noa_score: item.noa_score
            }))
        } catch (e) {
            console.error("Local search exception", e)
            return []
        }
    },

    /**
     * Get detailed character info.
     */
    async getCharacterDetail(characterId: string, serverId: number): Promise<CharacterDetail> {
        const res = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/get-character`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ characterId, serverId })
        })

        if (!res.ok) {
            // Handle cache miss or failures clearly
            const errorText = await res.text()
            throw new Error(`Get detail failed: ${errorText}`)
        }

        // Returns the DB row structure
        return await res.json()
    },

    /**
     * Force refresh character info.
     */
    async refreshCharacter(characterId: string, serverId: number): Promise<CharacterDetail> {
        const res = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/refresh-character`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ characterId, serverId })
        })

        if (!res.ok) {
            const errorText = await res.text()
            throw new Error(`Refresh failed: ${errorText}`)
        }

        return await res.json()
    },

    /**
     * Sync search results to local DB in background.
     */
    async syncCharacters(characters: CharacterSearchResult[]): Promise<void> {
        try {
            await fetch(`${getApiBaseUrl()}/api/search/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(characters)
            })
        } catch (e) {
            console.error('Background sync failed', e)
            // Silently fail as this is a background task
        }
    }
}
