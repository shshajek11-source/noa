'use client'

import { useState, useEffect, useRef } from 'react'

interface UpdateSettings {
    batchSize: number
    interval: number
    serverFilter: string
    raceFilter: string
    autoRunInterval: number
}

interface UpdateStatus {
    total: number
    updated: number
    pending: number
}

export default function AutoUpdatePanel() {
    const [isRunning, setIsRunning] = useState(false)
    const [autoMode, setAutoMode] = useState(false)
    const [status, setStatus] = useState<UpdateStatus>({ total: 0, updated: 0, pending: 0 })
    const [progress, setProgress] = useState<string[]>([])
    const [settings, setSettings] = useState<UpdateSettings>({
        batchSize: 10,
        interval: 1,
        serverFilter: 'all',
        raceFilter: 'all',
        autoRunInterval: 0
    })
    const [showSettings, setShowSettings] = useState(false)

    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const autoIntervalRef = useRef<NodeJS.Timeout | null>(null)

    const fetchStatus = async () => {
        try {
            const res = await fetch('/api/admin/bulk-update')
            const data = await res.json()
            setStatus(data)
        } catch (err) {
            console.error('Failed to fetch status:', err)
        }
    }

    useEffect(() => {
        fetchStatus()
    }, [])

    const runBatchUpdate = async () => {
        try {
            const res = await fetch('/api/admin/bulk-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update',
                    batchSize: settings.batchSize,
                    serverFilter: settings.serverFilter,
                    raceFilter: settings.raceFilter
                })
            })

            const data = await res.json()

            if (data.results) {
                const successNames = data.results
                    .filter((r: any) => r.success)
                    .map((r: any) => r.name)
                    .join(', ')

                if (successNames) {
                    addLog(`✅ ${successNames}`)
                }
            }

            setStatus(prev => ({
                ...prev,
                updated: prev.updated + (data.updated || 0),
                pending: data.remaining || 0
            }))

            return data.remaining > 0
        } catch (err: any) {
            addLog(`❌ ${err.message}`)
            return false
        }
    }

    const addLog = (message: string) => {
        const time = new Date().toLocaleTimeString()
        setProgress(prev => [`[${time}] ${message}`, ...prev.slice(0, 49)])
    }

    const toggleUpdate = async () => {
        if (isRunning) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
            setIsRunning(false)
            addLog('⏹️ 중지됨')
        } else {
            setIsRunning(true)
            addLog('▶️ 시작...')

            const runLoop = async () => {
                const hasMore = await runBatchUpdate()
                if (!hasMore) {
                    setIsRunning(false)
                    if (intervalRef.current) {
                        clearInterval(intervalRef.current)
                        intervalRef.current = null
                    }
                    addLog('✨ 완료!')
                }
            }

            await runLoop()
            intervalRef.current = setInterval(runLoop, settings.interval * 1000)
        }
    }

    const toggleAutoMode = () => {
        if (autoMode) {
            if (autoIntervalRef.current) {
                clearInterval(autoIntervalRef.current)
                autoIntervalRef.current = null
            }
            setAutoMode(false)
            addLog('🔴 자동 비활성화')
        } else {
            if (settings.autoRunInterval <= 0) {
                alert('자동 실행 간격을 설정해주세요')
                return
            }
            setAutoMode(true)
            addLog(`🟢 자동 활성화 (${settings.autoRunInterval}분)`)

            runBatchUpdate()

            autoIntervalRef.current = setInterval(() => {
                addLog('🔄 자동 실행...')
                runBatchUpdate()
            }, settings.autoRunInterval * 60 * 1000)
        }
    }

    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
            if (autoIntervalRef.current) clearInterval(autoIntervalRef.current)
        }
    }, [])

    const progressPercent = status.total > 0 ? Math.round((status.updated / status.total) * 100) : 0

    const selectStyle: React.CSSProperties = {
        width: '100%',
        padding: '0.4rem 0.5rem',
        background: '#0D0F14',
        border: '1px solid var(--brand-red-muted)',
        borderRadius: '4px',
        color: 'var(--text-main)',
        fontSize: '0.75rem',
        outline: 'none'
    }

    return (
        <div style={{
            background: '#111318',
            border: '1px solid var(--brand-red-muted)',
            borderRadius: '8px',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
        }}>
            {/* 헤더 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{
                    margin: 0,
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    color: 'var(--brand-white)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <span style={{
                        width: '3px',
                        height: '14px',
                        background: 'var(--brand-red-main)',
                        display: 'inline-block',
                        borderRadius: '2px'
                    }}></span>
                    데이터 업데이트
                </h3>
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    style={{
                        background: showSettings ? 'var(--brand-red-main)' : 'transparent',
                        border: '1px solid var(--brand-red-muted)',
                        borderRadius: '4px',
                        padding: '0.25rem 0.5rem',
                        color: showSettings ? 'white' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        transition: 'all 0.2s'
                    }}
                >
                    ⚙️ 설정
                </button>
            </div>

            {/* 진행률 */}
            <div>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.7rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '0.4rem'
                }}>
                    <span>{status.updated.toLocaleString()} / {status.total.toLocaleString()}</span>
                    <span style={{ color: 'var(--brand-red-main)', fontWeight: 'bold' }}>{progressPercent}%</span>
                </div>
                <div style={{
                    height: '6px',
                    background: '#0D0F14',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    border: '1px solid var(--brand-red-muted)'
                }}>
                    <div style={{
                        height: '100%',
                        width: `${progressPercent}%`,
                        background: 'linear-gradient(90deg, var(--brand-red-main), var(--brand-red-dark))',
                        transition: 'width 0.3s ease',
                        boxShadow: '0 0 10px var(--brand-red-main)'
                    }} />
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-disabled)', marginTop: '0.25rem' }}>
                    대기: {status.pending.toLocaleString()}개
                </div>
            </div>

            {/* 설정 패널 */}
            {showSettings && (
                <div style={{
                    background: '#0D0F14',
                    border: '1px solid var(--brand-red-muted)',
                    borderRadius: '6px',
                    padding: '0.75rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '0.5rem'
                }}>
                    <div>
                        <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
                            배치 크기
                        </label>
                        <select
                            value={settings.batchSize}
                            onChange={e => setSettings({ ...settings, batchSize: Number(e.target.value) })}
                            disabled={isRunning}
                            style={selectStyle}
                        >
                            <option value={5}>5개</option>
                            <option value={10}>10개</option>
                            <option value={20}>20개</option>
                            <option value={50}>50개</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
                            실행 간격
                        </label>
                        <select
                            value={settings.interval}
                            onChange={e => setSettings({ ...settings, interval: Number(e.target.value) })}
                            disabled={isRunning}
                            style={selectStyle}
                        >
                            <option value={1}>1초</option>
                            <option value={2}>2초</option>
                            <option value={5}>5초</option>
                            <option value={10}>10초</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
                            서버 필터
                        </label>
                        <select
                            value={settings.serverFilter}
                            onChange={e => setSettings({ ...settings, serverFilter: e.target.value })}
                            disabled={isRunning}
                            style={selectStyle}
                        >
                            <option value="all">전체</option>
                            <option value="1001">시엘</option>
                            <option value="2002">지켈</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
                            자동 간격
                        </label>
                        <select
                            value={settings.autoRunInterval}
                            onChange={e => setSettings({ ...settings, autoRunInterval: Number(e.target.value) })}
                            disabled={autoMode}
                            style={selectStyle}
                        >
                            <option value={0}>비활성화</option>
                            <option value={5}>5분</option>
                            <option value={10}>10분</option>
                            <option value={30}>30분</option>
                            <option value={60}>1시간</option>
                        </select>
                    </div>
                </div>
            )}

            {/* 버튼 */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                    onClick={toggleUpdate}
                    style={{
                        flex: 1,
                        padding: '0.5rem',
                        background: isRunning ? 'var(--danger)' : 'var(--brand-red-main)',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        transition: 'all 0.2s'
                    }}
                >
                    {isRunning ? '⏹️ 중지' : '▶️ 수동'}
                </button>

                <button
                    onClick={toggleAutoMode}
                    style={{
                        flex: 1,
                        padding: '0.5rem',
                        background: autoMode ? 'var(--danger)' : 'rgba(217, 43, 75, 0.2)',
                        border: `1px solid ${autoMode ? 'var(--danger)' : 'var(--brand-red-muted)'}`,
                        borderRadius: '6px',
                        color: 'white',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        transition: 'all 0.2s'
                    }}
                >
                    {autoMode ? '🔴 자동 중지' : '🟢 자동'}
                </button>

                <button
                    onClick={fetchStatus}
                    style={{
                        padding: '0.5rem 0.75rem',
                        background: 'transparent',
                        border: '1px solid var(--brand-red-muted)',
                        borderRadius: '6px',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        transition: 'all 0.2s'
                    }}
                >
                    🔃
                </button>
            </div>

            {/* 로그 */}
            {progress.length > 0 && (
                <div style={{
                    background: '#0D0F14',
                    border: '1px solid var(--brand-red-muted)',
                    borderRadius: '6px',
                    padding: '0.5rem',
                    maxHeight: '120px',
                    overflowY: 'auto',
                    fontSize: '0.65rem',
                    fontFamily: 'monospace',
                    color: 'var(--text-secondary)'
                }}>
                    {progress.map((log, i) => (
                        <div key={i} style={{
                            marginBottom: '0.15rem',
                            paddingBottom: '0.15rem',
                            borderBottom: i < progress.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none'
                        }}>{log}</div>
                    ))}
                </div>
            )}
        </div>
    )
}
