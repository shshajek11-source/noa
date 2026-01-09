'use client'

interface StatCardProps {
    label: string
    value: string | number
    icon: string
    change?: string
    color?: string
    loading?: boolean
}

export default function StatCard({ label, value, icon, change, color = 'var(--brand-red-main)', loading = false }: StatCardProps) {
    return (
        <div style={{
            background: '#111318',
            border: '1px solid var(--brand-red-muted)',
            borderRadius: '8px',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            transition: 'all 0.2s ease',
            position: 'relative',
            overflow: 'hidden'
        }}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--brand-red-main)'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(217, 43, 75, 0.15)'
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--brand-red-muted)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
            }}
        >
            {/* 상단 장식 라인 */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: `linear-gradient(90deg, ${color}, transparent)`
            }} />

            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
                <span style={{
                    fontSize: '1.1rem',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `${color}15`,
                    borderRadius: '6px'
                }}>{icon}</span>
            </div>

            <div style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: 'var(--brand-white)',
                letterSpacing: '-0.02em'
            }}>
                {loading ? (
                    <span style={{ color: 'var(--text-disabled)' }}>...</span>
                ) : value}
            </div>

            {change && (
                <div style={{
                    fontSize: '0.7rem',
                    color: change.startsWith('+') ? 'var(--success)' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                }}>
                    {change.startsWith('+') && <span>▲</span>}
                    {change}
                </div>
            )}
        </div>
    )
}
