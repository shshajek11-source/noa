'use client'

import { useState, useEffect } from 'react'
import DSCard from '@/app/components/design-system/DSCard'
import DSButton from '@/app/components/design-system/DSButton'
import DSBadge from '@/app/components/design-system/DSBadge'

interface CollectorLog {
    id: number
    server_name: string
    keyword: string
    collected_count: number
    created_at: string
    type: string
}

interface DailyStat {
    date: string
    count: number
}

// Stat Card Component (Local reuse)
function StatCard({ label, value, icon, trend }: { label: string; value: string; icon: string; trend?: string }) {
    return (
        <div style={{
            background: '#111318',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
        }}>
            <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'rgba(217, 43, 75, 0.1)',
                color: 'var(--brand-red-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem'
            }}>
                {icon}
            </div>
            <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>{label}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{value}</div>
                {trend && <div style={{ fontSize: '0.75rem', color: '#34D399', marginTop: '0.25rem' }}>{trend}</div>}
            </div>
        </div>
    )
}

export default function CollectorPage() {
    const [logs, setLogs] = useState<CollectorLog[]>([])
    const [dailyStats, setDailyStats] = useState<DailyStat[]>([])
    const [todayCount, setTodayCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

    // Filter State
    const [activeTab, setActiveTab] = useState<'all' | 'auto' | 'user' | 'detail'>('all')

    // Auto Collection State
    const [isCollecting, setIsCollecting] = useState(true)

    // Batch Update State (미조회 캐릭터 처리)
    const [isBatchRunning, setIsBatchRunning] = useState(false)
    const [batchRemaining, setBatchRemaining] = useState<number | null>(null)
    const [batchUpdated, setBatchUpdated] = useState(0)
    const [batchLastResult, setBatchLastResult] = useState<string>('')
    const [batchStatus, setBatchStatus] = useState<{
        blocked: number
        rateLimited: number
        isBlocked: boolean
    } | null>(null)

    const fetchLogs = async () => {
        try {
            const res = await fetch(`/api/admin/logs?type=${activeTab}`, { cache: 'no-store' })
            const data = await res.json()
            if (data.recentLogs) setLogs(data.recentLogs)
            if (data.dailyStats) setDailyStats(data.dailyStats)
            if (data.todayCount) setTodayCount(data.todayCount)
            setLastUpdated(new Date())
        } catch (e) {
            console.error('Collector logs fetch error:', e)
        } finally {
            setLoading(false)
        }
    }

    // ... (useEffect 생략, 변경 없음) ...

    // Initial Load & Log Polling
    useEffect(() => {
        fetchLogs()
        const interval = setInterval(fetchLogs, 5000)
        return () => clearInterval(interval)
    }, [activeTab])

    // Background Collection Trigger
    useEffect(() => {
        if (!isCollecting) return

        const triggerCollection = async () => {
            try {
                // 자동 수집 트리거 (로그 갱신은 위 interval이 처리)
                const res = await fetch('/api/admin/collector')

                // 상세 수집 연쇄 호출 (Chaining)
                // 목록만 수집하면 유저가 불안해하므로, 발견된 캐릭터 중 일부의 상세 정보를 즉시 긁어옴
                if (res.ok) {
                    const data = await res.json()
                    if (data.new_characters && Array.isArray(data.new_characters) && data.new_characters.length > 0) {
                        // Rate Limit을 고려하여 랜덤하게 최대 10명 상세 수집 진행 (기존 3명 → 10명으로 증가)
                        const targets = data.new_characters
                            .sort(() => 0.5 - Math.random())
                            .slice(0, 10)

                        // 비동기로 상세 수집 호출 (결과 기다리지 않음, 로그는 DB에 쌓임)
                        targets.forEach((target: any) => {
                            fetch(`/api/character?id=${target.id}&server=${target.server}`)
                                .catch(err => console.error(`Failed to sync detail for ${target.name}`, err))
                        })
                    }
                }

                // 만약 현재 탭이 'auto'거나 'all'이면 즉시 갱신해주는 게 좋음
                if (activeTab === 'auto' || activeTab === 'all' || activeTab === 'detail') fetchLogs()
            } catch (e) {
                console.error('Collection trigger failed:', e)
            }
        }

        // 페이지 진입 시 즉시 1회 실행
        triggerCollection()

        const interval = setInterval(triggerCollection, 2000) // 2초마다 수집 실행 (기존 4초 → 2초로 단축)
        return () => clearInterval(interval)
    }, [isCollecting, activeTab])

    // Batch Update (미조회 캐릭터 집중 처리)
    useEffect(() => {
        if (!isBatchRunning) return

        const runBatch = async () => {
            try {
                const res = await fetch('/api/admin/batch-update')
                const data = await res.json()

                if (data.remaining !== undefined) {
                    setBatchRemaining(data.remaining)
                }

                if (data.results) {
                    const successCount = data.results.filter((r: any) => r.success).length
                    setBatchUpdated(prev => prev + successCount)
                    setBatchLastResult(`${successCount}/${data.results.length} 성공`)
                }

                // 차단 상태 업데이트
                if (data.status) {
                    setBatchStatus(data.status)

                    // 차단 감지 시 자동 중지
                    if (data.status.shouldPause || data.status.isBlocked) {
                        setIsBatchRunning(false)
                        setBatchLastResult('🚫 차단 감지! 자동 중지됨')
                        return
                    }
                }

                // 남은 캐릭터가 0이면 자동 중지
                if (data.remaining === 0) {
                    setIsBatchRunning(false)
                    setBatchLastResult('✅ 모든 캐릭터 처리 완료!')
                }
            } catch (e) {
                console.error('Batch update failed:', e)
                setBatchLastResult('❌ 오류 발생')
            }
        }

        runBatch()
        const interval = setInterval(runBatch, 2000) // 2초마다 배치 실행
        return () => clearInterval(interval)
    }, [isBatchRunning])

    // 초기 미조회 캐릭터 수 확인
    useEffect(() => {
        const checkRemaining = async () => {
            try {
                const res = await fetch('/api/admin/batch-update')
                const data = await res.json()
                if (data.remaining !== undefined) {
                    setBatchRemaining(data.remaining)
                }
            } catch (e) {
                console.error('Failed to check remaining:', e)
            }
        }
        checkRemaining()
    }, [])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header ... -> 생략 (변경없음) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                        자동 수집 현황
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        실시간 캐릭터 수집 로그 및 통계 모니터링
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* ... Controls 생략 ... */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '1rem' }}>
                        <span style={{ fontSize: '0.8rem', color: isCollecting ? '#34D399' : 'var(--text-disabled)' }}>
                            {isCollecting ? '● 자동 수집 중' : '○ 수집 일시정지'}
                        </span>
                        <DSButton
                            variant={isCollecting ? 'danger' : 'primary'}
                            size="sm"
                            onClick={() => setIsCollecting(!isCollecting)}
                        >
                            {isCollecting ? '⏹ 중지' : '▶ 시작'}
                        </DSButton>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-disabled)' }}>
                        마지막 업데이트: {lastUpdated.toLocaleTimeString()}
                    </span>
                    <DSButton variant="ghost" size="sm" onClick={fetchLogs} disabled={loading}>
                        🔃
                    </DSButton>
                </div>
            </div>

            {/* Stats Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <StatCard
                    label="오늘 수집된 캐릭터"
                    value={`${todayCount.toLocaleString()}명`}
                    icon="📅"
                    trend={isCollecting ? "▲ 순항 중" : "일시정지됨"}
                />
                <StatCard
                    label="최근 활동"
                    value={`${logs.length > 0 ? (logs[0].type === 'detail' ? '상세수집' : logs[0].server_name) : '-'} / ${logs.length > 0 ? logs[0].keyword : '-'}`}
                    icon="🔍"
                />
                <StatCard
                    label="현재 모드"
                    value={activeTab === 'auto' ? 'Auto Search' : activeTab === 'detail' ? 'Detail Sync' : activeTab === 'user' ? 'User Search' : 'All Views'}
                    icon="⚡"
                    trend={isCollecting ? "Background Active" : "Paused"}
                />
            </div>

            {/* 미조회 캐릭터 배치 처리 */}
            <DSCard title="🚀 미조회 캐릭터 집중 처리" hoverEffect={false}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>미조회 캐릭터</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: batchRemaining && batchRemaining > 0 ? '#F59E0B' : '#34D399' }}>
                                {batchRemaining !== null ? `${batchRemaining.toLocaleString()}명` : '확인 중...'}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>이번 세션 처리</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#34D399' }}>
                                {batchUpdated.toLocaleString()}명
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>마지막 결과</div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
                                {batchLastResult || '-'}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: isBatchRunning ? '#34D399' : 'var(--text-disabled)' }}>
                            {isBatchRunning ? '● 처리 중 (15명/2초, ~400명/분)' : '○ 대기'}
                        </span>
                        <DSButton
                            variant={isBatchRunning ? 'danger' : 'primary'}
                            size="sm"
                            onClick={() => {
                                if (!isBatchRunning) setBatchUpdated(0)
                                setIsBatchRunning(!isBatchRunning)
                            }}
                            disabled={batchRemaining === 0}
                        >
                            {isBatchRunning ? '⏹ 중지' : '▶ 시작'}
                        </DSButton>
                    </div>
                </div>
                {/* 차단 경고 배너 */}
                {batchStatus?.isBlocked && (
                    <div style={{
                        marginTop: '0.75rem',
                        padding: '0.75rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid #EF4444',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                    }}>
                        <span style={{ fontSize: '1.5rem' }}>🚫</span>
                        <div>
                            <div style={{ color: '#EF4444', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                API 차단 감지됨!
                            </div>
                            <div style={{ color: '#FCA5A5', fontSize: '0.8rem' }}>
                                차단: {batchStatus.blocked}회 | Rate Limit: {batchStatus.rateLimited}회
                                <br />
                                10~30분 후 다시 시도하세요.
                            </div>
                        </div>
                    </div>
                )}
                <div style={{ fontSize: '0.75rem', color: 'var(--text-disabled)', marginTop: '0.5rem' }}>
                    💡 DB에 저장되어 있지만 상세 정보(스탯, 장비, 전투력)가 없는 캐릭터들을 집중 조회합니다.
                    {batchStatus && !batchStatus.isBlocked && batchStatus.blocked > 0 && (
                        <span style={{ color: '#F59E0B' }}> (경고: 차단 {batchStatus.blocked}회 감지)</span>
                    )}
                </div>
            </DSCard>

            {/* Main Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', minHeight: '500px' }}>
                {/* Realtime Logs */}
                <DSCard title="실시간 수집 로그 (최근 100건)" hoverEffect={false}>
                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '0.5rem', padding: '0 0 1rem 0', borderBottom: '1px solid var(--border)', marginBottom: '1rem', overflowX: 'auto' }}>
                        {[
                            { id: 'all', label: '전체' },
                            { id: 'auto', label: '🤖 자동 검색' },
                            { id: 'detail', label: '📥 캐릭터 수집' },
                            { id: 'user', label: '🔍 유저 검색' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                style={{
                                    background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                                    color: activeTab === tab.id ? 'black' : 'var(--text-secondary)',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '0.5rem 0.8rem',
                                    fontSize: '0.8rem',
                                    fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div style={{
                        overflowX: 'auto',
                        maxHeight: '600px',
                        overflowY: 'auto'
                    }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead style={{ position: 'sticky', top: 0, background: '#111318', zIndex: 10 }}>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)', width: '80px' }}>시간</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)', width: '80px' }}>구분</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)' }}>서버</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-secondary)' }}>대상/키워드</th>
                                    <th style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-secondary)' }}>결과</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => {
                                    const isDetail = log.type === 'detail'
                                    const isUser = log.type === 'user'
                                    const isAuto = !log.type || log.type === 'auto'

                                    return (
                                        <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-disabled)', fontFamily: 'monospace' }}>
                                                {new Date(log.created_at).toLocaleTimeString()}
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    color: isDetail ? '#10B981' : (isUser ? '#60A5FA' : '#F59E0B'),
                                                    background: isDetail ? 'rgba(16, 185, 129, 0.1)' : (isUser ? 'rgba(96, 165, 250, 0.1)' : 'rgba(245, 158, 11, 0.1)'),
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {isDetail ? 'SYNC' : (isUser ? 'USER' : 'AUTO')}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                <DSBadge variant="dark" size="sm">{log.server_name}</DSBadge>
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', color: isDetail ? 'var(--text-main)' : (isUser ? '#E5E7EB' : 'var(--primary)'), fontWeight: isDetail ? 'bold' : 'normal' }}>
                                                {log.keyword}
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                                {log.collected_count > 0 ? (
                                                    <span style={{ color: '#34D399', fontWeight: 'bold' }}>
                                                        {isDetail ? 'Update Fail?' : `+${log.collected_count}명`}
                                                        {/* Detail인 경우 count가 1이어야 성공. 0이면 실패? 
                                                            Wait, Detail inserts 1 on success. 
                                                        */}
                                                        {isDetail && log.collected_count === 1 ? 'OK' : (!isDetail ? `+${log.collected_count}명` : 'Fail')}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: 'var(--text-disabled)' }}>0</span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                                {logs.length === 0 && (
                                    <tr>
                                        <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-disabled)' }}>
                                            수집 기록이 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </DSCard>

                {/* Daily Chart & Summary */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <DSCard title="일별 수집 추이" hoverEffect={false} style={{ flex: 1 }}>
                        <div style={{
                            height: '100%',
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'space-between',
                            padding: '1rem 0',
                            gap: '0.5rem'
                        }}>
                            {dailyStats.map((stat, idx) => {
                                const max = Math.max(...dailyStats.map(d => d.count), 100)
                                const height = Math.max((stat.count / max) * 100, 5) // 최소 높이 보장
                                return (
                                    <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#34D399', fontWeight: 'bold' }}>{stat.count}</span>
                                        <div style={{
                                            width: '100%',
                                            height: `${height}%`,
                                            background: 'linear-gradient(to top, rgba(52, 211, 153, 0.2), rgba(52, 211, 153, 0.6))',
                                            borderRadius: '4px 4px 0 0',
                                            minHeight: '4px'
                                        }} />
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-disabled)', whiteSpace: 'nowrap' }}>
                                            {stat.date.slice(5)}
                                        </span>
                                    </div>
                                )
                            })}
                            {dailyStats.length === 0 && (
                                <div style={{ width: '100%', textAlign: 'center', color: 'var(--text-disabled)', alignSelf: 'center' }}>
                                    데이터가 부족합니다.
                                </div>
                            )}
                        </div>
                    </DSCard>

                    <DSCard title="도움말" hoverEffect={false}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            <p style={{ marginBottom: '0.5rem' }}>• <b>자동 수집</b> 페이지가 열려있는 동안 브라우저가 백그라운드 작업을 트리거합니다.</p>
                            <p style={{ marginBottom: '0.5rem' }}>• <b>"0 (No Result)"</b>는 해당 서버/검색어로 검색했으나 결과가 없었다는 뜻입니다. 정상 동작입니다.</p>
                            <p>• 수집을 중지하려면 상단의 <b>중지</b> 버튼을 누르세요.</p>
                        </div>
                    </DSCard>
                </div>
            </div>
        </div>
    )
}
