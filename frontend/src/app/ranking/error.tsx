'use client'

import { useEffect } from 'react'

interface ErrorProps {
    error: Error & { digest?: string }
    reset: () => void
}

export default function RankingError({ error, reset }: ErrorProps) {
    useEffect(() => {
        console.error('[Ranking Error]', error)
    }, [error])

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
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📊</div>

                <h2 style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: 'var(--text-main, #E5E7EB)',
                    marginBottom: '0.5rem'
                }}>
                    랭킹 데이터를 불러올 수 없습니다
                </h2>

                <p style={{
                    color: 'var(--text-secondary, #9CA3AF)',
                    marginBottom: '1.5rem',
                    fontSize: '0.875rem'
                }}>
                    서버 연결에 문제가 있거나 데이터가 일시적으로 이용 불가합니다.
                </p>

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
