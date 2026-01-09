'use client'

import { CrawlProgress, CrawlStats } from '../types'
import DSCard from '../../../components/design-system/DSCard'
import DSBadge from '../../../components/design-system/DSBadge'

interface MonitoringPanelProps {
    progress: CrawlProgress
    stats: CrawlStats
    currentTask: string
    isRunning: boolean
    isPaused: boolean
    currentDelay: number
}

function ProgressBar({ percentage, color = 'var(--brand-red-main)' }: { percentage: number; color?: string }) {
    return (
        <div style={{
            background: '#0D0F14',
            borderRadius: '6px',
            height: '12px',
            overflow: 'hidden',
            border: '1px solid var(--border)'
        }}>
            <div style={{
                height: '100%',
                width: `${percentage}%`,
                background: `linear-gradient(90deg, ${color}, ${color}88)`,
                transition: 'width 0.3s ease',
                boxShadow: `0 0 10px ${color}50`,
                position: 'relative'
            }}>
                {percentage > 10 && (
                    <span style={{
                        position: 'absolute',
                        right: '4px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '0.6rem',
                        fontWeight: 'bold',
                        color: 'white',
                        textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                    }}>
                        {percentage}%
                    </span>
                )}
            </div>
        </div>
    )
}

function StatItem({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            background: `${color}10`,
            borderRadius: '6px',
            border: `1px solid ${color}30`
        }}>
            <span style={{ fontSize: '1rem' }}>{icon}</span>
            <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-disabled)' }}>{label}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color, fontFamily: 'monospace' }}>{value}</div>
            </div>
        </div>
    )
}

function formatTime(ms: number): string {
    if (ms < 0) return '--:--'
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
        return `${hours}시간 ${minutes % 60}분`
    } else if (minutes > 0) {
        return `${minutes}분 ${seconds % 60}초`
    }
    return `${seconds}초`
}

function formatDateTime(timestamp: number | null): string {
    if (!timestamp) return '--:--:--'
    return new Date(timestamp).toLocaleTimeString('ko-KR')
}

export default function MonitoringPanel({
    progress,
    stats,
    currentTask,
    isRunning,
    isPaused,
    currentDelay
}: MonitoringPanelProps) {
    const elapsedTime = progress.startTime ? Date.now() - progress.startTime : 0
    const estimatedRemaining = progress.estimatedEndTime ? progress.estimatedEndTime - Date.now() : -1

    return (
        <DSCard
            title="📊 실시간 모니터링"
            hoverEffect={false}
            style={{ padding: '1rem' }}
            action={
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {isPaused && <DSBadge variant="warning" size="sm">일시정지</DSBadge>}
                    {isRunning && !isPaused && <DSBadge variant="success" size="sm">실행 중</DSBadge>}
                    {!isRunning && !isPaused && progress.current > 0 && <DSBadge variant="dark" size="sm">완료</DSBadge>}
                </div>
            }
        >
            {/* Progress Bar */}
            <div style={{ marginBottom: '1rem' }}>
                <ProgressBar percentage={progress.percentage} />
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '0.5rem',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)'
                }}>
                    <span>{progress.current} / {progress.total}</span>
                    <span style={{ color: 'var(--brand-red-main)' }}>{currentTask || '대기 중...'}</span>
                </div>
            </div>

            {/* Time Info */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '0.5rem',
                marginBottom: '1rem',
                padding: '0.75rem',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '8px'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-disabled)' }}>시작 시간</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontFamily: 'monospace' }}>
                        {formatDateTime(progress.startTime)}
                    </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-disabled)' }}>경과 시간</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontFamily: 'monospace' }}>
                        {formatTime(elapsedTime)}
                    </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-disabled)' }}>예상 완료</div>
                    <div style={{ fontSize: '0.8rem', color: '#34D399', fontFamily: 'monospace' }}>
                        {formatDateTime(progress.estimatedEndTime)}
                    </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-disabled)' }}>남은 시간</div>
                    <div style={{ fontSize: '0.8rem', color: '#FACC15', fontFamily: 'monospace' }}>
                        {formatTime(estimatedRemaining)}
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.5rem',
                marginBottom: '1rem'
            }}>
                <StatItem icon="✅" label="삽입" value={stats.inserted.toLocaleString()} color="#34D399" />
                <StatItem icon="🔄" label="업데이트" value={stats.updated.toLocaleString()} color="#3B82F6" />
                <StatItem icon="⏭️" label="스킵" value={stats.skipped.toLocaleString()} color="#6B7280" />
                <StatItem icon="🔁" label="재시도" value={stats.retries.toLocaleString()} color="#F59E0B" />
                <StatItem icon="❌" label="에러" value={stats.errors.toLocaleString()} color="#EF4444" />
                <StatItem
                    icon="📈"
                    label="성공률"
                    value={`${stats.successRate.toFixed(1)}%`}
                    color={stats.successRate >= 90 ? '#34D399' : stats.successRate >= 70 ? '#F59E0B' : '#EF4444'}
                />
            </div>

            {/* Current Status */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.5rem 0.75rem',
                background: '#0D0F14',
                borderRadius: '6px',
                fontSize: '0.75rem'
            }}>
                <span style={{ color: 'var(--text-secondary)' }}>현재 요청 간격</span>
                <span style={{ color: 'var(--brand-red-main)', fontWeight: 'bold', fontFamily: 'monospace' }}>
                    {currentDelay}ms
                </span>
            </div>
        </DSCard>
    )
}
