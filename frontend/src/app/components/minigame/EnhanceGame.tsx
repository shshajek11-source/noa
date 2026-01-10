'use client'

import React, { useState } from 'react'
import { Hammer, RefreshCw, Gem, X } from 'lucide-react'
import styles from './EnhanceGame.module.css'

export default function EnhanceGame() {
    const [stats, setStats] = useState({ success: 0, fail: 0 })
    const [history, setHistory] = useState<('success' | 'fail')[]>([])
    const [isAnimating, setIsAnimating] = useState(false)

    // Configuration
    const BASE_SUCCESS_RATE = 0.5 // 50% chance

    const handleEnhance = () => {
        if (isAnimating) return

        setIsAnimating(true)

        // Simple delay to simulate process
        setTimeout(() => {
            const isSuccess = Math.random() < BASE_SUCCESS_RATE

            setStats(prev => ({
                success: prev.success + (isSuccess ? 1 : 0),
                fail: prev.fail + (isSuccess ? 0 : 1)
            }))
            setHistory(prev => [...prev, isSuccess ? 'success' : 'fail'])
            setIsAnimating(false)
        }, 500)
    }

    const reset = () => {
        setStats({ success: 0, fail: 0 })
        setHistory([])
    }

    const total = stats.success + stats.fail
    const successPercent = total > 0 ? (stats.success / total) * 100 : 0
    const failPercent = total > 0 ? (stats.fail / total) * 100 : 0

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px' }}>
            {/* Game Container */}
            <div className={styles.gameContainer}>

                {/* Header */}
                <div className={styles.header}>
                    <h3 className={styles.title}>
                        중급 마석 (입문 LV 20)
                    </h3>
                    <button className={styles.closeBtn}>
                        <X size={18} strokeWidth={1.5} />
                    </button>
                </div>

                {/* Body */}
                <div className={styles.body}>
                    {/* Icon Box */}
                    <div className={styles.iconBox}>
                        <div className={`${styles.glow} ${isAnimating ? styles.glowActive : ''}`}></div>
                        <Gem className={`${styles.gemIcon} ${isAnimating ? styles.gemActive : ''}`} size={24} />
                    </div>

                    {/* Bars Section */}
                    <div className={styles.barsSection}>
                        {/* Success Row */}
                        <div className={styles.barRow}>
                            <div className={styles.labelRow}>
                                <span className={styles.barLabel}>성공</span>
                                <span className={styles.barValue}>{stats.success}회 ({successPercent.toFixed(1)}%)</span>
                            </div>
                            <div className={styles.barTrack}>
                                <div
                                    className={`${styles.barFill} ${styles.successFill}`}
                                    style={{ width: `${Math.min(100, (stats.success / (total || 1)) * 100)}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Fail Row */}
                        <div className={styles.barRow}>
                            <div className={styles.labelRow}>
                                <span className={styles.barLabel}>실패</span>
                                <span className={styles.barValue}>{stats.fail}회 ({failPercent.toFixed(1)}%)</span>
                            </div>
                            <div className={styles.barTrack}>
                                <div
                                    className={`${styles.barFill} ${styles.failFill}`}
                                    style={{ width: `${Math.min(100, (stats.fail / (total || 1)) * 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className={styles.controls}>
                <button
                    onClick={handleEnhance}
                    disabled={isAnimating}
                    className={styles.enhanceBtn}
                >
                    <Hammer size={18} />
                    {isAnimating ? '강화 중...' : '강화 시도'}
                </button>

                <button
                    onClick={reset}
                    className={styles.resetBtn}
                >
                    <RefreshCw size={18} />
                    초기화
                </button>
            </div>

            {/* Log / History text */}
            <div className={styles.logContainer}>
                {history.map((res, idx) => (
                    <div key={idx} className={res === 'success' ? styles.logSuccess : styles.logFail}>
                        #{idx + 1}: {res === 'success' ? '성공했습니다!' : '실패했습니다.'}
                    </div>
                ))}
                {history.length === 0 && <div className={styles.noLog}>기록이 없습니다.</div>}
            </div>
        </div>
    )
}
