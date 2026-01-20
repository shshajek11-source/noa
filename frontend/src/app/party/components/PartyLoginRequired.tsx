'use client'

import { useState } from 'react'
import styles from './PartyLoginRequired.module.css'

interface PartyLoginRequiredProps {
  onLogin: () => Promise<void>
  isLoading?: boolean
}

export default function PartyLoginRequired({ onLogin, isLoading }: PartyLoginRequiredProps) {
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const handleLogin = async () => {
    setIsLoggingIn(true)
    try {
      await onLogin()
    } catch (err) {
      console.error('Login failed:', err)
    } finally {
      setIsLoggingIn(false)
    }
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingSpinner} />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.lockIcon}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h2 className={styles.title}>로그인이 필요합니다</h2>
        <p className={styles.description}>
          파티 모집 캐릭터를 등록하려면<br />
          Google 로그인이 필요합니다.
        </p>

        <button
          className={styles.googleButton}
          onClick={handleLogin}
          disabled={isLoggingIn}
        >
          {isLoggingIn ? (
            <span className={styles.buttonLoading}>로그인 중...</span>
          ) : (
            <>
              <svg className={styles.googleIcon} viewBox="0 0 24 24" width="20" height="20">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Google 로그인</span>
            </>
          )}
        </button>

        <div className={styles.divider}>
          <span>로그인하면</span>
        </div>

        <ul className={styles.features}>
          <li>
            <span className={styles.checkIcon}>✓</span>
            <span>내 캐릭터를 파티 모집에 등록</span>
          </li>
          <li>
            <span className={styles.checkIcon}>✓</span>
            <span>여러 기기에서 캐릭터 동기화</span>
          </li>
          <li>
            <span className={styles.checkIcon}>✓</span>
            <span>등록된 캐릭터 정보 저장</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
