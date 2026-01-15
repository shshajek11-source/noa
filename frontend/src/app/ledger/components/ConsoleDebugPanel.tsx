'use client'

import { useState, useEffect, useRef } from 'react'

interface LogEntry {
  type: 'log' | 'error' | 'warn' | 'info'
  timestamp: string
  message: string
}

export default function ConsoleDebugPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isOpen, setIsOpen] = useState(true)
  const [isMinimized, setIsMinimized] = useState(false)
  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 원본 console 메서드 저장
    const originalLog = console.log
    const originalError = console.error
    const originalWarn = console.warn
    const originalInfo = console.info

    const addLog = (type: LogEntry['type'], ...args: any[]) => {
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2)
          } catch {
            return String(arg)
          }
        }
        return String(arg)
      }).join(' ')

      // 특정 키워드가 포함된 로그만 캡처
      if (message.includes('ItemManagementTab') ||
          message.includes('useLedgerItems') ||
          message.includes('ledger') ||
          message.includes('item') ||
          message.includes('Error') ||
          message.includes('error')) {
        setLogs(prev => [...prev.slice(-100), {
          type,
          timestamp: new Date().toLocaleTimeString(),
          message
        }])
      }
    }

    // console 메서드 오버라이드
    console.log = (...args) => {
      originalLog.apply(console, args)
      addLog('log', ...args)
    }
    console.error = (...args) => {
      originalError.apply(console, args)
      addLog('error', ...args)
    }
    console.warn = (...args) => {
      originalWarn.apply(console, args)
      addLog('warn', ...args)
    }
    console.info = (...args) => {
      originalInfo.apply(console, args)
      addLog('info', ...args)
    }

    // 클린업
    return () => {
      console.log = originalLog
      console.error = originalError
      console.warn = originalWarn
      console.info = originalInfo
    }
  }, [])

  // 자동 스크롤
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const copyLogs = () => {
    const text = logs.map(l => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`).join('\n')
    navigator.clipboard.writeText(text)
    alert('로그가 클립보드에 복사되었습니다!')
  }

  const clearLogs = () => {
    setLogs([])
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '80px',
          right: '20px',
          padding: '8px 16px',
          background: '#1F2937',
          color: '#FACC15',
          border: '1px solid #374151',
          borderRadius: '8px',
          cursor: 'pointer',
          zIndex: 9999,
          fontSize: '12px'
        }}
      >
        🐛 Debug
      </button>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '20px',
        width: isMinimized ? '200px' : '500px',
        height: isMinimized ? '40px' : '400px',
        background: '#0D1117',
        border: '1px solid #30363D',
        borderRadius: '8px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'monospace',
        fontSize: '11px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          background: '#161B22',
          borderBottom: '1px solid #30363D',
          borderRadius: '8px 8px 0 0'
        }}
      >
        <span style={{ color: '#FACC15', fontWeight: 'bold' }}>🐛 Debug Console ({logs.length})</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={copyLogs}
            style={{
              padding: '4px 8px',
              background: '#238636',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px'
            }}
          >
            📋 복사
          </button>
          <button
            onClick={clearLogs}
            style={{
              padding: '4px 8px',
              background: '#6E7681',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px'
            }}
          >
            🗑️ 지우기
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            style={{
              padding: '4px 8px',
              background: '#30363D',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px'
            }}
          >
            {isMinimized ? '▲' : '▼'}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              padding: '4px 8px',
              background: '#DA3633',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px'
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* 로그 영역 */}
      {!isMinimized && (
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '8px'
          }}
        >
          {logs.length === 0 ? (
            <div style={{ color: '#6E7681', textAlign: 'center', marginTop: '20px' }}>
              아이템 등록 관련 로그가 여기에 표시됩니다
            </div>
          ) : (
            logs.map((log, i) => (
              <div
                key={i}
                style={{
                  padding: '4px 0',
                  borderBottom: '1px solid #21262D',
                  color: log.type === 'error' ? '#F85149' :
                         log.type === 'warn' ? '#D29922' :
                         log.type === 'info' ? '#58A6FF' : '#C9D1D9',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all'
                }}
              >
                <span style={{ color: '#6E7681' }}>[{log.timestamp}]</span>{' '}
                <span style={{
                  color: log.type === 'error' ? '#F85149' :
                         log.type === 'warn' ? '#D29922' : '#238636',
                  fontWeight: 'bold'
                }}>
                  [{log.type.toUpperCase()}]
                </span>{' '}
                {log.message}
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      )}
    </div>
  )
}
