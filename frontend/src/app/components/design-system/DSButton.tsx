'use client'

import React, { ButtonHTMLAttributes, useState } from 'react'

interface DSButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    fullWidth?: boolean
    icon?: React.ReactNode
}

export default function DSButton({
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    icon,
    children,
    className = '',
    style,
    disabled,
    ...props
}: DSButtonProps) {
    const [isHovered, setIsHovered] = useState(false)
    const [isActive, setIsActive] = useState(false)

    // Base Styles
    const baseStyle: React.CSSProperties = {
        fontFamily: "'Pretendard', sans-serif",
        fontWeight: 600,
        borderRadius: '4px',
        border: '1px solid transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        width: fullWidth ? '100%' : 'auto',
        opacity: disabled ? 0.5 : 1,
        outline: 'none',
        ...style
    }

    // Size Styles
    const sizeStyles = {
        sm: { padding: '0.4rem 0.8rem', fontSize: '0.8rem' },
        md: { padding: '0.6rem 1.2rem', fontSize: '0.9rem' },
        lg: { padding: '0.8rem 1.5rem', fontSize: '1rem' }
    }

    // Variant Styles
    const getVariantStyles = () => {
        switch (variant) {
            case 'primary':
                return {
                    background: isHovered ? 'var(--brand-red-dark)' : 'var(--brand-red-main)',
                    color: 'var(--brand-white)',
                    borderColor: 'transparent',
                    boxShadow: isHovered ? '0 4px 12px rgba(217, 43, 75, 0.3)' : 'none'
                }
            case 'secondary':
                return {
                    background: isHovered ? 'var(--brand-red-muted)' : 'rgba(255, 255, 255, 0.05)',
                    color: 'var(--brand-white)',
                    borderColor: 'var(--brand-red-muted)',
                }
            case 'ghost':
                return {
                    background: 'transparent',
                    color: isHovered ? 'var(--brand-red-main)' : 'var(--text-secondary)',
                    borderColor: 'transparent'
                }
            case 'danger':
                return {
                    background: isHovered ? '#DC2626' : '#EF4444',
                    color: 'white',
                    borderColor: 'transparent'
                }
            default:
                return {}
        }
    }

    const combinedStyle = {
        ...baseStyle,
        ...sizeStyles[size],
        ...getVariantStyles(),
        transform: isActive && !disabled ? 'scale(0.98)' : 'scale(1)',
    }

    return (
        <button
            style={combinedStyle}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => { setIsHovered(false); setIsActive(false) }}
            onMouseDown={() => setIsActive(true)}
            onMouseUp={() => setIsActive(false)}
            disabled={disabled}
            className={className}
            {...props}
        >
            {icon && <span style={{ display: 'flex' }}>{icon}</span>}
            {children}
        </button>
    )
}
