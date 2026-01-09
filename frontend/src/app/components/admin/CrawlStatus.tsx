'use client'

import Link from 'next/link'

interface CrawlStatusProps {
    status: {
        current: number
        total: number
        percentage: number
        currentContent: string
        currentServer: string
    } | null
}

export default function CrawlStatus({ status }: CrawlStatusProps) {
    return (
        <div style={{
            background: '#111318',
            border: '1px solid #1F2433',
            borderRadius: '12px',
            padding: '1.25rem',
            height: '100%'
        }}>
            <h3 style={{
                fontSize: '0.9rem',
                fontWeight: 'bold',
                color: '#E5E7EB',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
            }}>
                <span>🔄</span> 크롤링 상태
            </h3>

            {status ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{
                        background: '#0B0D12',
                        borderRadius: '4px',
                        height: '8px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${status.percentage}%`,
                            background: 'linear-gradient(90deg, #FACC15, #F59E0B)',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>
                        {status.current}/{status.total} ({status.percentage}%)
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#E5E7EB' }}>
                        현재: {status.currentContent} &gt; {status.currentServer}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <button style={{
                            flex: 1,
                            padding: '0.5rem',
                            background: '#374151',
                            border: 'none',
                            borderRadius: '6px',
                            color: '#E5E7EB',
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                        }}>
                            일시정지
                        </button>
                        <button style={{
                            flex: 1,
                            padding: '0.5rem',
                            background: '#EF4444',
                            border: 'none',
                            borderRadius: '6px',
                            color: 'white',
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                        }}>
                            중단
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#6B7280',
                    fontSize: '0.85rem'
                }}>
                    현재 진행 중인 크롤링이 없습니다
                    <br /><br />
                    <Link href="/admin/crawl" style={{ color: '#FACC15', textDecoration: 'none' }}>
                        크롤링 시작하기 →
                    </Link>
                </div>
            )}
        </div>
    )
}
