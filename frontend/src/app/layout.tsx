'use client'

import './globals.css'
import Script from 'next/script'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import HeroSection from './components/home/HeroSection'
import Header from './components/shared/Header'
import MobileHeader from './components/shared/MobileHeader'
// import DebugPanel from '@/components/DebugPanel'  // 비활성화
import Footer from '@/components/Footer'
import { SyncProvider } from '../context/SyncContext'
import { AuthProvider } from '../context/AuthContext'
import GatePage from '../components/GatePage'

// 게이트 페이지 활성화 여부 (true: 비밀코드 입력 필요, false: 바로 접근 가능)
const GATE_ENABLED = true

export default function RootLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const [isMobile, setIsMobile] = useState(false)
    const [isClient, setIsClient] = useState(false)

    const isAdminPage = pathname?.startsWith('/admin')
    const isOcrTestPage = pathname?.startsWith('/ocr-test')
    const isAuthCallback = pathname?.startsWith('/auth/callback')
    const isMobileLedger = pathname?.startsWith('/ledger/mobile')

    // 클라이언트 사이드 모바일 감지
    useEffect(() => {
        setIsClient(true)
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024)
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // Admin 페이지, OCR 테스트 페이지, Auth 콜백 (독립 레이아웃)
    if (isAdminPage || isOcrTestPage || isAuthCallback) {
        return (
            <html lang="ko">
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                    <link rel="preconnect" href="https://fonts.googleapis.com" />
                    <link rel="preconnect" href="https://fonts.gstatic.com" />
                    <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&display=swap" rel="stylesheet" />
                </head>
                <body style={{ margin: 0, padding: 0 }}>
                    <AuthProvider>
                        {children}
                    </AuthProvider>
                </body>
            </html>
        )
    }

    // 일반 페이지 레이아웃 - Adaptive Design
    return (
        <html lang="ko">
            <head>
                <title>SUGO - AION 2 캐릭터 검색 및 랭킹</title>
                <meta name="description" content="AION 2 캐릭터 검색, 랭킹, 장비 정보, 스탯 비교 서비스. 실시간 캐릭터 정보와 서버별 랭킹을 확인하세요." />
                <meta name="keywords" content="AION 2, 아이온2, 캐릭터 검색, 랭킹, 장비, 스탯, SUGO" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                <meta name="google-adsense-account" content="ca-pub-2302283411324365" />

                {/* Open Graph */}
                <meta property="og:title" content="SUGO - AION 2 캐릭터 검색 및 랭킹" />
                <meta property="og:description" content="AION 2 캐릭터 검색, 랭킹, 장비 정보, 스탯 비교 서비스" />
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://hiton.vercel.app" />
                <meta property="og:site_name" content="SUGO" />

                {/* Twitter Card */}
                <meta name="twitter:card" content="summary" />
                <meta name="twitter:title" content="SUGO - AION 2 캐릭터 검색 및 랭킹" />
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
                    {GATE_ENABLED ? (
                        <GatePage>
                            <SyncProvider>
                                {/* Header - Mobile vs Desktop */}
                                {isClient && isMobile ? <MobileHeader /> : <Header />}

                                {/* Hero Section - Desktop Only */}
                                {!isMobile && <HeroSection />}

                                {/* Main Content - Adaptive Container */}
                                <div className="container">
                                    {children}
                                </div>

                                {/* Footer */}
                                <Footer />
                            </SyncProvider>
                        </GatePage>
                    ) : (
                        <SyncProvider>
                            {/* Header - Mobile vs Desktop */}
                            {isClient && isMobile ? <MobileHeader /> : <Header />}

                            {/* Hero Section - Desktop Only */}
                            {!isMobile && <HeroSection />}

                            {/* Main Content - Adaptive Container */}
                            <div className="container">
                                {children}
                            </div>

                            {/* Footer */}
                            <Footer />
                        </SyncProvider>
                    )}
                </AuthProvider>
            </body>
        </html>
    )
}
