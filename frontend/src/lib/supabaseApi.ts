
const SUPABASE_PROJECT_URL = 'https://mnbngmdjiszyowfvnzhk.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uYm5nbWRqaXN6eW93ZnZuemhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5OTY0ODAsImV4cCI6MjA4MjU3MjQ4MH0.AIvvGxd_iQKpQDbmOBoe4yAmii1IpB92Pp7Scs8Lz7U'

export interface CharacterSearchResult {
    characterId: string
    name: string
    server: string
    server_id?: number // Added for detail fetch
    job: string
    level: number
    race: string
    imageUrl?: string
}

import { SERVER_MAP, SERVERS } from '../app/constants/servers'

export interface CharacterSearchResult {
    characterId: string
    name: string
    server: string
    server_id?: number // Added for detail fetch
    job: string
    level: number
    race: string
    imageUrl?: string
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
    stats: any
    equipment: any
    titles: any
    rankings: any
    daevanion: any
    pet_wing: any
    skills: any
    created_at: string
    updated_at: string
}

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

        const res = await fetch(`/api/search/live`, {
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
            allResults = data.list.map((item: any) => ({
                characterId: item.characterId,
                name: item.name,
                server: item.serverName,
                server_id: item.serverId,
                job: 'Unknown',
                level: item.level,
                race: item.race === 0 ? 'Elyos' : 'Asmodian',
                imageUrl: item.profileImageUrl ? (item.profileImageUrl.startsWith('http') ? item.profileImageUrl : `https://profileimg.plaync.com${item.profileImageUrl}`) : undefined,
                raw: item
            }))
        }

        return allResults
    },

    /**
     * Search for a character in Local DB via PostgREST.
     */
    async searchLocalCharacter(name: string): Promise<CharacterSearchResult[]> {
        const query = new URLSearchParams({
            select: '*',
            name: `ilike.*${name}*`,
            limit: '20'
        })

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

            return data.map((item: any) => ({
                characterId: item.character_id,
                name: item.name,
                server: SERVER_ID_TO_NAME[item.server_id] || 'Unknown',
                server_id: item.server_id,
                job: item.class_name,
                level: item.level,
                race: item.race_name,
                imageUrl: item.profile_image ? (item.profile_image.startsWith('http') ? item.profile_image : `https://profileimg.plaync.com${item.profile_image}`) : undefined,
                raw: item
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
    }
}
