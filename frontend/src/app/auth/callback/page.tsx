'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

const DEVICE_ID_KEY = 'ledger_device_id'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isPopup = searchParams.get('popup') === 'true'
  const [status, setStatus] = useState('로그인 처리 중...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get session from URL hash
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) throw sessionError
        if (!session) {
          throw new Error('세션을 찾을 수 없습니다')
        }

        // 팝업 모드: 빠르게 처리하고 즉시 닫기
        if (isPopup) {
          // device_id 마이그레이션 (백그라운드)
          const deviceId = localStorage.getItem(DEVICE_ID_KEY)
          if (deviceId) {
            fetch('/api/auth/migrate-device', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({ device_id: deviceId })
            }).then(() => {
              localStorage.removeItem(DEVICE_ID_KEY)
            }).catch(console.error)
          }

          // 즉시 창 닫기
          window.close()
          return
        }

        // 일반 모드: 기존 로직
        setStatus('로그인 성공!')

        const deviceId = localStorage.getItem(DEVICE_ID_KEY)
        if (deviceId) {
          setStatus('기존 데이터를 계정에 연결 중...')

          const res = await fetch('/api/auth/migrate-device', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ device_id: deviceId })
          })

          if (res.ok) {
            const data = await res.json()
            if (data.migrated) {
              localStorage.removeItem(DEVICE_ID_KEY)
            }
          }
        }

        setTimeout(() => router.push('/ledger'), 500)

      } catch (err: any) {
        console.error('Auth callback error:', err)
        setError(err.message)

        // 팝업 에러 시에도 3초 후 자동 닫기
        if (isPopup) {
          setTimeout(() => window.close(), 3000)
        }
      }
    }

    handleCallback()
  }, [router, isPopup])

  // 전체 화면을 덮는 오버레이 스타일 (사이트 레이아웃 가림)
  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0B0D12'
  }

  if (error) {
    return (
      <div style={overlayStyle}>
        <div style={{
          padding: '32px',
          background: '#1b1b1e',
          borderRadius: '12px',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <h2 style={{ color: '#ef4444', fontSize: '20px', marginBottom: '8px' }}>
            로그인 실패
          </h2>
          <p style={{ color: '#9ca3af', marginBottom: '24px' }}>{error}</p>
          {isPopup && (
            <p style={{ color: '#6b7280', fontSize: '14px' }}>3초 후 자동으로 닫힙니다...</p>
          )}
          <button
            onClick={() => isPopup ? window.close() : router.push('/')}
            style={{
              padding: '10px 24px',
              background: '#FACC15',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            {isPopup ? '창 닫기' : '홈으로 이동'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={overlayStyle}>
      <div style={{
        padding: '32px',
        background: '#1b1b1e',
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '3px solid #2d2d30',
          borderTopColor: '#FACC15',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }} />
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{ color: '#fff', fontSize: '16px' }}>{status}</p>
      </div>
    </div>
  )
}
