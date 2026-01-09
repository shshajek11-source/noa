'use client'

import { useState, useEffect, useCallback } from 'react'
import { SERVERS } from '../../constants/servers'
import {
    CollectorState,
    CollectorConfig,
    CollectorLog,
    INITIAL_COLLECTOR_STATE,
    DEFAULT_COLLECTOR_CONFIG
} from '@/types/collector'

// 상태 색상 매핑
const STATUS_COLORS: Record<string, { bg: string, border: string, text: string }> = {
    idle: { bg: 'rgba(107, 114, 128, 0.1)', border: '#6B7280', text: '#9CA3AF' },
    running: { bg: 'rgba(34, 197, 94, 0.1)', border: '#22C55E', text: '#4ADE80' },
    paused: { bg: 'rgba(245, 158, 11, 0.1)', border: '#F59E0B', text: '#FBBF24' },
    stopped: { bg: 'rgba(239, 68, 68, 0.1)', border: '#EF4444', text: '#F87171' },
    error: { bg: 'rgba(239, 68, 68, 0.2)', border: '#DC2626', text: '#FCA5A5' }
}

const STATUS_LABELS: Record<string, string> = {
    idle: '대기 중',
    running: '수집 중',
    paused: '일시정지',
    stopped: '중지됨',
    error: '오류 발생'
}

export default function CollectorPage() {
    const [state, setState] = useState<CollectorState>(INITIAL_COLLECTOR_STATE)
    const [config, setConfig] = useState<CollectorConfig>(DEFAULT_COLLECTOR_CONFIG)
    const [logs, setLogs] = useState<CollectorLog[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [showConfig, setShowConfig] = useState(false)

    // 상태 조회
    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/collector?type=status')
            const data = await res.json()
            setState(data.state)
        } catch (err) {
            console.error('Status fetch error:', err)
        }
    }, [])

    // 설정 조회
    const fetchConfig = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/collector?type=config')
            const data = await res.json()
            setConfig(data)
        } catch (err) {
            console.error('Config fetch error:', err)
        }
    }, [])

    // 로그 조회
    const fetchLogs = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/collector?type=logs')
            const data = await res.json()
            setLogs(data)
        } catch (err) {
            console.error('Logs fetch error:', err)
        }
    }, [])

    // 초기 로딩 및 폴링
    useEffect(() => {
        fetchStatus()
        fetchConfig()
        fetchLogs()

        // 3초마다 상태 업데이트
        const interval = setInterval(() => {
            fetchStatus()
            fetchLogs()
        }, 3000)

        return () => clearInterval(interval)
    }, [fetchStatus, fetchConfig, fetchLogs])

    // 제어 명령 전송
    const sendCommand = async (action: string, extraData?: any) => {
        setIsLoading(true)
        try {
            const res = await fetch('/api/admin/collector', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...extraData })
            })
            const data = await res.json()
            if (!res.ok) {
                alert(data.error || '오류가 발생했습니다')
            }
            // 즉시 상태 업데이트
            await fetchStatus()
            await fetchLogs()
        } catch (err) {
            console.error('Command error:', err)
            alert('명령 실행 중 오류가 발생했습니다')
        } finally {
            setIsLoading(false)
        }
    }

    // 설정 변경
    const updateConfig = async (newConfig: Partial<CollectorConfig>) => {
        await sendCommand('updateConfig', { config: newConfig })
        await fetchConfig()
    }

    const statusColor = STATUS_COLORS[state.status] || STATUS_COLORS.idle

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* 헤더 정보 */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '12px',
                padding: '1.25rem'
            }}>
                <h2 style={{ margin: 0, marginBottom: '0.5rem', color: '#A5B4FC', fontSize: '1rem' }}>
                    🔍 캐릭터 전체 수집기
                </h2>
                <p style={{ margin: 0, color: '#9CA3AF', fontSize: '0.85rem', lineHeight: 1.6 }}>
                    AION2 공식 사이트에서 <strong style={{ color: '#E5E7EB' }}>모든 캐릭터 정보</strong>를 자동으로 수집합니다.<br />
                    한글/영문 키워드로 검색하여 서버에 있는 캐릭터들을 데이터베이스에 저장합니다.
                </p>
            </div>

            {/* 상태 카드 */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '0.75rem'
            }}>
                {/* 현재 상태 */}
                <div style={{
                    background: statusColor.bg,
                    border: `1px solid ${statusColor.border}`,
                    borderRadius: '10px',
                    padding: '1rem',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginBottom: '0.25rem' }}>상태</div>
                    <div style={{
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        color: statusColor.text,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                    }}>
                        <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: statusColor.text,
                            animation: state.status === 'running' ? 'pulse 1.5s infinite' : 'none'
                        }} />
                        {STATUS_LABELS[state.status]}
                    </div>
                </div>

                {/* 수집된 캐릭터 */}
                <div style={{
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '10px',
                    padding: '1rem',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginBottom: '0.25rem' }}>수집된 캐릭터</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4ADE80', fontFamily: 'monospace' }}>
                        {state.totalCollected.toLocaleString()}
                    </div>
                </div>

                {/* 진행률 */}
                <div style={{
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '10px',
                    padding: '1rem',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginBottom: '0.25rem' }}>진행률</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#A5B4FC', fontFamily: 'monospace' }}>
                        {state.progress}%
                    </div>
                </div>

                {/* 남은 시간 */}
                <div style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '10px',
                    padding: '1rem',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginBottom: '0.25rem' }}>예상 남은 시간</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#FBBF24', fontFamily: 'monospace' }}>
                        {state.estimatedRemaining}
                    </div>
                </div>
            </div>

            {/* 현재 작업 */}
            {state.status === 'running' && (
                <div style={{
                    background: 'rgba(34, 197, 94, 0.05)',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                    borderRadius: '10px',
                    padding: '1rem'
                }}>
                    <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '0.5rem' }}>현재 작업</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            padding: '0.4rem 0.8rem',
                            background: 'rgba(34, 197, 94, 0.2)',
                            borderRadius: '6px',
                            color: '#4ADE80',
                            fontSize: '0.9rem',
                            fontWeight: 600
                        }}>
                            "{state.currentKeyword}"
                        </div>
                        <div style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>
                            서버: <span style={{ color: '#E5E7EB' }}>{state.currentServerName}</span>
                        </div>
                        <div style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>
                            페이지: <span style={{ color: '#E5E7EB' }}>{state.currentPage}</span>
                        </div>
                    </div>

                    {/* 진행바 */}
                    <div style={{
                        marginTop: '0.75rem',
                        height: '6px',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '3px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            width: `${state.progress}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #22C55E, #4ADE80)',
                            borderRadius: '3px',
                            transition: 'width 0.5s ease'
                        }} />
                    </div>
                </div>
            )}

            {/* 제어 버튼 */}
            <div style={{
                display: 'flex',
                gap: '0.75rem',
                padding: '1rem',
                background: '#111318',
                borderRadius: '10px',
                border: '1px solid var(--border)'
            }}>
                {state.status === 'idle' || state.status === 'stopped' || state.status === 'error' ? (
                    <button
                        onClick={() => sendCommand('start')}
                        disabled={isLoading}
                        style={{
                            flex: 1,
                            padding: '0.875rem',
                            background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            cursor: isLoading ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        ▶️ 수집 시작
                    </button>
                ) : (
                    <>
                        <button
                            onClick={() => sendCommand(state.status === 'paused' ? 'resume' : 'pause')}
                            disabled={isLoading}
                            style={{
                                flex: 1,
                                padding: '0.875rem',
                                background: state.status === 'paused'
                                    ? 'linear-gradient(135deg, #22C55E, #16A34A)'
                                    : 'linear-gradient(135deg, #F59E0B, #D97706)',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '0.95rem',
                                fontWeight: 600,
                                cursor: isLoading ? 'wait' : 'pointer'
                            }}
                        >
                            {state.status === 'paused' ? '▶️ 재개' : '⏸️ 일시정지'}
                        </button>
                        <button
                            onClick={() => sendCommand('stop')}
                            disabled={isLoading}
                            style={{
                                flex: 1,
                                padding: '0.875rem',
                                background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '0.95rem',
                                fontWeight: 600,
                                cursor: isLoading ? 'wait' : 'pointer'
                            }}
                        >
                            ⏹️ 중지
                        </button>
                    </>
                )}

                <button
                    onClick={() => setShowConfig(!showConfig)}
                    style={{
                        padding: '0.875rem 1.25rem',
                        background: 'rgba(99, 102, 241, 0.2)',
                        border: '1px solid rgba(99, 102, 241, 0.4)',
                        borderRadius: '8px',
                        color: '#A5B4FC',
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        cursor: 'pointer'
                    }}
                >
                    ⚙️ 설정
                </button>

                <button
                    onClick={() => sendCommand('reset')}
                    disabled={isLoading || state.status === 'running'}
                    style={{
                        padding: '0.875rem 1.25rem',
                        background: 'rgba(107, 114, 128, 0.2)',
                        border: '1px solid rgba(107, 114, 128, 0.4)',
                        borderRadius: '8px',
                        color: '#9CA3AF',
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        cursor: isLoading || state.status === 'running' ? 'not-allowed' : 'pointer',
                        opacity: state.status === 'running' ? 0.5 : 1
                    }}
                >
                    🔄 초기화
                </button>
            </div>

            {/* 설정 패널 */}
            {showConfig && (
                <div style={{
                    background: '#111318',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '1.25rem'
                }}>
                    <h3 style={{ margin: 0, marginBottom: '1rem', color: '#E5E7EB', fontSize: '0.95rem' }}>
                        ⚙️ 수집 설정
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        {/* 속도 설정 */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9CA3AF', fontSize: '0.8rem' }}>
                                요청 간격 (ms) - 높을수록 안전
                            </label>
                            <input
                                type="range"
                                min="1000"
                                max="10000"
                                step="500"
                                value={config.delayMs}
                                onChange={(e) => updateConfig({ delayMs: parseInt(e.target.value) })}
                                disabled={state.status === 'running'}
                                style={{ width: '100%', accentColor: '#6366F1' }}
                            />
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '0.75rem',
                                color: '#6B7280',
                                marginTop: '0.25rem'
                            }}>
                                <span>빠름 (1초)</span>
                                <span style={{ color: '#A5B4FC', fontWeight: 600 }}>{config.delayMs / 1000}초</span>
                                <span>느림 (10초)</span>
                            </div>
                        </div>

                        {/* 서버 선택 */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9CA3AF', fontSize: '0.8rem' }}>
                                대상 서버
                            </label>
                            <select
                                value={config.enabledServers.length === 0 ? 'all' : 'custom'}
                                onChange={(e) => {
                                    if (e.target.value === 'all') {
                                        updateConfig({ enabledServers: [] })
                                    }
                                }}
                                disabled={state.status === 'running'}
                                style={{
                                    width: '100%',
                                    padding: '0.6rem',
                                    background: '#1F2937',
                                    border: '1px solid #374151',
                                    borderRadius: '6px',
                                    color: '#E5E7EB',
                                    fontSize: '0.85rem'
                                }}
                            >
                                <option value="all">전체 서버 ({SERVERS.length}개)</option>
                                <option value="custom">선택한 서버만</option>
                            </select>
                        </div>
                    </div>

                    {/* 키워드 미리보기 */}
                    <div style={{ marginTop: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9CA3AF', fontSize: '0.8rem' }}>
                            검색 키워드 ({config.keywords.length}개)
                        </label>
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '0.3rem',
                            padding: '0.75rem',
                            background: '#0A0B0E',
                            borderRadius: '6px',
                            maxHeight: '80px',
                            overflowY: 'auto'
                        }}>
                            {config.keywords.map((kw, i) => (
                                <span key={i} style={{
                                    padding: '0.2rem 0.5rem',
                                    background: 'rgba(99, 102, 241, 0.2)',
                                    borderRadius: '4px',
                                    color: '#A5B4FC',
                                    fontSize: '0.75rem'
                                }}>
                                    {kw}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* 로그 패널 */}
            <div style={{
                background: '#111318',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '1rem'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.75rem'
                }}>
                    <h3 style={{ margin: 0, color: '#E5E7EB', fontSize: '0.9rem' }}>📋 실시간 로그</h3>
                    <span style={{ color: '#6B7280', fontSize: '0.75rem' }}>
                        {logs.length}개 기록
                    </span>
                </div>

                <div style={{
                    background: '#0A0B0E',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    height: '250px',
                    overflowY: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '0.75rem'
                }}>
                    {logs.length > 0 ? logs.map((log) => (
                        <div key={log.id} style={{
                            marginBottom: '0.3rem',
                            padding: '0.3rem 0.5rem',
                            borderRadius: '4px',
                            background: log.type === 'error' ? 'rgba(239, 68, 68, 0.1)'
                                : log.type === 'success' ? 'rgba(34, 197, 94, 0.1)'
                                    : log.type === 'warning' ? 'rgba(245, 158, 11, 0.1)'
                                        : 'transparent',
                            color: log.type === 'error' ? '#F87171'
                                : log.type === 'success' ? '#4ADE80'
                                    : log.type === 'warning' ? '#FBBF24'
                                        : '#9CA3AF'
                        }}>
                            <span style={{ color: '#6B7280', marginRight: '0.5rem' }}>
                                [{new Date(log.timestamp).toLocaleTimeString()}]
                            </span>
                            {log.message}
                        </div>
                    )) : (
                        <div style={{
                            color: '#6B7280',
                            textAlign: 'center',
                            paddingTop: '100px'
                        }}>
                            로그가 없습니다. 수집을 시작하면 여기에 진행 상황이 표시됩니다.
                        </div>
                    )}
                </div>
            </div>

            {/* 안내 카드 */}
            <div style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '10px',
                padding: '1rem'
            }}>
                <h4 style={{ margin: 0, marginBottom: '0.5rem', color: '#FBBF24', fontSize: '0.85rem' }}>
                    ⚠️ 사용 시 주의사항
                </h4>
                <ul style={{
                    margin: 0,
                    paddingLeft: '1.25rem',
                    color: '#9CA3AF',
                    fontSize: '0.8rem',
                    lineHeight: 1.7
                }}>
                    <li>너무 빠른 속도로 수집하면 공식 서버에서 차단될 수 있습니다</li>
                    <li>권장 설정: <strong style={{ color: '#FBBF24' }}>3초 이상</strong> 간격</li>
                    <li>전체 수집에는 수 시간이 소요될 수 있습니다</li>
                    <li>브라우저를 닫으면 수집이 중단됩니다 (서버 재시작 시에도 초기화)</li>
                </ul>
            </div>

            {/* CSS 애니메이션 */}
            <style jsx>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div>
    )
}
