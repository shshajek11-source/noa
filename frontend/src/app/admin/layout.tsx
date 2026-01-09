'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const menuItems = [
    { icon: '📊', label: '대시보드', path: '/admin', description: '통계 및 현황' },
    { icon: '🔄', label: '크롤링', path: '/admin/crawl', description: '랭킹 데이터 수집' },
    { icon: '🔍', label: '캐릭터 수집', path: '/admin/collector', description: '전체 캐릭터 수집' },
    { icon: '📁', label: '데이터', path: '/admin/data', description: '관리 및 편집' },
    { icon: '⚙️', label: '설정', path: '/admin/settings', description: '시스템 설정' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const [sidebarOpen, setSidebarOpen] = useState(true)

    return (
        <div style={{
            display: 'flex',
            minHeight: '100vh',
            background: 'var(--bg-main)'
        }}>
            {/* Sidebar */}
            <aside style={{
                width: sidebarOpen ? '240px' : '72px',
                background: 'linear-gradient(180deg, #111318 0%, #0D0F14 100%)',
                borderRight: '1px solid var(--brand-red-muted)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'width 0.25s ease',
                position: 'relative'
            }}>
                {/* Logo Area */}
                <div style={{
                    padding: '1.25rem',
                    borderBottom: '1px solid rgba(217, 43, 75, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    minHeight: '70px'
                }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        background: 'linear-gradient(135deg, var(--brand-red-main), var(--brand-red-dark))',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        boxShadow: '0 4px 12px rgba(217, 43, 75, 0.3)'
                    }}>
                        🎮
                    </div>
                    {sidebarOpen && (
                        <div>
                            <div style={{
                                fontWeight: 'bold',
                                color: 'var(--brand-white)',
                                fontSize: '1rem',
                                letterSpacing: '-0.02em'
                            }}>
                                AION2
                            </div>
                            <div style={{
                                fontSize: '0.65rem',
                                color: 'var(--brand-red-main)',
                                fontWeight: 600
                            }}>
                                Admin Panel
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav style={{ flex: 1, padding: '1rem 0.75rem' }}>
                    <div style={{
                        fontSize: '0.65rem',
                        color: 'var(--text-disabled)',
                        padding: '0 0.75rem',
                        marginBottom: '0.5rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        {sidebarOpen ? '메뉴' : ''}
                    </div>

                    {menuItems.map(item => {
                        const isActive = pathname === item.path ||
                            (item.path !== '/admin' && pathname.startsWith(item.path))

                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: sidebarOpen ? '0.7rem 0.75rem' : '0.7rem',
                                    marginBottom: '0.25rem',
                                    borderRadius: '8px',
                                    color: isActive ? 'var(--brand-white)' : 'var(--text-secondary)',
                                    background: isActive
                                        ? 'linear-gradient(90deg, rgba(217, 43, 75, 0.2), transparent)'
                                        : 'transparent',
                                    textDecoration: 'none',
                                    fontSize: '0.85rem',
                                    fontWeight: isActive ? '600' : '400',
                                    transition: 'all 0.2s ease',
                                    borderLeft: isActive ? '3px solid var(--brand-red-main)' : '3px solid transparent',
                                    justifyContent: sidebarOpen ? 'flex-start' : 'center'
                                }}
                            >
                                <span style={{
                                    fontSize: '1.1rem',
                                    filter: isActive ? 'none' : 'grayscale(50%)',
                                    transition: 'filter 0.2s'
                                }}>
                                    {item.icon}
                                </span>
                                {sidebarOpen && (
                                    <div>
                                        <div>{item.label}</div>
                                        <div style={{
                                            fontSize: '0.65rem',
                                            color: 'var(--text-disabled)',
                                            fontWeight: 400
                                        }}>
                                            {item.description}
                                        </div>
                                    </div>
                                )}
                            </Link>
                        )
                    })}
                </nav>

                {/* Bottom Section */}
                <div style={{
                    padding: '0.75rem',
                    borderTop: '1px solid rgba(217, 43, 75, 0.2)'
                }}>
                    {/* Toggle Button */}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        style={{
                            width: '100%',
                            padding: '0.6rem',
                            background: 'rgba(217, 43, 75, 0.1)',
                            border: '1px solid var(--brand-red-muted)',
                            borderRadius: '6px',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        {sidebarOpen ? '◀ 사이드바 접기' : '▶'}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                background: 'var(--bg-main)'
            }}>
                {/* Top Header */}
                <header style={{
                    padding: '0.75rem 1.5rem',
                    background: '#111318',
                    borderBottom: '1px solid var(--brand-red-muted)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    minHeight: '56px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{
                            width: '4px',
                            height: '20px',
                            background: 'var(--brand-red-main)',
                            borderRadius: '2px'
                        }} />
                        <h1 style={{
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            color: 'var(--brand-white)',
                            margin: 0
                        }}>
                            {menuItems.find(m =>
                                pathname === m.path ||
                                (m.path !== '/admin' && pathname.startsWith(m.path))
                            )?.label || '관리자'}
                        </h1>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {/* Status Indicator */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.4rem 0.75rem',
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: '20px',
                            fontSize: '0.7rem',
                            color: '#34D399'
                        }}>
                            <span style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: '#34D399',
                                boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)'
                            }} />
                            시스템 정상
                        </div>

                        {/* Home Link */}
                        <Link
                            href="/"
                            style={{
                                padding: '0.5rem 1rem',
                                background: 'rgba(217, 43, 75, 0.1)',
                                border: '1px solid var(--brand-red-muted)',
                                borderRadius: '6px',
                                color: 'var(--text-secondary)',
                                textDecoration: 'none',
                                fontSize: '0.8rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s'
                            }}
                        >
                            🏠 사이트로
                        </Link>
                    </div>
                </header>

                {/* Page Content */}
                <div style={{
                    flex: 1,
                    padding: '1.25rem',
                    overflowY: 'auto',
                    background: 'linear-gradient(180deg, var(--bg-main) 0%, #0A0B0E 100%)'
                }}>
                    {children}
                </div>
            </main>
        </div>
    )
}
