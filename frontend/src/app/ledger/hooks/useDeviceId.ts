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
  const [linkError, setLinkError] = useState<string | null>(null)

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
              setLinkError(null)

              if (linkData.merged) {
                console.log('[useDeviceId] 기존 데이터가 Google 계정으로 병합됨')
              }
            } else if (linkRes.status === 409) {
              // 이미 다른 Google 계정에 연결됨 - 새 device_id 생성
              const errorData = await linkRes.json()
              console.warn('[useDeviceId] 기기가 다른 계정에 연결됨, 새 device_id 생성:', errorData)

              // 기존 device_id 삭제하고 새로 생성
              const newDeviceId = crypto.randomUUID()
              localStorage.setItem(DEVICE_ID_KEY, newDeviceId)
              localStorage.removeItem(LINKED_GOOGLE_ID_KEY)
              setDeviceId(newDeviceId)

              // 새 device_id로 다시 연동 시도
              const retryRes = await fetch('/api/ledger/link-device', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Device-ID': newDeviceId
                },
                body: JSON.stringify({
                  google_user_id: user.id,
                  google_email: user.email
                })
              })

              if (retryRes.ok) {
                const retryData = await retryRes.json()
                console.log('[useDeviceId] 새 device_id로 연동 성공:', retryData)
                localStorage.setItem(LINKED_GOOGLE_ID_KEY, user.id)
                setIsLinked(true)
                setLinkError(null)
              } else {
                console.error('[useDeviceId] 새 device_id로도 연동 실패')
                setLinkError('계정 연동에 실패했습니다')
              }
            } else {
              const errorData = await linkRes.json()
              console.warn('[useDeviceId] Google 계정 연동 실패:', errorData)
              setLinkError(errorData.error || '연동 실패')
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
  // Google 로그인 시: Authorization 헤더 사용 (크로스 기기 동기화)
  // 비로그인 시: X-Device-ID 헤더 사용
  const getAuthHeaderCallback = useCallback((): Record<string, string> => {
    // Google 로그인된 경우 Authorization 헤더 사용
    if (session?.access_token) {
      return { 'Authorization': `Bearer ${session.access_token}` }
    }
    // 비로그인 시 device_id로 인증
    if (deviceId) {
      return { 'X-Device-ID': deviceId }
    }
    return {}
  }, [session?.access_token, deviceId])

  return {
    deviceId,
    isLoading,
    isAuthenticated,
    isLinked,
    linkError,
    getAuthHeader: getAuthHeaderCallback,
    accessToken: session?.access_token
  }
}
