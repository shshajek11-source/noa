'use client'

import { useState, useEffect } from 'react'
import { Copy, X, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import styles from './DebugPanel.module.css'

interface DebugLog {
  timestamp: string
  type: 'info' | 'error' | 'success' | 'warning'
  message: string
  data?: any
}

const STORAGE_KEY = 'debug_panel_logs'

export default function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [logs, setLogs] = useState<DebugLog[]>([])
  const [copied, setCopied] = useState(false)
  const [isClient, setIsClient] = useState(false)

  // 클라이언트에서만 localStorage 읽기 (hydration 에러 방지)
  useEffect(() => {
    setIsClient(true)
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          setLogs(JSON.parse(saved))
        }
      } catch (e) {
        console.error('Failed to load logs from localStorage:', e)
      }
    }
  }, [])

  const [showServerLogs, setShowServerLogs] = useState(false)

  // 환경 정보
  const envInfo = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set',
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    currentUrl: isClient ? window.location.href : 'N/A',
    userAgent: isClient ? navigator.userAgent : 'N/A',
    deviceId: isClient ? (localStorage.getItem('ledger_device_id') || localStorage.getItem('aion2_ledger_device_id')) : null,
    authToken: isClient ? localStorage.getItem('sb-edwtbiujwjprydmahwhh-auth-token') : null
  }

  // 로그를 localStorage에 저장
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
      } catch (e) {
        console.error('Failed to save logs to localStorage:', e)
      }
    }
  }, [logs])

  // 로그 추가 함수
  const addLog = (type: DebugLog['type'], message: string, data?: any) => {
    const newLog: DebugLog = {
      timestamp: new Date().toISOString(),
      type,
      message,
      data
    }
    setLogs(prev => [newLog, ...prev].slice(0, 50)) // 최대 50개 유지
  }

  // 전역 에러 캐치
  useEffect(() => {
    // Console 로그 캐치
    const originalConsoleLog = console.log
    const originalConsoleError = console.error
    const originalConsoleWarn = console.warn

    console.log = (...args) => {
      originalConsoleLog(...args)
      if (args[0] && typeof args[0] === 'string') {
        if (args[0].startsWith('[Auth]') || args[0].startsWith('[Main Character')) {
          addLog('info', args[0], args.slice(1))
        }
      }
    }

    console.error = (...args) => {
      originalConsoleError(...args)
      if (args[0] && typeof args[0] === 'string') {
        if (args[0].startsWith('[Auth]') || args[0].startsWith('[Main Character')) {
          addLog('error', args[0], args.slice(1))
        }
      }
    }

    console.warn = (...args) => {
      originalConsoleWarn(...args)
      if (args[0] && typeof args[0] === 'string') {
        if (args[0].startsWith('[Auth]') || args[0].startsWith('[Main Character')) {
          addLog('warning', args[0], args.slice(1))
        }
      }
    }

    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const [url, options] = args
      addLog('info', `API Call: ${url}`, { method: options?.method || 'GET' })

      try {
        const response = await originalFetch(...args)
        const clonedResponse = response.clone()

        if (!response.ok) {
          const errorData = await clonedResponse.json().catch(() => ({}))
          addLog('error', `API Error: ${url}`, {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          })
        } else {
          addLog('success', `API Success: ${url}`, { status: response.status })
        }

        return response
      } catch (error: any) {
        addLog('error', `Network Error: ${url}`, {
          message: error.message,
          stack: error.stack
        })
        throw error
      }
    }

    const errorHandler = (event: ErrorEvent) => {
      addLog('error', 'Runtime Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      })
    }

    const unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      addLog('error', 'Unhandled Promise Rejection', {
        reason: event.reason
      })
    }

    window.addEventListener('error', errorHandler)
    window.addEventListener('unhandledrejection', unhandledRejectionHandler)

    return () => {
      console.log = originalConsoleLog
      console.error = originalConsoleError
      console.warn = originalConsoleWarn
      window.fetch = originalFetch
      window.removeEventListener('error', errorHandler)
      window.removeEventListener('unhandledrejection', unhandledRejectionHandler)
    }
  }, [])

  // 전체 정보 복사
  const copyAllInfo = () => {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: envInfo,
      logs: logs,
      localStorage: typeof window !== 'undefined' ? {
        keys: Object.keys(localStorage),
        ledgerDeviceId: localStorage.getItem('ledger_device_id')
      } : null
    }

    const text = JSON.stringify(debugInfo, null, 2)
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 개별 로그 복사
  const copyLog = (log: DebugLog) => {
    const text = JSON.stringify(log, null, 2)
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 로그 클리어
  const clearLogs = () => {
    setLogs([])
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  if (!isOpen) {
    return (
      <button
        className={styles.floatingButton}
        onClick={() => setIsOpen(true)}
        title="디버그 패널 열기"
      >
        <AlertCircle size={20} />
        {isClient && logs.filter(l => l.type === 'error').length > 0 && (
          <span className={styles.errorBadge}>
            {logs.filter(l => l.type === 'error').length}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className={`${styles.panel} ${isMinimized ? styles.minimized : ''}`}>
      {/* 헤더 */}
      <div className={styles.header}>
        <div className={styles.title}>
          <AlertCircle size={16} />
          디버그 패널
          {isClient && logs.filter(l => l.type === 'error').length > 0 && (
            <span className={styles.errorCount}>
              {logs.filter(l => l.type === 'error').length} 오류
            </span>
          )}
        </div>
        <div className={styles.headerButtons}>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className={styles.iconButton}
            title={isMinimized ? '확장' : '최소화'}
          >
            {isMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className={styles.iconButton}
            title="닫기"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* 환경 정보 */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>환경 정보</div>
            <div className={styles.infoGrid}>
              <div className={styles.infoRow}>
                <span className={styles.label}>Supabase URL:</span>
                <span className={styles.value}>{envInfo.supabaseUrl}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>Anon Key:</span>
                <span className={styles.value}>{envInfo.hasAnonKey ? '✓ 설정됨' : '✗ 없음'}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>Device ID:</span>
                <span className={styles.value}>{envInfo.deviceId || '없음'}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.label}>인증 상태:</span>
                <span className={styles.value}>{envInfo.authToken ? '✓ 로그인됨' : '✗ 비로그인'}</span>
              </div>
              {showServerLogs && (
                <div className={styles.infoRow}>
                  <span className={styles.label}>현재 URL:</span>
                  <span className={styles.value}>{envInfo.currentUrl}</span>
                </div>
              )}
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className={styles.actions}>
            <button onClick={copyAllInfo} className={styles.copyButton}>
              <Copy size={14} />
              {copied ? '복사됨!' : '전체 복사'}
            </button>
            <button onClick={() => setShowServerLogs(!showServerLogs)} className={styles.clearButton}>
              {showServerLogs ? '간단히 보기' : '상세히 보기'}
            </button>
            <button onClick={clearLogs} className={styles.clearButton}>
              로그 지우기
            </button>
          </div>

          {/* 로그 목록 */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              로그 ({logs.length})
              {' '}
              <span style={{ fontSize: '10px', fontWeight: 'normal', color: '#6b7280' }}>
                (텍스트 드래그로 복사 가능)
              </span>
            </div>
            <div className={styles.logList}>
              {logs.length === 0 && (
                <div className={styles.emptyState}>로그가 없습니다</div>
              )}
              {logs.filter(log => showServerLogs || log.type === 'error' || log.message.includes('Main Character')).map((log, idx) => (
                <div key={idx} className={`${styles.logItem} ${styles[log.type]}`}>
                  <div className={styles.logHeader}>
                    <span className={styles.logType}>{log.type.toUpperCase()}</span>
                    <span className={styles.logTime}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <button
                      onClick={() => copyLog(log)}
                      className={styles.copyLogButton}
                      title="이 로그 복사"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                  <div className={styles.logMessage}>{log.message}</div>
                  {log.data && (
                    <pre className={styles.logData}>
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
