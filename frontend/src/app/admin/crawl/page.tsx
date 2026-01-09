'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { SERVERS } from '../../constants/servers'
import DSCard from '../../components/design-system/DSCard'
import DSButton from '../../components/design-system/DSButton'
import DSBadge from '../../components/design-system/DSBadge'
import SettingsPanel from './components/SettingsPanel'
import MonitoringPanel from './components/MonitoringPanel'
import HistoryPanel from './components/HistoryPanel'
import {
    CrawlSettings,
    CrawlProgress,
    CrawlStats,
    CrawlCheckpoint,
    CrawlHistory,
    DEFAULT_SETTINGS,
    CONTENT_TYPES
} from './types'

// Storage keys
const STORAGE_KEYS = {
    settings: 'crawl_settings',
    checkpoint: 'crawl_checkpoint',
    history: 'crawl_history',
    dailyRequests: 'crawl_daily_requests'
}

// Content Toggle Button
function ContentToggle({ content, selected, disabled, onToggle }: {
    content: typeof CONTENT_TYPES[0]
    selected: boolean
    disabled: boolean
    onToggle: () => void
}) {
    return (
        <button
            onClick={onToggle}
            disabled={disabled}
            style={{
                padding: '0.5rem 0.75rem',
                background: selected
                    ? `linear-gradient(135deg, ${content.color}20, ${content.color}10)`
                    : 'rgba(255,255,255,0.02)',
                color: selected ? content.color : 'var(--text-secondary)',
                border: `1px solid ${selected ? content.color : 'var(--border)'}`,
                borderRadius: '6px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontSize: '0.75rem',
                fontWeight: selected ? 600 : 400,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s',
                opacity: disabled ? 0.5 : 1
            }}
        >
            <span style={{ fontSize: '0.9rem' }}>{content.icon}</span>
            {content.name}
        </button>
    )
}

// Radio Option
function RadioOption({ label, checked, disabled, onChange }: {
    label: string
    checked: boolean
    disabled: boolean
    onChange: () => void
}) {
    return (
        <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: disabled ? 'not-allowed' : 'pointer',
            color: checked ? 'var(--brand-white)' : 'var(--text-secondary)',
            fontSize: '0.8rem',
            padding: '0.4rem 0.6rem',
            background: checked ? 'rgba(217, 43, 75, 0.1)' : 'transparent',
            borderRadius: '6px',
            border: `1px solid ${checked ? 'var(--brand-red-muted)' : 'transparent'}`,
            transition: 'all 0.2s',
            opacity: disabled ? 0.5 : 1
        }}>
            <input
                type="radio"
                name="serverFilter"
                checked={checked}
                onChange={onChange}
                disabled={disabled}
                style={{ accentColor: 'var(--brand-red-main)' }}
            />
            {label}
        </label>
    )
}

// Log Panel
function LogPanel({ logs }: { logs: string[] }) {
    const logRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = 0
        }
    }, [logs])

    return (
        <div
            ref={logRef}
            style={{
                background: '#0A0B0E',
                borderRadius: '8px',
                padding: '0.75rem',
                height: '200px',
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: '0.7rem',
                border: '1px solid var(--border)'
            }}
        >
            {logs.length > 0 ? logs.map((log, i) => (
                <div key={i} style={{
                    marginBottom: '0.2rem',
                    color: log.startsWith('🟢') ? '#34D399'
                        : log.startsWith('🔴') ? '#EF4444'
                            : log.startsWith('🟡') ? '#FBBF24'
                                : log.startsWith('🔵') ? '#3B82F6'
                                    : '#D1D5DB',
                    lineHeight: 1.4
                }}>
                    {log}
                </div>
            )) : (
                <div style={{
                    color: 'var(--text-disabled)',
                    textAlign: 'center',
                    marginTop: '70px'
                }}>
                    로그가 없습니다. 크롤링을 시작하세요.
                </div>
            )}
        </div>
    )
}

export default function CrawlPage() {
    // Settings State
    const [settings, setSettings] = useState<CrawlSettings>(DEFAULT_SETTINGS)
    const [showSettings, setShowSettings] = useState(false)

    // Selection State
    const [selectedContents, setSelectedContents] = useState<number[]>([1])
    const [serverFilter, setServerFilter] = useState<'all' | 'elyos' | 'asmodian'>('all')

    // Progress State
    const [isRunning, setIsRunning] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const [progress, setProgress] = useState<CrawlProgress>({
        current: 0,
        total: 0,
        percentage: 0,
        startTime: null,
        estimatedEndTime: null
    })
    const [stats, setStats] = useState<CrawlStats>({
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        retries: 0,
        totalRequests: 0,
        successRate: 100
    })
    const [currentTask, setCurrentTask] = useState('')
    const [currentDelay, setCurrentDelay] = useState(1000)
    const [logs, setLogs] = useState<string[]>([])

    // Checkpoint & History
    const [checkpoint, setCheckpoint] = useState<CrawlCheckpoint | null>(null)
    const [history, setHistory] = useState<CrawlHistory[]>([])

    // Refs for async control
    const abortRef = useRef(false)
    const pauseRef = useRef(false)
    const consecutiveErrorsRef = useRef(0)
    const dailyRequestsRef = useRef(0)
    const autoRunIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const scheduledTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Load settings from localStorage
    useEffect(() => {
        const savedSettings = localStorage.getItem(STORAGE_KEYS.settings)
        if (savedSettings) {
            try {
                setSettings(JSON.parse(savedSettings))
            } catch { }
        }

        const savedCheckpoint = localStorage.getItem(STORAGE_KEYS.checkpoint)
        if (savedCheckpoint) {
            try {
                setCheckpoint(JSON.parse(savedCheckpoint))
            } catch { }
        }

        const savedHistory = localStorage.getItem(STORAGE_KEYS.history)
        if (savedHistory) {
            try {
                setHistory(JSON.parse(savedHistory))
            } catch { }
        }

        // Reset daily requests if new day
        const savedDaily = localStorage.getItem(STORAGE_KEYS.dailyRequests)
        if (savedDaily) {
            const { date, count } = JSON.parse(savedDaily)
            if (date === new Date().toDateString()) {
                dailyRequestsRef.current = count
            }
        }
    }, [])

    // Save settings to localStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings))
    }, [settings])

    // Save history to localStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history.slice(0, 50)))
    }, [history])

    // Setup auto-run and scheduled run
    useEffect(() => {
        // Clear existing intervals
        if (autoRunIntervalRef.current) clearInterval(autoRunIntervalRef.current)
        if (scheduledTimeoutRef.current) clearTimeout(scheduledTimeoutRef.current)

        // Auto-run interval
        if (settings.schedule.autoRunEnabled && !isRunning) {
            autoRunIntervalRef.current = setInterval(() => {
                if (!isRunning && !isPaused) {
                    addLog('🔄 자동 실행 시작...', 'info')
                    handleStartCrawl()
                }
            }, settings.schedule.autoRunInterval * 60 * 1000)
        }

        // Scheduled run
        if (settings.schedule.repeatEnabled) {
            const now = new Date()
            const [hours, minutes] = settings.schedule.scheduledTime.split(':').map(Number)
            const scheduledDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes)

            if (scheduledDate <= now) {
                scheduledDate.setDate(scheduledDate.getDate() + 1)
            }

            const msUntilScheduled = scheduledDate.getTime() - now.getTime()

            scheduledTimeoutRef.current = setTimeout(() => {
                if (!isRunning && !isPaused) {
                    addLog('⏰ 예약 실행 시작...', 'info')
                    handleStartCrawl()
                }
            }, msUntilScheduled)
        }

        return () => {
            if (autoRunIntervalRef.current) clearInterval(autoRunIntervalRef.current)
            if (scheduledTimeoutRef.current) clearTimeout(scheduledTimeoutRef.current)
        }
    }, [settings.schedule, isRunning, isPaused])

    const addLog = useCallback((msg: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
        const icon = type === 'success' ? '🟢' : type === 'error' ? '🔴' : type === 'warning' ? '🟡' : '🔵'
        setLogs(prev => [`${icon} [${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 199)])
    }, [])

    const getSelectedServers = useCallback(() => {
        switch (serverFilter) {
            case 'elyos':
                return SERVERS.filter(s => parseInt(s.id) < 2000).map(s => s.id)
            case 'asmodian':
                return SERVERS.filter(s => parseInt(s.id) >= 2000).map(s => s.id)
            default:
                return SERVERS.map(s => s.id)
        }
    }, [serverFilter])

    const estimateTime = useCallback(() => {
        const servers = getSelectedServers().length
        const contents = selectedContents.length
        const totalCalls = servers * contents
        const avgDelay = settings.speed.requestDelay + (settings.speed.contentCooldown / servers)
        const minutes = Math.ceil((totalCalls * avgDelay) / 60000)
        return { totalCalls, minutes }
    }, [getSelectedServers, selectedContents.length, settings.speed])

    const toggleContent = (id: number) => {
        setSelectedContents(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        )
    }

    const saveCheckpoint = (contentIndex: number, serverIndex: number) => {
        const cp: CrawlCheckpoint = {
            contentIndex,
            serverIndex,
            timestamp: Date.now(),
            selectedContents,
            selectedServers: getSelectedServers()
        }
        setCheckpoint(cp)
        localStorage.setItem(STORAGE_KEYS.checkpoint, JSON.stringify(cp))
    }

    const clearCheckpoint = () => {
        setCheckpoint(null)
        localStorage.removeItem(STORAGE_KEYS.checkpoint)
    }

    const saveDailyRequests = () => {
        localStorage.setItem(STORAGE_KEYS.dailyRequests, JSON.stringify({
            date: new Date().toDateString(),
            count: dailyRequestsRef.current
        }))
    }

    const updateStats = (key: keyof CrawlStats, increment: number = 1) => {
        setStats(prev => {
            const newStats = { ...prev, [key]: prev[key] + increment }
            const total = newStats.inserted + newStats.updated + newStats.skipped + newStats.errors
            newStats.successRate = total > 0 ? ((newStats.inserted + newStats.updated + newStats.skipped) / total) * 100 : 100
            return newStats
        })
    }

    const fetchWithRetry = async (url: string, retries: number = 0): Promise<any> => {
        try {
            const res = await fetch(url)
            const contentType = res.headers.get('content-type') || ''

            if (!contentType.includes('application/json')) {
                throw new Error('API 점검 중 (HTML 응답)')
            }

            const json = await res.json()
            consecutiveErrorsRef.current = 0
            return { success: true, data: json }
        } catch (error: any) {
            if (retries < settings.smart.retryCount) {
                updateStats('retries')
                addLog(`재시도 ${retries + 1}/${settings.smart.retryCount}...`, 'warning')
                await new Promise(r => setTimeout(r, settings.smart.retryDelay))
                return fetchWithRetry(url, retries + 1)
            }
            return { success: false, error: error.message }
        }
    }

    const handleStartCrawl = async (resumeFrom?: CrawlCheckpoint) => {
        const servers = getSelectedServers()
        if (servers.length === 0 || selectedContents.length === 0) {
            alert('서버와 컨텐츠를 선택해주세요.')
            return
        }

        // Check daily limit
        if (settings.safety.dailyRequestLimit > 0 &&
            dailyRequestsRef.current >= settings.safety.dailyRequestLimit) {
            alert('일일 요청 한도에 도달했습니다.')
            return
        }

        const { totalCalls, minutes } = estimateTime()

        if (!resumeFrom && !confirm(`${totalCalls}회 API 호출, 약 ${minutes}분 소요 예상. 시작하시겠습니까?`)) {
            return
        }

        // Reset state
        abortRef.current = false
        pauseRef.current = false
        consecutiveErrorsRef.current = 0
        setIsRunning(true)
        setIsPaused(false)
        setCurrentDelay(settings.speed.requestDelay)

        const startTime = Date.now()
        setProgress({
            current: 0,
            total: totalCalls,
            percentage: 0,
            startTime,
            estimatedEndTime: startTime + (totalCalls * settings.speed.requestDelay)
        })
        setStats({
            inserted: 0,
            updated: 0,
            skipped: 0,
            errors: 0,
            retries: 0,
            totalRequests: 0,
            successRate: 100
        })

        if (!resumeFrom) {
            setLogs([])
            clearCheckpoint()
        }

        addLog(`크롤링 시작 - ${selectedContents.length}개 컨텐츠, ${servers.length}개 서버`, 'info')

        let currentStep = resumeFrom ? (resumeFrom.contentIndex * servers.length + resumeFrom.serverIndex) : 0
        let allCharacters: any[] = []
        let currentDelayMs = settings.speed.requestDelay

        const startContentIndex = resumeFrom?.contentIndex || 0
        const startServerIndex = resumeFrom?.serverIndex || 0

        for (let ci = startContentIndex; ci < selectedContents.length; ci++) {
            const contentId = selectedContents[ci]
            const contentName = CONTENT_TYPES.find(c => c.id === contentId)?.name || `Type ${contentId}`
            addLog(`[${contentName}] 시작...`, 'info')

            const serverStartIndex = (ci === startContentIndex) ? startServerIndex : 0

            for (let si = serverStartIndex; si < servers.length; si++) {
                // Check abort
                if (abortRef.current) {
                    addLog('크롤링이 중단되었습니다.', 'warning')
                    break
                }

                // Check pause
                while (pauseRef.current && !abortRef.current) {
                    await new Promise(r => setTimeout(r, 500))
                }

                // Check daily limit
                if (settings.safety.dailyRequestLimit > 0 &&
                    dailyRequestsRef.current >= settings.safety.dailyRequestLimit) {
                    addLog('일일 요청 한도 도달, 중단합니다.', 'warning')
                    abortRef.current = true
                    break
                }

                const serverId = servers[si]
                const serverName = SERVERS.find(s => s.id === serverId)?.name || serverId

                currentStep++
                setCurrentTask(`${contentName} > ${serverName}`)

                // Update progress with estimated end time
                const elapsed = Date.now() - startTime
                const avgTimePerRequest = elapsed / currentStep
                const remainingRequests = totalCalls - currentStep
                const estimatedEnd = Date.now() + (remainingRequests * avgTimePerRequest)

                setProgress({
                    current: currentStep,
                    total: totalCalls,
                    percentage: Math.round((currentStep / totalCalls) * 100),
                    startTime,
                    estimatedEndTime: estimatedEnd
                })

                // Save checkpoint
                if (settings.smart.resumeEnabled) {
                    saveCheckpoint(ci, si)
                }

                // Make request
                const result = await fetchWithRetry(
                    `/api/admin/sync-official?serverId=${serverId}&type=${contentId}`
                )

                dailyRequestsRef.current++
                saveDailyRequests()
                updateStats('totalRequests')

                if (result.success && result.data.data) {
                    const count = result.data.data.length
                    allCharacters = [...allCharacters, ...result.data.data]
                    updateStats('inserted', count)
                    addLog(`[${contentName}] ${serverName} - ${count}건`, 'success')
                    consecutiveErrorsRef.current = 0

                    // Reset delay on success if auto-slowdown enabled
                    if (settings.smart.autoSlowdown && currentDelayMs > settings.speed.requestDelay) {
                        currentDelayMs = Math.max(settings.speed.requestDelay, currentDelayMs / settings.smart.slowdownMultiplier)
                        setCurrentDelay(Math.round(currentDelayMs))
                    }
                } else if (result.data?.count === 0 || result.data?.message === 'No characters found') {
                    updateStats('skipped')
                    addLog(`[${contentName}] ${serverName} - 데이터 없음`, 'warning')
                } else {
                    updateStats('errors')
                    consecutiveErrorsRef.current++
                    addLog(`[${contentName}] ${serverName} - ${result.error || '알 수 없는 오류'}`, 'error')

                    // Auto slowdown on error
                    if (settings.smart.autoSlowdown) {
                        currentDelayMs = Math.min(5000, currentDelayMs * settings.smart.slowdownMultiplier)
                        setCurrentDelay(Math.round(currentDelayMs))
                        addLog(`속도 조절: ${Math.round(currentDelayMs)}ms`, 'info')
                    }

                    // Check consecutive errors
                    if (consecutiveErrorsRef.current >= settings.safety.maxConsecutiveErrors) {
                        if (settings.safety.pauseOnError) {
                            pauseRef.current = true
                            setIsPaused(true)
                            addLog(`연속 ${settings.safety.maxConsecutiveErrors}회 에러, 일시정지`, 'error')
                        } else {
                            abortRef.current = true
                            addLog(`연속 ${settings.safety.maxConsecutiveErrors}회 에러, 중단`, 'error')
                            break
                        }
                    }
                }

                // Delay between requests
                await new Promise(r => setTimeout(r, currentDelayMs))
            }

            if (abortRef.current) break

            // Content cooldown
            if (ci < selectedContents.length - 1) {
                await new Promise(r => setTimeout(r, settings.speed.contentCooldown))
            }
        }

        // Finish
        const endTime = Date.now()
        const finalStats = { ...stats }

        // Save to history
        const historyEntry: CrawlHistory = {
            id: Date.now().toString(),
            startTime,
            endTime,
            status: abortRef.current ? 'stopped' : 'completed',
            stats: finalStats,
            settings
        }
        setHistory(prev => [historyEntry, ...prev.slice(0, 49)])

        clearCheckpoint()
        setIsRunning(false)
        setIsPaused(false)
        setCurrentTask('')

        addLog(`크롤링 ${abortRef.current ? '중단' : '완료'}! 총 ${allCharacters.length}건 수집`, abortRef.current ? 'warning' : 'success')
    }

    const handlePauseCrawl = () => {
        pauseRef.current = !pauseRef.current
        setIsPaused(pauseRef.current)
        addLog(pauseRef.current ? '일시정지됨' : '재개됨', 'info')
    }

    const handleStopCrawl = () => {
        if (confirm('크롤링을 중단하시겠습니까?')) {
            abortRef.current = true
            pauseRef.current = false
            addLog('중단 요청됨...', 'warning')
        }
    }

    const handleEmergencyStop = () => {
        abortRef.current = true
        pauseRef.current = false
        setIsRunning(false)
        setIsPaused(false)
        addLog('🚨 긴급 중단!', 'error')
    }

    const handleResume = () => {
        if (checkpoint) {
            handleStartCrawl(checkpoint)
        }
    }

    const handleClearHistory = () => {
        if (confirm('크롤링 기록을 모두 삭제하시겠습니까?')) {
            setHistory([])
            localStorage.removeItem(STORAGE_KEYS.history)
        }
    }

    const { totalCalls, minutes } = estimateTime()

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Emergency Stop Banner */}
            {settings.safety.emergencyStopEnabled && isRunning && (
                <div style={{
                    background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.1))',
                    border: '1px solid #EF4444',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{ color: '#EF4444', fontWeight: 600, fontSize: '0.85rem' }}>
                        🚨 크롤링 진행 중 - 긴급 중지가 필요하면 버튼을 클릭하세요
                    </span>
                    <DSButton variant="danger" size="sm" onClick={handleEmergencyStop}>
                        ⛔ 긴급 중지
                    </DSButton>
                </div>
            )}

            {/* Resume Banner */}
            {checkpoint && !isRunning && (
                <div style={{
                    background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.1))',
                    border: '1px solid #F59E0B',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{ color: '#F59E0B', fontSize: '0.85rem' }}>
                        📌 저장된 체크포인트가 있습니다. ({new Date(checkpoint.timestamp).toLocaleString()})
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <DSButton variant="secondary" size="sm" onClick={handleResume}>
                            ▶️ 이어서 진행
                        </DSButton>
                        <DSButton variant="ghost" size="sm" onClick={clearCheckpoint}>
                            🗑️ 삭제
                        </DSButton>
                    </div>
                </div>
            )}

            {/* Selection Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {/* Content Selection */}
                <DSCard title="📦 컨텐츠 선택" hoverEffect={false} style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {CONTENT_TYPES.map(content => (
                            <ContentToggle
                                key={content.id}
                                content={content}
                                selected={selectedContents.includes(content.id)}
                                disabled={isRunning}
                                onToggle={() => toggleContent(content.id)}
                            />
                        ))}
                    </div>
                </DSCard>

                {/* Server Selection */}
                <DSCard title="🌐 서버 선택" hoverEffect={false} style={{ padding: '0.75rem' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        <RadioOption
                            label={`전체 (${SERVERS.length}개)`}
                            checked={serverFilter === 'all'}
                            disabled={isRunning}
                            onChange={() => setServerFilter('all')}
                        />
                        <RadioOption
                            label="천족 (21개)"
                            checked={serverFilter === 'elyos'}
                            disabled={isRunning}
                            onChange={() => setServerFilter('elyos')}
                        />
                        <RadioOption
                            label="마족 (21개)"
                            checked={serverFilter === 'asmodian'}
                            disabled={isRunning}
                            onChange={() => setServerFilter('asmodian')}
                        />
                    </div>
                </DSCard>
            </div>

            {/* Action Row */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(217, 43, 75, 0.15), rgba(217, 43, 75, 0.05))',
                border: '1px solid var(--brand-red-main)',
                borderRadius: '8px',
                padding: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', gap: '2rem' }}>
                    <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>예상 호출</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--brand-white)', fontFamily: 'monospace' }}>
                            {totalCalls}회
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>예상 시간</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--brand-white)', fontFamily: 'monospace' }}>
                            ~{minutes}분
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>일일 요청</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: settings.safety.dailyRequestLimit > 0 && dailyRequestsRef.current >= settings.safety.dailyRequestLimit * 0.8 ? '#F59E0B' : 'var(--brand-white)', fontFamily: 'monospace' }}>
                            {dailyRequestsRef.current}{settings.safety.dailyRequestLimit > 0 ? `/${settings.safety.dailyRequestLimit}` : ''}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <DSButton
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSettings(!showSettings)}
                    >
                        ⚙️ 설정 {showSettings ? '접기' : '펼치기'}
                    </DSButton>
                    {isRunning ? (
                        <>
                            <DSButton variant="secondary" size="sm" onClick={handlePauseCrawl}>
                                {isPaused ? '▶️ 재개' : '⏸️ 일시정지'}
                            </DSButton>
                            <DSButton variant="danger" onClick={handleStopCrawl}>
                                ⏹️ 중단
                            </DSButton>
                        </>
                    ) : (
                        <DSButton
                            variant="primary"
                            onClick={() => handleStartCrawl()}
                            disabled={selectedContents.length === 0}
                        >
                            🚀 크롤링 시작
                        </DSButton>
                    )}
                </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <SettingsPanel
                    settings={settings}
                    onChange={setSettings}
                    disabled={isRunning}
                />
            )}

            {/* Monitoring Panel */}
            {(isRunning || progress.current > 0) && (
                <MonitoringPanel
                    progress={progress}
                    stats={stats}
                    currentTask={currentTask}
                    isRunning={isRunning}
                    isPaused={isPaused}
                    currentDelay={currentDelay}
                />
            )}

            {/* Log Panel */}
            <DSCard title="📋 로그" hoverEffect={false} style={{ padding: '0.75rem' }}>
                <LogPanel logs={logs} />
            </DSCard>

            {/* History Panel */}
            <HistoryPanel history={history} onClear={handleClearHistory} />
        </div>
    )
}
