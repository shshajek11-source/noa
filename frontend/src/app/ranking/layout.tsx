'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import RankingFilterBar from '../components/ranking/RankingFilterBar'
import styles from '../components/ranking/Ranking.module.css'

export default function RankingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()

    const tabs = [
        { name: 'NOA 전투력', path: '/ranking/noa' },
        { name: '게임 내 전투력', path: '/ranking/cp' },
        { name: '콘텐츠 랭킹', path: '/ranking/content' },
    ]

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
            <h1 style={{
                fontSize: '1.8rem',
                fontWeight: 'bold',
                marginBottom: '2rem',
                borderLeft: '4px solid #3b82f6',
                paddingLeft: '1rem',
                color: '#fff'
            }}>
                랭킹 현황
            </h1>

            {/* Ranking Type Tags */}
            <div className={styles.tabNav}>
                {tabs.map((tab) => {
                    const isActive = pathname === tab.path || (tab.path === '/ranking/noa' && pathname === '/ranking')
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
            <RankingFilterBar />

            {/* Content (Table) */}
            <div className="card" style={{ minHeight: '500px', padding: 0 }}>
                {children}
            </div>
        </div>
    )
}
