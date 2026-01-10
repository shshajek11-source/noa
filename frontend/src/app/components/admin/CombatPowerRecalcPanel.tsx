'use client'

import { useState } from 'react'
import DSCard from '../design-system/DSCard'
import DSButton from '../design-system/DSButton'
import DSBadge from '../design-system/DSBadge'

interface RecalcResult {
    name: string
    oldScore: number
    newScore: number
    grade: string
    success: boolean
    error?: string
}

export default function CombatPowerRecalcPanel() {
    const [isRunning, setIsRunning] = useState(false)
    const [progress, setProgress] = useState({ processed: 0, total: 0, success: 0, failed: 0 })
    const [results, setResults] = useState<RecalcResult[]>([])
    const [error, setError] = useState<string | null>(null)
    const [offset, setOffset] = useState(0)

    const startRecalculation = async () => {
        setIsRunning(true)
        setError(null)
        setResults([])
        setOffset(0)

        try {
            // 먼저 상태 확인
            const statusRes = await fetch('/api/admin/recalc-combat-power', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'status' })
            })
            const statusData = await statusRes.json()
            setProgress(prev => ({ ...prev, total: statusData.total || 0 }))

            // 배치 처리 시작
            await runBatch(0, statusData.total || 0)

        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsRunning(false)
        }
    }

    const runBatch = async (currentOffset: number, total: number) => {
        try {
            const res = await fetch('/api/admin/recalc-combat-power', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'recalculate',
                    batchSize: 50,  // DB 저장 데이터 사용으로 배치 사이즈 증가
                    offset: currentOffset
                })
            })

            const data = await res.json()

            if (data.error) {
                setError(data.error)
                return
            }

            setProgress(prev => ({
                ...prev,
                processed: currentOffset + data.processed,
                success: prev.success + data.success,
                failed: prev.failed + data.failed
            }))

            setResults(prev => [...(data.results || []), ...prev].slice(0, 20))
            setOffset(data.nextOffset)

            // 계속 진행 (DB 데이터만 사용하므로 대기 시간 최소화)
            if (data.hasMore && isRunning) {
                await new Promise(resolve => setTimeout(resolve, 100))
                await runBatch(data.nextOffset, total)
            }

        } catch (err: any) {
            setError(err.message)
        }
    }

    const stopRecalculation = () => {
        setIsRunning(false)
    }

    const progressPercent = progress.total > 0
        ? Math.round((progress.processed / progress.total) * 100)
        : 0

    return (
        <DSCard title="전투력 재계산" hoverEffect={false} style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* 상태 표시 */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '0.5rem',
                    padding: '0.75rem',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '8px'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>전체</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
                            {progress.total.toLocaleString()}
                        </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>처리됨</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#60A5FA' }}>
                            {progress.processed.toLocaleString()}
                        </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>성공</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#34D399' }}>
                            {progress.success.toLocaleString()}
                        </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>실패</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#EF4444' }}>
                            {progress.failed.toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* 진행률 바 */}
                <div style={{
                    height: '8px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        height: '100%',
                        width: `${progressPercent}%`,
                        background: 'linear-gradient(90deg, #FACC15, #F59E0B)',
                        transition: 'width 0.3s ease',
                        borderRadius: '4px'
                    }} />
                </div>
                <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {progressPercent}% 완료
                </div>

                {/* 버튼 */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {!isRunning ? (
                        <DSButton variant="primary" onClick={startRecalculation} style={{ flex: 1 }}>
                            전투력 재계산 시작
                        </DSButton>
                    ) : (
                        <DSButton variant="secondary" onClick={stopRecalculation} style={{ flex: 1 }}>
                            중지
                        </DSButton>
                    )}
                </div>

                {/* 에러 표시 */}
                {error && (
                    <div style={{
                        padding: '0.75rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '6px',
                        color: '#EF4444',
                        fontSize: '0.8rem'
                    }}>
                        {error}
                    </div>
                )}

                {/* 최근 결과 */}
                {results.length > 0 && (
                    <div style={{
                        maxHeight: '200px',
                        overflowY: 'auto',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '6px',
                        padding: '0.5rem'
                    }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                            최근 처리 결과
                        </div>
                        {results.map((r, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.4rem',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                fontSize: '0.75rem'
                            }}>
                                <span style={{ color: 'var(--text-main)' }}>{r.name}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>
                                        {r.oldScore.toLocaleString()} →
                                    </span>
                                    <span style={{ color: '#FACC15', fontWeight: 600 }}>
                                        {r.newScore.toLocaleString()}
                                    </span>
                                    <DSBadge variant={r.success ? 'success' : 'warning'} size="sm">
                                        {r.grade || (r.success ? 'OK' : 'ERR')}
                                    </DSBadge>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DSCard>
    )
}
