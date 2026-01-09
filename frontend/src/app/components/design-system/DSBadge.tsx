'use client'

import React from 'react'

interface DSBadgeProps {
    children: React.ReactNode
    variant?: 'primary' | 'dark' | 'outline' | 'success' | 'warning'
    size?: 'sm' | 'md'
}

export default function DSBadge({
    children,
    variant = 'primary',
    size = 'md'
}: DSBadgeProps) {
    const getVariantStyle = () => {
        switch (variant) {
            case 'primary':
                return {
                    background: 'rgba(217, 43, 75, 0.15)',
                    color: 'var(--brand-red-main)',
                    border: '1px solid var(--brand-red-main)'
                }
            case 'dark':
                return {
                    background: '#1F2937', // Neutral dark
                    color: '#D1D5DB',
                    border: '1px solid #374151'
                }
            case 'outline':
                return {
                    background: 'transparent',
                    color: 'var(--brand-white)',
                    border: '1px solid var(--brand-red-muted)'
                }
            case 'success':
                return {
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#34D399',
                    border: '1px solid #059669'
                }
            case 'warning':
                return {
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#FBBF24',
                    border: '1px solid #D97706'
                }
            default:
                return {}
        }
    }

    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: size === 'sm' ? '0.1rem 0.4rem' : '0.25rem 0.6rem',
            fontSize: size === 'sm' ? '0.7rem' : '0.8rem',
            fontWeight: 700,
            borderRadius: '4px',
            lineHeight: 1,
            ...getVariantStyle()
        }}>
            {children}
        </span>
    )
}
