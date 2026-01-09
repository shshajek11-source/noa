'use client'

import StreamingSlider from './StreamingSlider'

export default function LiveStreamContainer() {
    return (
        <section style={{
            marginTop: '30px',
            marginBottom: '1.5rem',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 100%)',
            borderRadius: '12px',
            padding: '1rem',
            border: '1px solid rgba(255,255,255,0.05)'
        }}>
            {/* Header */}
            <h2 style={{
                fontSize: '0.9rem',
                fontWeight: 'bold',
                color: '#9CA3AF',
                letterSpacing: '-0.02em',
                margin: 0,
                marginBottom: '0.75rem'
            }}>
                실시간 라이브
            </h2>

            {/* Platform Sliders - Vertical Stack */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}>
                <StreamingSlider platform="chzzk" />
                {/* SOOP 임시 비활성화 */}
                {/* <StreamingSlider platform="soop" /> */}
            </div>
        </section>
    )
}
