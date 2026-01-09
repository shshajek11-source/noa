'use client'

export interface LogItem {
    id: string
    type: 'success' | 'warning' | 'error' | 'info'
    message: string
    timestamp: string
}

interface ActivityLogProps {
    logs: LogItem[]
    maxHeight?: string
}

export default function ActivityLog({ logs, maxHeight = '200px' }: ActivityLogProps) {
    const getLogIcon = (type: string) => {
        switch (type) {
            case 'success': return '🟢'
            case 'warning': return '🟡'
            case 'error': return '🔴'
            default: return '🔵'
        }
    }

    return (
        <div style={{
            background: '#111318',
            border: '1px solid #1F2433',
            borderRadius: '12px',
            padding: '1.25rem'
        }}>
            <h3 style={{
                fontSize: '0.9rem',
                fontWeight: 'bold',
                color: '#E5E7EB',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
            }}>
                <span>📋</span> 최근 활동
            </h3>

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                maxHeight,
                overflowY: 'auto'
            }}>
                {logs.length > 0 ? logs.map(log => (
                    <div key={log.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.5rem',
                        background: '#0B0D12',
                        borderRadius: '6px',
                        fontSize: '0.8rem'
                    }}>
                        <span>{getLogIcon(log.type)}</span>
                        <span style={{ color: '#6B7280' }}>[{log.timestamp}]</span>
                        <span style={{ color: '#E5E7EB' }}>{log.message}</span>
                    </div>
                )) : (
                    <div style={{
                        padding: '1rem',
                        textAlign: 'center',
                        color: '#6B7280',
                        fontSize: '0.85rem'
                    }}>
                        기록된 활동이 없습니다
                    </div>
                )}
            </div>
        </div>
    )
}
