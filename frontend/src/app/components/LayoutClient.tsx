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
import { Agentation } from 'agentation'

// 게이트 페이지 활성화 여부 (true: 비밀코드 입력 필요, false: 바로 접근 가능)
const GATE_ENABLED = false

export default function LayoutClient({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const [isMobile, setIsMobile] = useState(false)
    const [isClient, setIsClient] = useState(false)

    const isAdminPage = pathname?.startsWith('/admin')
    const isOcrTestPage = pathname?.startsWith('/ocr-test')
    const isAuthCallback = pathname?.startsWith('/auth/callback')

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
            <AuthProvider>
                {children}
            </AuthProvider>
        )
    }

    // 일반 페이지 레이아웃 - Adaptive Design
    return (
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

                    {/* Agentation - 개발 환경에서만 활성화 */}
                    {process.env.NODE_ENV === 'development' && <Agentation />}
                </SyncProvider>
            )}
        </AuthProvider>
    )
}
