'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from '../components/item/ItemTier.module.css'

export default function ItemLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()

    const tabs = [
        { name: '인기 아이템 티어', path: '/item/tier' },
        { name: '아이템 검색', path: '/item/search' },
    ]

    return (
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
            <h1 style={{
                fontSize: '1.75rem',
                fontWeight: 'bold',
                color: 'var(--text-main)',
                marginBottom: '1.5rem'
            }}>
                아이템 정보
            </h1>

            {/* 탭 네비게이션 */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                borderBottom: '1px solid var(--border)',
                paddingBottom: '1rem'
            }}>
                {tabs.map(tab => {
                    const isActive = pathname === tab.path || (tab.path === '/item/tier' && pathname === '/item')
                    return (
                        <Link
                            key={tab.path}
                            href={tab.path}
                            style={{
                                padding: '0.5rem 1rem',
                                background: isActive ? 'var(--primary)' : 'transparent',
                                color: isActive ? 'var(--primary-text)' : 'var(--text-secondary)',
                                borderRadius: '6px',
                                textDecoration: 'none',
                                fontWeight: isActive ? 'bold' : 'normal',
                                transition: 'all 0.2s'
                            }}
                        >
                            {tab.name}
                        </Link>
                    )
                })}
            </div>

            {/* 콘텐츠 영역 */}
            <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                {children}
            </div>
        </div>
    )
}
