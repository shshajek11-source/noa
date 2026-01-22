'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'

const DEVICE_ID_KEY = 'ledger_device_id'
const LINKED_GOOGLE_ID_KEY = 'ledger_linked_google_id'

// device_id 가져오기 (없으면 생성)
function getOrCreateDeviceId(): string | null {
  if (typeof window === 'undefined') return null

  let deviceId = localStorage.getItem(DEVICE_ID_KEY)
  if (!deviceId) {
    deviceId = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_KEY, deviceId)
    console.log('[getOrCreateDeviceId] 새 device_id 생성:', deviceId.substring(0, 8) + '...')
  }
  return deviceId
}

// Standalone function to get auth headers (for use outside of React components)
// Google 로그인 상태를 알 수 없으므로 device_id만 사용
export function getAuthHeader(): Record<string, string> {
  const deviceId = getOrCreateDeviceId()
  if (deviceId) {
    return { 'X-Device-ID': deviceId }
  }
  return {}
}

export function useDeviceId() {
  const { user, session, isLoading: isAuthLoading } = useAuth()
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLinked, setIsLinked] = useState(false)

  useEffect(() => {
    if (isAuthLoading) return

    const initUser = async () => {
      // device_id 가져오기 또는 생성
      let id = localStorage.getItem(DEVICE_ID_KEY)

      if (!id) {
        id = crypto.randomUUID()
        localStorage.setItem(DEVICE_ID_KEY, id)
        console.log('[useDeviceId] 새 device_id 생성:', id)
      }

      setDeviceId(id)

      // Google 로그인 상태 확인
      if (user && session?.access_token) {
        setIsAuthenticated(true)
        console.log('[useDeviceId] Google 로그인 감지:', user.email)

        // 이미 연동된 Google 계정인지 확인
        const linkedGoogleId = localStorage.getItem(LINKED_GOOGLE_ID_KEY)

        if (linkedGoogleId === user.id) {
          // 이미 연동됨
          setIsLinked(true)
          console.log('[useDeviceId] 이미 Google 계정 연동됨')
        } else {
          // Google 계정과 device_id 연동
          console.log('[useDeviceId] Google 계정 연동 시도...')
          try {
            const linkRes = await fetch('/api/ledger/link-device', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Device-ID': id
              },
              body: JSON.stringify({
                google_user_id: user.id,
                google_email: user.email
              })
            })

            if (linkRes.ok) {
              const linkData = await linkRes.json()
              console.log('[useDeviceId] Google 계정 연동 성공:', linkData)
              localStorage.setItem(LINKED_GOOGLE_ID_KEY, user.id)
              setIsLinked(true)

              if (linkData.merged) {
                console.log('[useDeviceId] 기존 데이터가 Google 계정으로 병합됨')
              }
            } else {
              const errorData = await linkRes.json()
              console.warn('[useDeviceId] Google 계정 연동 실패:', errorData)
            }
          } catch (e) {
            console.warn('[useDeviceId] Google 계정 연동 오류:', e)
          }
        }
      } else {
        setIsAuthenticated(false)
        setIsLinked(false)

        // Initialize device user (비동기로 실행, 실패해도 계속 진행)
        fetch('/api/ledger/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_id: id })
        }).catch(e => {
          console.warn('[useDeviceId] Init API warning (무시해도 됨):', e)
        })
      }

      setIsLoading(false)
      console.log('[useDeviceId] 초기화 완료 - device_id:', id.substring(0, 8) + '...', 'Google:', !!user)
    }

    initUser()
  }, [isAuthLoading, user, session?.access_token])

  // Return auth headers for requests
  // Google 로그인 + 연동 완료 시: Authorization 헤더 사용 (크로스 기기 동기화)
  // 그 외: device_id 사용
  const getAuthHeaderCallback = useCallback((): Record<string, string> => {
    // Google 로그인 + 연동 완료된 경우 Authorization 헤더 사용
    if (isAuthenticated && isLinked && session?.access_token) {
      return { 'Authorization': `Bearer ${session.access_token}` }
    }

    // 그 외에는 device_id 사용
    const id = getOrCreateDeviceId()
    if (id) {
      return { 'X-Device-ID': id }
    }
    return {}
  }, [isAuthenticated, isLinked, session?.access_token])

  return {
    deviceId,
    isLoading,
    isAuthenticated,
    isLinked,
    getAuthHeader: getAuthHeaderCallback,
    accessToken: session?.access_token
  }
}
