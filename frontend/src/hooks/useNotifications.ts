'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { PartyNotification } from '@/types/party'

// device_id 헬퍼 (ledger_device_id 사용)
function getDeviceId(): string {
  let deviceId = localStorage.getItem('ledger_device_id')
  if (!deviceId) {
    deviceId = crypto.randomUUID()
    localStorage.setItem('ledger_device_id', deviceId)
  }
  return deviceId
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
  const prevNotificationIds = useRef<Set<string>>(new Set())
  const isFirstLoad = useRef(true)

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
      const deviceId = getDeviceId()
      const params = new URLSearchParams()
      if (options?.limit) params.set('limit', String(options.limit))
      if (options?.unreadOnly) params.set('unread_only', 'true')

      const response = await fetch(`/api/notifications?${params.toString()}`, {
        headers: {
          'X-Device-ID': deviceId
        }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch notifications')
      }

      const data = await response.json()
      const newNotifications: PartyNotification[] = data.notifications

      // 새로운 알림이 있으면 브라우저 알림 표시 (첫 로드 제외)
      if (!isFirstLoad.current && browserPermission === 'granted') {
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
    const deviceId = getDeviceId()
    const response = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-ID': deviceId
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
    const deviceId = getDeviceId()
    const response = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-ID': deviceId
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
    const deviceId = getDeviceId()
    const response = await fetch(`/api/notifications?id=${notificationId}`, {
      method: 'DELETE',
      headers: {
        'X-Device-ID': deviceId
      }
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
    const deviceId = getDeviceId()
    const response = await fetch('/api/notifications?all=true', {
      method: 'DELETE',
      headers: {
        'X-Device-ID': deviceId
      }
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
    requestPermission,
    refresh: fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications
  }
}
