'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

// 컴포넌트 동적 로딩
const PartyMobile = dynamic(() => import('./components/PartyMobile'), { ssr: false })
const PartyDesktop = dynamic(() => import('./components/PartyDesktop'), { ssr: false })

// 임시 비활성화 플래그
const DISABLED = false;

export default function PartyPage() {
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)

  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }

    checkMobile()
    setMounted(true)

    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 페이지 비활성화
  if (DISABLED) {
    return (
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        textAlign: 'center',
        background: 'linear-gradient(180deg, #0B0D12 0%, #1a1d24 100%)'
      }}>
        <div style={{
          fontSize: '64px',
          marginBottom: '24px'
        }}>🔧</div>
        <h1 style={{
          fontSize: '1.8rem',
          fontWeight: 700,
          color: '#E5E7EB',
          marginBottom: '12px'
        }}>파티 찾기 페이지 준비 중</h1>
        <p style={{
          fontSize: '1rem',
          color: '#9CA3AF',
          marginBottom: '32px',
          lineHeight: 1.6
        }}>
          더 나은 서비스를 위해 페이지를 개선하고 있습니다.<br />
          빠른 시일 내에 다시 찾아뵙겠습니다.
        </p>
        <a href="/" style={{
          padding: '12px 24px',
          background: '#FACC15',
          color: '#0B0D12',
          borderRadius: '8px',
          fontWeight: 600,
          textDecoration: 'none'
        }}>메인으로 돌아가기</a>
      </div>
    );
  }

  // 초기 로딩 중에는 아무것도 보여주지 않거나 스켈레톤 (Hydration Mismatch 방지)
  if (!mounted) return null

  // 모바일이면 전용 컴포넌트 렌더링
  if (isMobile) {
    return <PartyMobile />
  }

  // 데스크탑 컴포넌트 렌더링
  return <PartyDesktop />
}
