'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface TabItem {
    id: string
    label: string | React.ReactNode
    content?: React.ReactNode
    disabled?: boolean
}

interface DSTabsProps {
    tabs: TabItem[]
    defaultTab?: string
    onChange?: (tabId: string) => void
    variant?: 'line' | 'pill'
    fullWidth?: boolean
    className?: string
}

export default function DSTabs({
    tabs,
    defaultTab,
    onChange,
    variant = 'line',
    fullWidth = false,
    className = ''
}: DSTabsProps) {
    const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)
    const activeTabContent = tabs.find(t => t.id === activeTab)?.content

    const handleTabClick = (id: string, disabled?: boolean) => {
        if (disabled) return
        setActiveTab(id)
        onChange?.(id)
    }

    return (
        <div className={className} style={{ width: '100%' }}>
            {/* Tab Header */}
            <div style={{
                display: 'flex',
                gap: variant === 'pill' ? '0.5rem' : '2rem',
                borderBottom: variant === 'line' ? '1px solid var(--border-light)' : 'none',
                marginBottom: '1.5rem',
                padding: variant === 'pill' ? '0.25rem' : '0',
                background: variant === 'pill' ? 'var(--bg-secondary)' : 'transparent',
                borderRadius: variant === 'pill' ? '8px' : '0',
                width: fullWidth ? '100%' : 'fit-content'
            }}>
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleTabClick(tab.id, tab.disabled)}
                            disabled={tab.disabled}
                            style={{
                                flex: fullWidth ? 1 : 'unset',
                                background: variant === 'pill' && isActive ? 'var(--brand-red-main)' : 'transparent',
                                color: isActive
                                    ? (variant === 'pill' ? 'white' : 'var(--brand-white)')
                                    : 'var(--text-secondary)',
                                border: 'none',
                                padding: variant === 'pill' ? '0.5rem 1rem' : '0.75rem 0',
                                cursor: tab.disabled ? 'not-allowed' : 'pointer',
                                fontSize: '0.95rem',
                                fontWeight: isActive ? 700 : 500,
                                position: 'relative',
                                transition: 'all 0.2s',
                                borderRadius: variant === 'pill' ? '6px' : '0',
                                opacity: tab.disabled ? 0.5 : 1,
                                justifyContent: 'center',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            {tab.label}
                            {variant === 'line' && isActive && (
                                <motion.div
                                    layoutId="activeTabLine"
                                    style={{
                                        position: 'absolute',
                                        bottom: '-1px',
                                        left: 0,
                                        right: 0,
                                        height: '2px',
                                        background: 'var(--brand-red-main)'
                                    }}
                                />
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Tab Content */}
            <div className="tab-content" style={{ minHeight: '200px' }}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTabContent}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    )
}
