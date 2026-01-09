'use client'

import { useEffect, useState } from 'react'

interface ErrorProps {
    error: Error & { digest?: string }
    reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
    const [showDetails, setShowDetails] = useState(false)
    const isDevelopment = process.env.NODE_ENV === 'development'

    useEffect(() => {
        // 에러 로깅 (프로덕션에서는 에러 추적 서비스로 전송 가능)
        console.error('[App Error]', error)
    }, [error])

    const copyErrorDetails = () => {
        const details = `Error: ${error.name}\nMessage: ${error.message}\nDigest: ${error.digest || 'N/A'}\nStack: ${error.stack}`
        navigator.clipboard.writeText(details)
    }

    return (
        <div style={{
            display: 'flex',
            minHeight: '100vh',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-main, #0B0D12)',
            padding: '1rem'
        }}>
            <div style={{
                maxWidth: '500px',
                textAlign: 'center',
                background: 'var(--bg-secondary, #1f2937)',
                borderRadius: '12px',
                padding: '2rem',
                border: '1px solid var(--border, #374151)'
            }}>
                <div style={{
                    fontSize: '3rem',
                    marginBottom: '1rem'
                }}>
                    ⚠️
                </div>

                <h2 style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: 'var(--text-main, #E5E7EB)',
                    marginBottom: '0.5rem'
                }}>
                    오류가 발생했습니다
                </h2>

                <p style={{
                    color: 'var(--text-secondary, #9CA3AF)',
                    marginBottom: '1.5rem',
                    fontSize: '0.9rem'
                }}>
                    일시적인 문제가 발생했습니다.<br />
                    잠시 후 다시 시도해주세요.
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginBottom: '1rem' }}>
                    <button
                        onClick={() => reset()}
                        style={{
                            background: 'var(--primary, #FACC15)',
                            color: '#000',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.75rem 1.5rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                        }}
                    >
                        다시 시도
                    </button>
                    <button
                        onClick={() => window.location.href = '/'}
                        style={{
                            background: 'transparent',
                            color: 'var(--text-secondary, #9CA3AF)',
                            border: '1px solid var(--border, #374151)',
                            borderRadius: '8px',
                            padding: '0.75rem 1.5rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                        }}
                    >
                        홈으로
                    </button>
                </div>

                {/* 에러 상세 정보 (개발 모드 또는 토글 시) */}
                {(isDevelopment || showDetails) && (
                    <div style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: '8px',
                        textAlign: 'left',
                        fontSize: '0.75rem',
                        fontFamily: 'monospace',
                        color: '#9CA3AF',
                        maxHeight: '200px',
                        overflow: 'auto'
                    }}>
                        <div style={{ color: '#FF6B6B', marginBottom: '0.5rem' }}>
                            <strong>{error.name}:</strong> {error.message}
                        </div>
                        {error.digest && (
                            <div style={{ marginBottom: '0.5rem' }}>
                                <strong>Digest:</strong> {error.digest}
                            </div>
                        )}
                        {error.stack && (
                            <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.65rem' }}>
                                {error.stack}
                            </div>
                        )}
                    </div>
                )}

                {/* 디버그 토글 버튼 */}
                <div style={{ marginTop: '1rem' }}>
                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-secondary, #6B7280)',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            marginRight: '1rem'
                        }}
                    >
                        {showDetails ? '상세 정보 숨기기' : '상세 정보 보기'}
                    </button>
                    {showDetails && (
                        <button
                            onClick={copyErrorDetails}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-secondary, #6B7280)',
                                fontSize: '0.75rem',
                                cursor: 'pointer'
                            }}
                        >
                            📋 복사
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
