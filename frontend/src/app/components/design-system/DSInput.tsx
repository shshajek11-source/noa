'use client'

import React, { InputHTMLAttributes, useState } from 'react'

interface DSInputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
    icon?: React.ReactNode
    fullWidth?: boolean
}

export default function DSInput({
    label,
    error,
    icon,
    fullWidth = false,
    className = '',
    style,
    ...props
}: DSInputProps) {
    const [isFocused, setIsFocused] = useState(false)

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            width: fullWidth ? '100%' : 'auto',
            marginBottom: '1rem'
        }}>
            {label && (
                <label style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: 'var(--text-secondary)',
                    marginLeft: '2px'
                }}>
                    {label}
                </label>
            )}

            <div style={{ position: 'relative', width: '100%' }}>
                {icon && (
                    <div style={{
                        position: 'absolute',
                        left: '1rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: isFocused ? 'var(--brand-red-main)' : 'var(--text-secondary)',
                        transition: 'color 0.2s',
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        {icon}
                    </div>
                )}

                <input
                    style={{
                        width: '100%',
                        padding: '0.8rem 1rem',
                        paddingLeft: icon ? '2.8rem' : '1rem',
                        background: '#0B0D12',
                        border: `1px solid ${error ? '#EF4444' : (isFocused ? 'var(--brand-red-main)' : 'var(--brand-red-muted)')}`,
                        borderRadius: '4px',
                        color: 'var(--brand-white)',
                        fontSize: '0.95rem',
                        outline: 'none',
                        transition: 'all 0.2s',
                        ...style
                    }}
                    onFocus={(e) => {
                        setIsFocused(true)
                        props.onFocus?.(e)
                    }}
                    onBlur={(e) => {
                        setIsFocused(false)
                        props.onBlur?.(e)
                    }}
                    {...props}
                />
            </div>

            {error && (
                <span style={{
                    fontSize: '0.8rem',
                    color: '#EF4444',
                    marginLeft: '2px'
                }}>
                    {error}
                </span>
            )}
        </div>
    )
}
