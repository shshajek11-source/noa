'use client'

interface StatusItem {
    label: string
    status: boolean
    detail?: string
}

interface SystemStatusProps {
    items: StatusItem[]
}

export default function SystemStatus({ items }: SystemStatusProps) {
    return (
        <div style={{
            background: '#111318',
            border: '1px solid var(--brand-red-muted)',
            borderRadius: '8px',
            padding: '1rem',
            height: '100%'
        }}>
            <h3 style={{
                fontSize: '0.85rem',
                fontWeight: 'bold',
                color: 'var(--brand-white)',
                marginBottom: '0.75rem',
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
                시스템 상태
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {items.map((item, idx) => (
                    <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.5rem 0.75rem',
                        background: item.status ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                        borderRadius: '6px',
                        border: `1px solid ${item.status ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                    }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {item.detail && (
                                <span style={{
                                    fontSize: '0.7rem',
                                    color: 'var(--text-disabled)',
                                    background: 'rgba(255,255,255,0.05)',
                                    padding: '0.15rem 0.4rem',
                                    borderRadius: '4px'
                                }}>{item.detail}</span>
                            )}
                            <span style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: item.status ? 'var(--success)' : 'var(--danger)',
                                boxShadow: item.status ? '0 0 8px rgba(16, 185, 129, 0.5)' : '0 0 8px rgba(239, 68, 68, 0.5)'
                            }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
