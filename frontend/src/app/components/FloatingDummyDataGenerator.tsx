'use client'
import { useState } from 'react'
import { Database, X, Trash2 } from 'lucide-react'

export default function FloatingDummyDataGenerator() {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

    const generateDummyData = async (count: number) => {
        setLoading(true)
        setMessage(`${count}개 더미 데이터 생성 중...`)

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/generate-dummy-data?count=${count}`, {
                method: 'POST'
            })

            const data = await response.json()

            if (response.ok) {
                setMessage(`✅ ${data.message}`)
                setTimeout(() => {
                    window.location.reload()
                }, 1500)
            } else {
                setMessage(`❌ 오류: ${data.detail}`)
            }
        } catch (error) {
            setMessage(`❌ 네트워크 오류: ${(error as Error).message}`)
        } finally {
            setLoading(false)
        }
    }

    const deleteDummyData = async () => {
        if (!confirm('생성한 더미 데이터를 모두 삭제하시겠습니까?')) {
            return
        }

        setLoading(true)
        setMessage('더미 데이터 삭제 중...')

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/delete-dummy-data`, {
                method: 'DELETE'
            })

            const data = await response.json()

            if (response.ok) {
                setMessage(`✅ ${data.message}`)
                setTimeout(() => {
                    window.location.reload()
                }, 1500)
            } else {
                setMessage(`❌ 오류: ${data.detail}`)
            }
        } catch (error) {
            setMessage(`❌ 네트워크 오류: ${(error as Error).message}`)
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
                    left: '5.5rem', // API로더 버튼 옆에 배치
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
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
                {isOpen ? <X size={24} /> : <Database size={24} />}
            </button>

            {/* Modal Panel */}
            {isOpen && (
                <div style={{
                    position: 'fixed',
                    bottom: '6rem',
                    left: '5.5rem',
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
                        🛠️ 더미 데이터 생성기
                    </h3>

                    <p style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)',
                        marginBottom: '1rem',
                        lineHeight: '1.5'
                    }}>
                        테스트용 랜덤 캐릭터 데이터를 생성합니다.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <button
                            onClick={() => generateDummyData(50)}
                            disabled={loading}
                            className="btn-outline"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                fontSize: '0.9rem',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.6 : 1
                            }}
                        >
                            50개 생성
                        </button>

                        <button
                            onClick={() => generateDummyData(100)}
                            disabled={loading}
                            className="btn"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                fontSize: '0.9rem',
                                background: loading ? 'var(--bg-hover)' : 'var(--primary)',
                                border: 'none',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.6 : 1
                            }}
                        >
                            100개 생성
                        </button>

                        <button
                            onClick={() => generateDummyData(200)}
                            disabled={loading}
                            className="btn-outline"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                fontSize: '0.9rem',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.6 : 1
                            }}
                        >
                            200개 생성
                        </button>

                        <div style={{
                            width: '100%',
                            height: '1px',
                            background: 'var(--border)',
                            margin: '0.5rem 0'
                        }} />

                        <button
                            onClick={deleteDummyData}
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                fontSize: '0.9rem',
                                background: loading ? 'var(--bg-hover)' : '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.6 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                if (!loading) e.currentTarget.style.background = '#dc2626'
                            }}
                            onMouseLeave={(e) => {
                                if (!loading) e.currentTarget.style.background = '#ef4444'
                            }}
                        >
                            <Trash2 size={16} />
                            더미 데이터 삭제
                        </button>
                    </div>

                    {message && (
                        <div style={{
                            marginTop: '1rem',
                            padding: '0.75rem',
                            background: 'var(--bg-main)',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            color: message.includes('✅') ? '#10b981' : message.includes('❌') ? '#ef4444' : 'var(--text-main)',
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
