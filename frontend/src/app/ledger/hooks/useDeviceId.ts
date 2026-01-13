'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'

const DEVICE_ID_KEY = 'ledger_device_id'

// Standalone function to get auth headers (for use outside of React components)
export function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {}

  // Check for device ID
  const deviceId = localStorage.getItem(DEVICE_ID_KEY)
  if (deviceId) {
    return { 'x-device-id': deviceId }
  }
  return {}
}

export function useDeviceId() {
  const { user, session, isLoading: isAuthLoading } = useAuth()
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    if (isAuthLoading) return

    const initUser = async () => {
      // If authenticated with Google, use auth token
      if (user && session) {
        setIsAuthenticated(true)
        setDeviceId(null) // Don't need device_id when authenticated

        // Initialize auth user in ledger system
        try {
          await fetch('/api/ledger/auth-init', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            }
          })
        } catch (e) {
          console.error('Auth init error:', e)
        }

        setIsLoading(false)
        return
      }

      // Fall back to device_id for anonymous users
      setIsAuthenticated(false)
      let id = localStorage.getItem(DEVICE_ID_KEY)

      if (!id) {
        id = crypto.randomUUID()
        localStorage.setItem(DEVICE_ID_KEY, id)
      }

      setDeviceId(id)
      setIsLoading(false)

      // Initialize device user
      fetch('/api/ledger/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: id })
      }).catch(console.error)
    }

    initUser()
  }, [user, session, isAuthLoading])

  // Return access token for authenticated requests
  const getAuthHeader = useCallback((): Record<string, string> => {
    if (isAuthenticated && session) {
      return { 'Authorization': `Bearer ${session.access_token}` }
    }
    if (deviceId) {
      return { 'x-device-id': deviceId }
    }
    return {}
  }, [isAuthenticated, session, deviceId])

  return {
    deviceId,
    isLoading,
    isAuthenticated,
    getAuthHeader,
    accessToken: session?.access_token
  }
}
