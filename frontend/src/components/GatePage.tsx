'use client'

import { useState, useEffect } from 'react'
import styles from './GatePage.module.css'

interface GatePageProps {
  children: React.ReactNode
}

// 비밀 코드 (원하는 대로 변경)
const SECRET_CODE = 'sugo2026'

export default function GatePage({ children }: GatePageProps) {
  const [isUnlocked, setIsUnlocked] = useState<boolean | null>(null)
  const [inputCode, setInputCode] = useState('')
  const [error, setError] = useState(false)
  const [glitchText, setGlitchText] = useState('ACCESS DENIED')

  // 초기 로드 시 localStorage 확인
  useEffect(() => {
    const unlocked = localStorage.getItem('sugo_gate_unlocked')
    setIsUnlocked(unlocked === 'true')
  }, [])

  // 글리치 텍스트 효과
  useEffect(() => {
    if (isUnlocked) return

    const texts = ['ACCESS DENIED', 'RESTRICTED', '접근 제한', 'CLASSIFIED', '비인가 접근', 'ERROR 403']
    let index = 0

    const interval = setInterval(() => {
      index = (index + 1) % texts.length
      setGlitchText(texts[index])
    }, 2000)

    return () => clearInterval(interval)
  }, [isUnlocked])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (inputCode.toLowerCase() === SECRET_CODE.toLowerCase()) {
      localStorage.setItem('sugo_gate_unlocked', 'true')
      setIsUnlocked(true)
    } else {
      setError(true)
      setInputCode('')
      setTimeout(() => setError(false), 1000)
    }
  }

  // 로딩 중
  if (isUnlocked === null) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingSpinner} />
      </div>
    )
  }

  // 잠금 해제됨 - 실제 사이트 표시
  if (isUnlocked) {
    return <>{children}</>
  }

  // 게이트 페이지 표시
  return (
    <div className={styles.container}>
      {/* 배경 효과 */}
      <div className={styles.scanlines} />
      <div className={styles.noise} />

      {/* 떠다니는 코드 */}
      <div className={styles.floatingCode}>
        {Array.from({ length: 20 }).map((_, i) => (
          <span key={i} style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${10 + Math.random() * 10}s`
          }}>
            {Math.random().toString(36).substring(2, 8)}
          </span>
        ))}
      </div>

      {/* 메인 컨텐츠 */}
      <div className={styles.content}>
        {/* 글리치 타이틀 */}
        <h1 className={styles.glitchTitle} data-text={glitchText}>
          {glitchText}
        </h1>

        {/* 경고 아이콘 */}
        <div className={styles.warningIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        {/* 설명 텍스트 */}
        <p className={styles.description}>
          이 사이트는 현재 <span className={styles.highlight}>비공개</span> 상태입니다.
          <br />
          접근 코드를 입력하세요.
        </p>

        {/* 입력 폼 */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={`${styles.inputWrapper} ${error ? styles.shake : ''}`}>
            <input
              type="password"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="ACCESS CODE"
              className={styles.input}
              autoFocus
            />
            <button type="submit" className={styles.submitButton}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14m-7-7l7 7-7 7" />
              </svg>
            </button>
          </div>
          {error && <p className={styles.errorText}>INVALID CODE</p>}
        </form>

        {/* 힌트 */}
        <p className={styles.hint}>
          [ 테스트 중인 서비스입니다 ]
        </p>

        {/* 하단 장식 */}
        <div className={styles.footer}>
          <span className={styles.blink}>●</span>
          <span>SUGO SECURITY SYSTEM v2.0</span>
        </div>
      </div>

      {/* 코너 장식 */}
      <div className={`${styles.corner} ${styles.topLeft}`} />
      <div className={`${styles.corner} ${styles.topRight}`} />
      <div className={`${styles.corner} ${styles.bottomLeft}`} />
      <div className={`${styles.corner} ${styles.bottomRight}`} />
    </div>
  )
}
