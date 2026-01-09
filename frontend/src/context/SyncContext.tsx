'use client'

import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabaseApi, CharacterSearchResult } from '../lib/supabaseApi'

interface SyncContextType {
    enqueueSync: (items: CharacterSearchResult[]) => void
}

const SyncContext = createContext<SyncContextType | undefined>(undefined)

export function SyncProvider({ children }: { children: React.ReactNode }) {
    // We use a Ref for the Map to ensure we always have the latest state inside the interval without re-renders
    const pendingSyncRef = useRef<Map<string, CharacterSearchResult>>(new Map())

    const normalizeNameForKey = (value: string) => value.replace(/<\/?[^>]+(>|$)/g, '').trim().toLowerCase()

    const buildSyncKey = (value: CharacterSearchResult) => {
        if (value.characterId) return `id:${value.characterId}`
        const serverKey = value.server_id ?? value.server
        return `sv:${serverKey}|name:${normalizeNameForKey(value.name)}`
    }

    const enqueueSync = (items: CharacterSearchResult[]) => {
        items.forEach(item => {
            const key = buildSyncKey(item)
            if (!pendingSyncRef.current.has(key)) {
                pendingSyncRef.current.set(key, item)
            }
        })
    }

    useEffect(() => {
        const processQueue = () => {
            const pendingMap = pendingSyncRef.current
            if (pendingMap.size === 0) return

            // Convert map values to array
            const allPending = Array.from(pendingMap.values())

            // Slice the first 1 item (상세 정보 조회하므로 1개씩 처리)
            const batch = allPending.slice(0, 1)

            if (batch.length > 0) {
                // Remove from the map
                batch.forEach(item => {
                    pendingMap.delete(buildSyncKey(item))
                })

                // Send to API
                // We don't await here to keep the interval steady, but we catch errors
                console.log(`[SyncContext] Background syncing ${batch.length} character with full detail...`)
                supabaseApi.syncCharacters(batch).catch(err => {
                    console.error('[SyncContext] Sync failed', err)
                    // Optional: Re-add to queue on failure?
                    // decided not to, to prevent infinite loops on bad data
                })
            }
        }

        // Interval: Every 10000ms (10 seconds) - 상세 정보 조회하므로 간격 늘림
        const intervalId = setInterval(processQueue, 10000)

        return () => clearInterval(intervalId)
    }, [])

    return (
        <SyncContext.Provider value={{ enqueueSync }}>
            {children}
        </SyncContext.Provider>
    )
}

export function useSyncContext() {
    const context = useContext(SyncContext)
    if (context === undefined) {
        throw new Error('useSyncContext must be used within a SyncProvider')
    }
    return context
}
