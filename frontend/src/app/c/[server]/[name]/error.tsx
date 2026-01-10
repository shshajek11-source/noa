'use client'

import { useEffect } from 'react'

interface ErrorProps {
    error: Error & { digest?: string }
    reset: () => void
}

export default function CharacterError({ error, reset }: ErrorProps) {
    useEffect(() => {
        console.error('[Character Error]', error)
    }, [error])

    const isNotFound = error.message?.includes('not found') || error.message?.includes('404')

    return (
        <div style={{
            display: 'flex',
            minHeight: '60vh',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
        }}>
            <div style={{
                maxWidth: '400px',
                textAlign: 'center',
                background: 'var(--bg-secondary, #1f2937)',
                borderRadius: '12px',
                padding: '2rem',
                border: '1px solid var(--border, #374151)'
            }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
                    {isNotFound ? '🔍' : '⚠️'}
                </div>

                <h2 style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: 'var(--text-main, #E5E7EB)',
                    marginBottom: '0.5rem'
                }}>
                    {isNotFound ? '캐릭터를 찾을 수 없습니다' : '캐릭터 정보 로드 실패'}
                </h2>

                <p style={{
                    color: 'var(--text-secondary, #9CA3AF)',
                    marginBottom: '1rem',
                    fontSize: '0.875rem'
                }}>
                    {isNotFound
                        ? '입력하신 캐릭터가 존재하지 않거나 서버 정보가 올바르지 않습니다.'
                        : '캐릭터 정보를 불러오는 중 오류가 발생했습니다.'
                    }
                </p>

                {/* 디버그: 실제 에러 메시지 표시 */}
                {error.message && (
                    <p style={{
                        color: '#EF4444',
                        marginBottom: '1.5rem',
                        fontSize: '0.75rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        padding: '0.5rem',
                        borderRadius: '4px',
                        wordBreak: 'break-all'
                    }}>
                        {error.message}
                    </p>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                    <button
                        onClick={() => reset()}
                        style={{
                            background: 'var(--primary, #FACC15)',
                            color: '#000',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.625rem 1.25rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '0.875rem'
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
                            padding: '0.625rem 1.25rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            fontSize: '0.875rem'
                        }}
                    >
                        홈으로
                    </button>
                </div>
            </div>
        </div>
    )
}
