'use client'

import React, { useState, InputHTMLAttributes, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface DSSearchBarProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onSearch'> {
    onSearch?: (value: string, server: string) => void
    placeholder?: string
    width?: string
    servers?: string[]
    defaultServer?: string
}

export default function DSSearchBar({
    onSearch,
    placeholder = "Search...",
    width = "100%",
    className = "",
    style,
    servers = ['All', 'Iscan', 'Triniel', 'Kaisinel', 'Lumiel'],
    defaultServer = 'All',
    ...props
}: DSSearchBarProps) {
    const [isFocused, setIsFocused] = useState(false)
    const [value, setValue] = useState("")
    const [selectedServer, setSelectedServer] = useState(defaultServer)
    const [isServerOpen, setIsServerOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsServerOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSearch?.(value, selectedServer)
    }

    return (
        <form
            onSubmit={handleSubmit}
            className={className}
            style={{
                width,
                position: 'relative',
                zIndex: isServerOpen ? 50 : 1,
                ...style
            }}
        >
            {/* Gradient Border Container */}
            <div
                style={{
                    padding: '2px', // Border width
                    borderRadius: '50px', // Pill shape
                    background: isFocused
                        ? 'linear-gradient(90deg, var(--brand-red-main), #F59E0B, var(--brand-red-main))'
                        : 'var(--border)',
                    backgroundSize: '200% 100%',
                    transition: 'all 0.3s ease',
                    animation: isFocused ? 'gradientMove 3s linear infinite' : 'none'
                }}
            >
                {/* Inner Input Container */}
                <div style={{
                    background: '#0B0D12',
                    borderRadius: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.2rem',
                    position: 'relative',
                    height: '50px'
                }}>

                    {/* Server Select Button */}
                    <div style={{ position: 'relative' }} ref={dropdownRef}>
                        <button
                            type="button"
                            onClick={() => setIsServerOpen(!isServerOpen)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--brand-white)',
                                padding: '0 1rem 0 1.5rem',
                                height: '100%',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {selectedServer}
                            <motion.svg
                                animate={{ rotate: isServerOpen ? 180 : 0 }}
                                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                            >
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </motion.svg>
                        </button>

                        {/* Dropdown Menu */}
                        <AnimatePresence>
                            {isServerOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    style={{
                                        position: 'absolute',
                                        top: '120%',
                                        left: '0.5rem',
                                        minWidth: '140px',
                                        background: '#1F2937',
                                        border: '1px solid var(--border-light)',
                                        borderRadius: '8px',
                                        padding: '0.5rem',
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.25rem'
                                    }}
                                >
                                    {servers.map(server => (
                                        <button
                                            key={server}
                                            type="button"
                                            onClick={() => {
                                                setSelectedServer(server)
                                                setIsServerOpen(false)
                                            }}
                                            style={{
                                                background: selectedServer === server ? 'rgba(217, 43, 75, 0.1)' : 'transparent',
                                                color: selectedServer === server ? 'var(--brand-red-main)' : 'var(--text-secondary)',
                                                border: 'none',
                                                padding: '0.5rem 1rem',
                                                textAlign: 'left',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '0.9rem',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (selectedServer !== server) {
                                                    e.currentTarget.style.color = 'var(--brand-white)'
                                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (selectedServer !== server) {
                                                    e.currentTarget.style.color = 'var(--text-secondary)'
                                                    e.currentTarget.style.background = 'transparent'
                                                }
                                            }}
                                        >
                                            {server}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Divider */}
                    <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 0.5rem' }}></div>

                    {/* Input */}
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder={placeholder}
                        style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--brand-white)',
                            fontSize: '1rem',
                            outline: 'none',
                            padding: '0 0.5rem'
                        }}
                        {...props}
                    />

                    {/* Clear Button */}
                    {value && (
                        <button
                            type="button"
                            onClick={() => setValue('')}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                padding: '0 0.5rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    )}

                    {/* Search Button (Icon Only) */}
                    <button
                        type="submit"
                        aria-label="Search"
                        style={{
                            background: 'var(--brand-red-main)',
                            border: 'none',
                            borderRadius: '50%', // Circle
                            color: 'white',
                            width: '42px', // Fixed size
                            height: '42px', // Fixed size match
                            margin: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'transform 0.1s, background 0.2s',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--brand-red-dark)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--brand-red-main)'}
                        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                    </button>
                </div>
            </div>

            {/* Global Styles for Gradient Animation */}
            <style jsx global>{`
                @keyframes gradientMove {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
            `}</style>
        </form>
    )
}
