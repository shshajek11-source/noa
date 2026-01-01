'use client'
import { useState, useEffect } from 'react'
import { Download, X, Clock } from 'lucide-react'

export default function FloatingAPILoader() {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [remainingTime, setRemainingTime] = useState(0)

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
    const COOLDOWN_TIME = 60 // 1분 (초 단위)

    // 쿨다운 체크
    useEffect(() => {
        const checkCooldown = () => {
            const lastLoadTime = localStorage.getItem('lastAPILoadTime')
            if (lastLoadTime) {
                const elapsed = Math.floor((Date.now() - parseInt(lastLoadTime)) / 1000)
                const remaining = COOLDOWN_TIME - elapsed
                if (remaining > 0) {
                    setRemainingTime(remaining)
                } else {
                    setRemainingTime(0)
                }
            }
        }

        checkCooldown()
        const interval = setInterval(checkCooldown, 1000)
        return () => clearInterval(interval)
    }, [])

    const loadData = async () => {
        // 쿨다운 체크
        if (remainingTime > 0) {
            setMessage(`⏱️ ${remainingTime}초 후에 다시 사용할 수 있습니다.`)
            return
        }

        setLoading(true)
        setMessage('데이터 불러오는 중...')

        try {
            // 테스트용 캐릭터 검색 (데이터 수집)
            const testCharacters = [
                { server: 'Siel', name: '혼' },
                { server: 'Siel', name: '톰' },
                { server: 'Israphel', name: '젤' },
                { server: 'Nezakan', name: '루시' },
                { server: 'Zikel', name: '카이' }
            ]

            for (const char of testCharacters) {
                await fetch(`${API_BASE_URL}/api/characters/search?server=${char.server}&name=${char.name}`)
                setMessage(`${char.server}:${char.name} 로딩 중...`)
                await new Promise(resolve => setTimeout(resolve, 1000))
            }

            // 마지막 실행 시간 저장
            localStorage.setItem('lastAPILoadTime', Date.now().toString())
            setRemainingTime(COOLDOWN_TIME)

            setMessage('✅ 데이터 로딩 완료!')
            setTimeout(() => {
                setIsOpen(false)
                setMessage('')
            }, 2000)
        } catch (error) {
            setMessage('❌ 오류 발생: ' + (error as Error).message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'fixed',
                    bottom: '2rem',
                    left: '2rem',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                    zIndex: 9999,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    color: 'white'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)'
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.5)'
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)'
                }}
            >
                {isOpen ? <X size={24} /> : <Download size={24} />}
            </button>

            {/* Modal Panel */}
            {isOpen && (
                <div style={{
                    position: 'fixed',
                    bottom: '6rem',
                    left: '2rem',
                    width: '320px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                    zIndex: 9998
                }}>
                    <h3 style={{
                        margin: '0 0 1rem 0',
                        fontSize: '1.1rem',
                        color: 'var(--primary)'
                    }}>
                        🔧 개발용 API 로더
                    </h3>

                    <p style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)',
                        marginBottom: '1rem',
                        lineHeight: '1.5'
                    }}>
                        테스트용 캐릭터 데이터를 불러옵니다.
                    </p>

                    <button
                        onClick={loadData}
                        disabled={loading || remainingTime > 0}
                        className="btn"
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: (loading || remainingTime > 0) ? 'var(--bg-hover)' : 'var(--primary)',
                            border: 'none',
                            cursor: (loading || remainingTime > 0) ? 'not-allowed' : 'pointer',
                            opacity: (loading || remainingTime > 0) ? 0.6 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        {remainingTime > 0 ? (
                            <>
                                <Clock size={16} />
                                {Math.floor(remainingTime / 60)}:{String(remainingTime % 60).padStart(2, '0')}
                            </>
                        ) : loading ? (
                            '로딩 중...'
                        ) : (
                            '데이터 불러오기'
                        )}
                    </button>

                    {message && (
                        <div style={{
                            marginTop: '1rem',
                            padding: '0.75rem',
                            background: 'var(--bg-main)',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            color: 'var(--text-main)',
                            border: '1px solid var(--border)'
                        }}>
                            {message}
                        </div>
                    )}
                </div>
            )}
        </>
    )
}
