'use client'

import './globals.css'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import HeroSection from './components/home/HeroSection'
import SearchBar from './components/SearchBar'
import MainCharacterBadge from './components/MainCharacterBadge'
import LoginButton from '@/components/LoginButton'
import DebugPanel from '@/components/DebugPanel'
import { SyncProvider } from '../context/SyncContext'
import { AuthProvider } from '../context/AuthContext'

export default function RootLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const isAdminPage = pathname?.startsWith('/admin')

    // Admin 페이지는 완전히 독립된 레이아웃 사용
    if (isAdminPage) {
        return (
            <html lang="ko">
                <head>
                    <link rel="preconnect" href="https://fonts.googleapis.com" />
                    <link rel="preconnect" href="https://fonts.gstatic.com" />
                    <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&display=swap" rel="stylesheet" />
                </head>
                <body style={{ margin: 0, padding: 0 }}>
                    {children}
                </body>
            </html>
        )
    }

    // 일반 페이지 레이아웃 - Adaptive Design
    return (
        <html lang="ko">
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" />
                <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&display=swap" rel="stylesheet" />
            </head>
            <body>
                <AuthProvider>
                <SyncProvider>
                    {/* Header - Adaptive */}
                    <header className="header-adaptive" style={{ marginBottom: '0' }}>
                        <div className="header-inner">
                            <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
                                <img src="/logo.png" alt="HitOn" className="header-logo" style={{ width: 'auto' }} />
                            </Link>

                            <nav className="nav" style={{ marginBottom: 0 }}>
                                {[
                                    { name: '홈', path: '/' },
                                    { name: '랭킹', path: '/ranking' },
                                    { name: '아이템', path: '/item' },
                                    { name: '캐릭터비교', path: '/compare' },
                                    { name: '파티분석', path: '/analysis' },
                                    { name: '미니게임', path: '/minigame' },
                                    { name: '가계부', path: '/ledger' }
                                ].map(item => {
                                    const isActive = item.path === '/'
                                        ? pathname === '/'
                                        : pathname?.startsWith(item.path)

                                    return (
                                        <Link
                                            key={item.path}
                                            href={item.path}
                                            style={{
                                                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                                                fontWeight: isActive ? 'bold' : '600'
                                            }}
                                        >
                                            {item.name}
                                        </Link>
                                    )
                                })}
                            </nav>

                            {/* 로그인 버튼 & 대표 캐릭터 배지 */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <LoginButton />
                                <MainCharacterBadge />
                            </div>
                        </div>
                    </header>

                    {/* Hero Section - Adaptive */}
                    <HeroSection />

                    {/* Main Content - Adaptive Container */}
                    <div className="container">
                        {children}
                    </div>

                    {/* Debug Panel */}
                    <DebugPanel />
                </SyncProvider>
                </AuthProvider>
            </body>
        </html>
    )
}
