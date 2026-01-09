'use client'

import Link from 'next/link'

interface Action {
    label: string
    icon: string
    href?: string
    onClick?: () => void
    color: string
}

interface QuickActionsProps {
    actions: Action[]
}

export default function QuickActions({ actions }: QuickActionsProps) {
    return (
        <div style={{
            background: '#111318',
            border: '1px solid var(--brand-red-muted)',
            borderRadius: '8px',
            padding: '1rem'
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
                빠른 액션
            </h3>
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem'
            }}>
                {actions.map((action, idx) => {
                    const buttonStyle: React.CSSProperties = {
                        padding: '0.5rem 1rem',
                        background: 'rgba(217, 43, 75, 0.1)',
                        border: '1px solid var(--brand-red-muted)',
                        borderRadius: '6px',
                        color: 'var(--brand-white)',
                        textDecoration: 'none',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                    }

                    const hoverHandler = (e: React.MouseEvent<HTMLElement>) => {
                        e.currentTarget.style.background = 'var(--brand-red-main)'
                        e.currentTarget.style.borderColor = 'var(--brand-red-main)'
                        e.currentTarget.style.transform = 'translateY(-1px)'
                    }

                    const leaveHandler = (e: React.MouseEvent<HTMLElement>) => {
                        e.currentTarget.style.background = 'rgba(217, 43, 75, 0.1)'
                        e.currentTarget.style.borderColor = 'var(--brand-red-muted)'
                        e.currentTarget.style.transform = 'translateY(0)'
                    }

                    if (action.href) {
                        return (
                            <Link
                                key={idx}
                                href={action.href}
                                style={buttonStyle}
                                onMouseEnter={hoverHandler}
                                onMouseLeave={leaveHandler}
                            >
                                <span>{action.icon}</span>
                                {action.label}
                            </Link>
                        )
                    }

                    return (
                        <button
                            key={idx}
                            onClick={action.onClick}
                            style={buttonStyle}
                            onMouseEnter={hoverHandler}
                            onMouseLeave={leaveHandler}
                        >
                            <span>{action.icon}</span>
                            {action.label}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
