'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { PartyNotification } from '@/types/party'
import { supabase } from '@/lib/supabaseClient'

const NOTIFICATION_ENABLED_KEY = 'party_notifications_enabled'

// 알림 활성화 상태 가져오기
function getNotificationEnabled(): boolean {
  if (typeof window === 'undefined') return true
  const stored = localStorage.getItem(NOTIFICATION_ENABLED_KEY)
  return stored === null ? true : stored === 'true'
}

// 알림 활성화 상태 저장
function setNotificationEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(NOTIFICATION_ENABLED_KEY, String(enabled))
}

// 인증 헤더 가져오기
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {}

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }
  } catch (e) {
    console.error('[useNotifications] Failed to get auth session:', e)
  }

  return headers
}

// 브라우저 알림 권한 요청
async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission === 'denied') {
    return false
  }

  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

// 브라우저 알림 표시
function showBrowserNotification(title: string, body: string, partyId?: string) {
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
    return
  }

  const notification = new Notification(title, {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: partyId || 'party-notification',
    requireInteraction: false
  })

  notification.onclick = () => {
    window.focus()
    if (partyId) {
      window.location.href = `/party/${partyId}`
    }
    notification.close()
  }

  // 5초 후 자동 닫기
  setTimeout(() => notification.close(), 5000)
}

export function useNotifications(autoFetch = true) {
  const [notifications, setNotifications] = useState<PartyNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const prevNotificationIds = useRef<Set<string>>(new Set())
  const isFirstLoad = useRef(true)

  // 알림 활성화 상태 초기화
  useEffect(() => {
    setNotificationsEnabled(getNotificationEnabled())
  }, [])

  // 알림 활성화/비활성화 토글
  const toggleNotifications = useCallback((enabled?: boolean) => {
    const newValue = enabled !== undefined ? enabled : !notificationsEnabled
    setNotificationsEnabled(newValue)
    setNotificationEnabled(newValue)
    return newValue
  }, [notificationsEnabled])

  // 브라우저 알림 권한 상태 확인
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setBrowserPermission('unsupported')
      return
    }
    setBrowserPermission(Notification.permission)
  }, [])

  // 브라우저 알림 권한 요청
  const requestPermission = useCallback(async () => {
    const granted = await requestNotificationPermission()
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPermission(Notification.permission)
    }
    return granted
  }, [])

  const fetchNotifications = useCallback(async (options?: { limit?: number; unreadOnly?: boolean }) => {
    setLoading(true)
    setError(null)

    try {
      const authHeaders = await getAuthHeaders()

      // 로그인 안 되어 있으면 알림 조회 스킵
      if (!authHeaders['Authorization']) {
        setNotifications([])
        setUnreadCount(0)
        setLoading(false)
        return
      }

      const params = new URLSearchParams()
      if (options?.limit) params.set('limit', String(options.limit))
      if (options?.unreadOnly) params.set('unread_only', 'true')

      const response = await fetch(`/api/notifications?${params.toString()}`, {
        headers: authHeaders
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch notifications')
      }

      const data = await response.json()
      const newNotifications: PartyNotification[] = data.notifications

      // 새로운 알림이 있으면 브라우저 알림 표시 (첫 로드 제외, 알림 활성화 시에만)
      if (!isFirstLoad.current && browserPermission === 'granted' && getNotificationEnabled()) {
        const newIds = new Set(newNotifications.map(n => n.id))
        newNotifications.forEach(notification => {
          // 이전에 없던 알림이고 읽지 않은 알림인 경우
          if (!prevNotificationIds.current.has(notification.id) && !notification.is_read) {
            showBrowserNotification(
              notification.title,
              notification.message || '',
              notification.party_id
            )
          }
        })
        prevNotificationIds.current = newIds
      } else if (isFirstLoad.current) {
        // 첫 로드 시 ID만 저장 (알림 표시하지 않음)
        prevNotificationIds.current = new Set(newNotifications.map(n => n.id))
        isFirstLoad.current = false
      }

      setNotifications(newNotifications)
      setUnreadCount(data.unread_count)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [browserPermission])

  useEffect(() => {
    if (autoFetch) {
      fetchNotifications()
    }
  }, [autoFetch, fetchNotifications])

  // 읽음 처리
  const markAsRead = useCallback(async (notificationId: string) => {
    const authHeaders = await getAuthHeaders()
    const response = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify({ notification_id: notificationId })
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to mark as read')
    }

    // 로컬 상태 업데이트
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))

    return response.json()
  }, [])

  // 모두 읽음 처리
  const markAllAsRead = useCallback(async () => {
    const authHeaders = await getAuthHeaders()
    const response = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify({ mark_all_read: true })
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to mark all as read')
    }

    // 로컬 상태 업데이트
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)

    return response.json()
  }, [])

  // 알림 삭제
  const deleteNotification = useCallback(async (notificationId: string) => {
    const authHeaders = await getAuthHeaders()
    const response = await fetch(`/api/notifications?id=${notificationId}`, {
      method: 'DELETE',
      headers: authHeaders
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to delete notification')
    }

    // 로컬 상태 업데이트
    const deletedNotification = notifications.find(n => n.id === notificationId)
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
    if (deletedNotification && !deletedNotification.is_read) {
      setUnreadCount(prev => Math.max(0, prev - 1))
    }

    return response.json()
  }, [notifications])

  // 모든 알림 삭제
  const deleteAllNotifications = useCallback(async () => {
    const authHeaders = await getAuthHeaders()
    const response = await fetch('/api/notifications?all=true', {
      method: 'DELETE',
      headers: authHeaders
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to delete all notifications')
    }

    setNotifications([])
    setUnreadCount(0)

    return response.json()
  }, [])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    browserPermission,
    notificationsEnabled,
    requestPermission,
    toggleNotifications,
    refresh: fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications
  }
}
