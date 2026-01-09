'use client'

import React from 'react'
import SearchBar from '../SearchBar'

export default function HeroSection() {
    return (
        <section className="hero-section-enhanced">
            <div className="hero-background">
                {/* Background is handled by CSS with gradient and potential particles */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'radial-gradient(circle at 50% 30%, rgba(217, 43, 75, 0.08) 0%, transparent 70%)',
                    zIndex: 0
                }}></div>
            </div>

            <div className="hero-content">
                <h1 className="hero-title">
                    AION2 캐릭터 분석의 <span className="highlight">새로운 기준</span>
                </h1>

                <p className="hero-subtitle">
                    실시간 랭킹, 상세 장비 분석, 그리고 완벽한 대바니온 세팅까지.<br />
                    당신의 캐릭터를 가장 정확하게 분석하세요.
                </p>

                <div
                    style={{
                        margin: '0 auto 2rem',
                        maxWidth: '800px',
                        position: 'relative',
                        zIndex: 20
                    }}
                >
                    <SearchBar />
                </div>

                {/* GND Style Banner */}
                <div style={{
                    width: '100%',
                    maxWidth: '728px',
                    height: '90px',
                    margin: '0 auto',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    position: 'relative',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer'
                }}>
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: 'url(https://allthatai.s3.ap-northeast-2.amazonaws.com/image/8/634ce482adc58398d49107_1767184849.jpg) center/cover no-repeat',
                        transition: 'transform 0.5s'
                    }} className="banner-bg" />

                    {/* Optional Overlay for text readability if needed, but keeping it clean for ad style */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(to right, rgba(0,0,0,0.2), transparent)',
                        pointerEvents: 'none'
                    }} />

                    <style>{`
                        .banner-bg:hover { transform: scale(1.02); }
                    `}</style>
                </div>

            </div>
        </section>
    )
}
