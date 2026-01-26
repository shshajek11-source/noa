'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import HeroSection from './home/HeroSection'
import Header from './shared/Header'
import MobileHeader from './mobile/MobileHeader'
import Footer from '@/components/Footer'
import { SyncProvider } from '../../context/SyncContext'
import { AuthProvider } from '../../context/AuthContext'
import GatePage from '../../components/GatePage'
import Prefetcher from './Prefetcher'
import AppDownloadPopup from './AppDownloadPopup'
import { Agentation } from 'agentation'

// 게이트 페이지 활성화 여부 (true: 비밀코드 입력 필요, false: 바로 접근 가능)
const GATE_ENABLED = false

export default function LayoutClient({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    // null = 감지 전, true/false = 감지 완료 (플래시 방지)
    const [isMobile, setIsMobile] = useState<boolean | null>(null)

    const isAdminPage = pathname?.startsWith('/admin')
    const isOcrTestPage = pathname?.startsWith('/ocr-test')
    const isAuthCallback = pathname?.startsWith('/auth/callback')

    // 클라이언트 사이드 모바일 감지
    useEffect(() => {
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
            <AuthProvider>
                {children}
            </AuthProvider>
        )
    }

    // 모바일 감지 완료 전에는 로딩 화면 표시 (PC/모바일 플래시 방지)
    if (isMobile === null) {
        return (
            <AuthProvider>
                <div style={{
                    minHeight: '100vh',
                    backgroundColor: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div style={{ color: '#666', fontSize: '14px' }}>로딩 중...</div>
                </div>
            </AuthProvider>
        )
    }

    // 일반 페이지 레이아웃 - Adaptive Design
    return (
        <AuthProvider>
            {GATE_ENABLED ? (
                <GatePage>
                    <SyncProvider>
                        {/* 백그라운드 프리페칭 */}
                        <Prefetcher />

                        {/* Header - Mobile vs Desktop */}
                        {isMobile ? <MobileHeader /> : <Header />}

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
                    {/* 백그라운드 프리페칭 */}
                    <Prefetcher />

                    {/* Header - Mobile vs Desktop */}
                    {isMobile ? <MobileHeader /> : <Header />}

                    {/* Hero Section - Desktop Only */}
                    {!isMobile && <HeroSection />}

                    {/* Main Content - Adaptive Container */}
                    <div className="container">
                        {children}
                    </div>

                    {/* Footer */}
                    <Footer />

                    {/* 앱 다운로드 팝업 - 모바일만 */}
                    {isMobile && <AppDownloadPopup />}

                    {/* Agentation - 개발 환경에서만 활성화 */}
                    {process.env.NODE_ENV === 'development' && <Agentation />}
                </SyncProvider>
            )}
        </AuthProvider>
    )
}
