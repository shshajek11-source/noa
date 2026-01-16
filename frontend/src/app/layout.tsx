'use client'

import './globals.css'
import Link from 'next/link'
import Script from 'next/script'
import { usePathname } from 'next/navigation'
import HeroSection from './components/home/HeroSection'
import SearchBar from './components/SearchBar'
import MainCharacterBadge from './components/MainCharacterBadge'
import LoginButton from '@/components/LoginButton'
// import DebugPanel from '@/components/DebugPanel'  // 비활성화
import Footer from '@/components/Footer'
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
                <title>HitOn - AION 2 캐릭터 검색 및 랭킹</title>
                <meta name="description" content="AION 2 캐릭터 검색, 랭킹, 장비 정보, 스탯 비교 서비스. 실시간 캐릭터 정보와 서버별 랭킹을 확인하세요." />
                <meta name="keywords" content="AION 2, 아이온2, 캐릭터 검색, 랭킹, 장비, 스탯, HitOn" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                <meta name="google-adsense-account" content="ca-pub-2302283411324365" />

                {/* Open Graph */}
                <meta property="og:title" content="HitOn - AION 2 캐릭터 검색 및 랭킹" />
                <meta property="og:description" content="AION 2 캐릭터 검색, 랭킹, 장비 정보, 스탯 비교 서비스" />
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://hiton.vercel.app" />
                <meta property="og:site_name" content="HitOn" />

                {/* Twitter Card */}
                <meta name="twitter:card" content="summary" />
                <meta name="twitter:title" content="HitOn - AION 2 캐릭터 검색 및 랭킹" />
                <meta name="twitter:description" content="AION 2 캐릭터 검색, 랭킹, 장비 정보, 스탯 비교 서비스" />

                <link rel="canonical" href="https://hiton.vercel.app" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" />
                <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&display=swap" rel="stylesheet" />

                <Script
                    src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2302283411324365"
                    crossOrigin="anonymous"
                    strategy="beforeInteractive"
                />
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
                                    // { name: '캐릭터비교', path: '/compare' },  // 임시 비활성화
                                    // { name: '파티분석', path: '/analysis' },   // 임시 비활성화
                                    // { name: '파티찾기', path: '/party' },      // 임시 비활성화
                                    // { name: '미니게임', path: '/minigame' },
                                    { name: '숙제&가계부', path: '/ledger' }
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

                    {/* Footer */}
                    <Footer />
                </SyncProvider>
                </AuthProvider>
            </body>
        </html>
    )
}
