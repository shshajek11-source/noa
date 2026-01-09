'use client'

import { CrawlHistory } from '../types'
import DSCard from '../../../components/design-system/DSCard'
import DSBadge from '../../../components/design-system/DSBadge'
import DSButton from '../../../components/design-system/DSButton'

interface HistoryPanelProps {
    history: CrawlHistory[]
    onClear: () => void
}

function formatDateTime(timestamp: number): string {
    return new Date(timestamp).toLocaleString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    })
}

function formatDuration(start: number, end: number | null): string {
    if (!end) return '진행 중'
    const ms = end - start
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) return `${minutes}분 ${seconds % 60}초`
    return `${seconds}초`
}

export default function HistoryPanel({ history, onClear }: HistoryPanelProps) {
    if (history.length === 0) {
        return (
            <DSCard title="📜 크롤링 기록" hoverEffect={false} style={{ padding: '1rem' }}>
                <div style={{
                    textAlign: 'center',
                    padding: '2rem',
                    color: 'var(--text-disabled)',
                    fontSize: '0.85rem'
                }}>
                    아직 크롤링 기록이 없습니다.
                </div>
            </DSCard>
        )
    }

    return (
        <DSCard
            title="📜 크롤링 기록"
            hoverEffect={false}
            style={{ padding: '1rem' }}
            action={
                <DSButton variant="ghost" size="sm" onClick={onClear}>
                    🗑️ 기록 삭제
                </DSButton>
            }
        >
            <div style={{
                maxHeight: '300px',
                overflowY: 'auto'
            }}>
                {history.map((item) => (
                    <div
                        key={item.id}
                        style={{
                            padding: '0.75rem',
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: '8px',
                            marginBottom: '0.5rem',
                            border: '1px solid var(--border)'
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '0.5rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    {formatDateTime(item.startTime)}
                                </span>
                                <DSBadge
                                    variant={item.status === 'completed' ? 'success' : item.status === 'stopped' ? 'warning' : 'primary'}
                                    size="sm"
                                >
                                    {item.status === 'completed' ? '완료' : item.status === 'stopped' ? '중단' : '에러'}
                                </DSBadge>
                            </div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-disabled)' }}>
                                {formatDuration(item.startTime, item.endTime)}
                            </span>
                        </div>

                        {/* Stats */}
                        <div style={{
                            display: 'flex',
                            gap: '1rem',
                            fontSize: '0.7rem'
                        }}>
                            <span style={{ color: '#34D399' }}>✅ {item.stats.inserted}</span>
                            <span style={{ color: '#3B82F6' }}>🔄 {item.stats.updated}</span>
                            <span style={{ color: '#6B7280' }}>⏭️ {item.stats.skipped}</span>
                            <span style={{ color: '#EF4444' }}>❌ {item.stats.errors}</span>
                            <span style={{ color: 'var(--text-secondary)' }}>
                                📈 {item.stats.successRate.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </DSCard>
    )
}
