'use client'

import React from 'react'

interface DSCardProps {
    children: React.ReactNode
    title?: string
    action?: React.ReactNode
    className?: string
    style?: React.CSSProperties
    hoverEffect?: boolean
    noPadding?: boolean
}

export default function DSCard({
    children,
    title,
    action,
    className = '',
    style,
    hoverEffect = true,
    noPadding = false
}: DSCardProps) {
    return (
        <div
            className={`ds-card ${className}`}
            style={{
                background: '#111318', // Slightly lighter than pure black for cards
                border: '1px solid var(--brand-red-muted)',
                borderRadius: '8px',
                padding: noPadding ? '0' : '1.5rem',
                transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
                ...style
            }}
            onMouseEnter={(e) => {
                if (hoverEffect) {
                    e.currentTarget.style.borderColor = 'var(--brand-red-main)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.7)'
                }
            }}
            onMouseLeave={(e) => {
                if (hoverEffect) {
                    e.currentTarget.style.borderColor = 'var(--brand-red-muted)'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
                }
            }}
        >
            {/* Header */}
            {(title || action) && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: noPadding ? '0' : '1rem',
                    padding: noPadding ? '1rem 1.5rem' : '0',
                    borderBottom: noPadding ? '1px solid rgba(255,255,255,0.05)' : 'none'
                }}>
                    {title && (
                        <h3 style={{
                            fontSize: '1.1rem',
                            fontWeight: '700',
                            color: 'var(--brand-white)',
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}>
                            <span style={{
                                width: '4px',
                                height: '16px',
                                background: 'var(--brand-red-main)',
                                display: 'inline-block',
                                borderRadius: '2px'
                            }}></span>
                            {title}
                        </h3>
                    )}
                    {action && <div>{action}</div>}
                </div>
            )}

            {/* Body */}
            <div style={{ padding: noPadding ? '1.5rem' : '0' }}>
                {children}
            </div>
        </div>
    )
}
