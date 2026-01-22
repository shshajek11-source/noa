'use client'

import { useState, useRef, useEffect } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { getRelativeTime } from '@/types/party'
import styles from './NotificationBell.module.css'

export default function NotificationBell() {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    browserPermission,
    notificationsEnabled,
    requestPermission,
    toggleNotifications,
    refresh
  } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 30초마다 알림 새로고침 (브라우저 알림 트리거용) - 알림이 활성화된 경우에만
  useEffect(() => {
    if (!notificationsEnabled) return
    const interval = setInterval(() => {
      refresh()
    }, 30000)
    return () => clearInterval(interval)
  }, [refresh, notificationsEnabled])

  const handleNotificationClick = async (notificationId: string, partyId?: string) => {
    await markAsRead(notificationId)
    setIsOpen(false)
    if (partyId) {
      window.location.href = `/party/${partyId}`
    }
  }

  const handleRequestPermission = async () => {
    await requestPermission()
  }

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        className={styles.bellButton}
        onClick={() => setIsOpen(!isOpen)}
      >
        🔔
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <span>알림</span>
            <div className={styles.headerActions}>
              {unreadCount > 0 && (
                <button
                  className={styles.markAllRead}
                  onClick={() => markAllAsRead()}
                >
                  모두 읽음
                </button>
              )}
            </div>
          </div>

          {/* 알림 설정 토글 */}
          <div className={styles.settingsRow}>
            <span>알림 받기</span>
            <button
              className={`${styles.toggleSwitch} ${notificationsEnabled ? styles.toggleOn : ''}`}
              onClick={() => toggleNotifications()}
              title={notificationsEnabled ? '알림 끄기' : '알림 켜기'}
            >
              <span className={styles.toggleKnob} />
            </button>
          </div>

          {/* 브라우저 알림 권한 요청 배너 - 알림이 활성화되어 있고 권한이 없을 때만 */}
          {notificationsEnabled && browserPermission === 'default' && (
            <div className={styles.permissionBanner}>
              <span>브라우저 알림을 받으시겠습니까?</span>
              <button
                className={styles.permissionButton}
                onClick={handleRequestPermission}
              >
                허용
              </button>
            </div>
          )}

          <div className={styles.dropdownContent}>
            {!notificationsEnabled ? (
              <div className={styles.empty}>알림이 꺼져 있습니다.</div>
            ) : loading ? (
              <div className={styles.loading}>불러오는 중...</div>
            ) : notifications.length === 0 ? (
              <div className={styles.empty}>알림이 없습니다.</div>
            ) : (
              notifications.slice(0, 10).map(notification => (
                <div
                  key={notification.id}
                  className={`${styles.notificationItem} ${!notification.is_read ? styles.unread : ''}`}
                  onClick={() => handleNotificationClick(notification.id, notification.party_id)}
                >
                  <div className={styles.notificationTitle}>{notification.title}</div>
                  <div className={styles.notificationMessage}>{notification.message}</div>
                  <div className={styles.notificationTime}>
                    {getRelativeTime(notification.created_at)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
