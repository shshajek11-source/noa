'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import RankingFilterBar from './RankingFilterBar'
import RankingMobile from '../mobile/RankingMobile'
import styles from './Ranking.module.css'

export default function RankingLayoutClient({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    const tabs = [
        { name: '전투력', path: '/ranking' },
        { name: '컨텐츠', path: '/ranking/content' },
    ]

    // 현재 타입 결정
    const getCurrentType = (): 'combat' | 'content' => {
        if (pathname?.includes('/content')) return 'content'
        return 'combat'
    }

    // 모바일 뷰
    if (isMobile) {
        return <RankingMobile type={getCurrentType()} />
    }

    const currentType = getCurrentType()

    // PC 뷰
    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
            <h1 className={styles.pageTitle}>
                랭킹 현황
            </h1>

            {/* Ranking Type Tags */}
            <div className={styles.tabNav}>
                {tabs.map((tab) => {
                    const isActive = pathname === tab.path ||
                        (tab.path === '/ranking' && (pathname === '/ranking/noa' || pathname === '/ranking/cp'))
                    return (
                        <Link
                            key={tab.path}
                            href={tab.path}
                            className={`${styles.tabLink} ${isActive ? styles.tabLinkActive : ''}`}
                        >
                            {tab.name}
                        </Link>
                    )
                })}
            </div>

            {/* Filter Bar */}
            <RankingFilterBar type={currentType} />

            {/* Content (Table) - Adaptive */}
            <div className={styles.rankingCard}>
                <div className={styles.tableScroll}>
                    {children}
                </div>
            </div>
        </div>
    )
}
