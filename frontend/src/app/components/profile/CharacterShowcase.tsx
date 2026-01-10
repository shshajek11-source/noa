'use client'

import { useState, useRef, MouseEvent } from 'react'
import Image from 'next/image'
import styles from './CharacterShowcase.module.css'

interface CharacterShowcaseProps {
    imageUrl?: string
    name: string
    server: string
    rank: number
    combatPower: number
    tierImage: string
    job?: string
    race?: string
    level?: number
    itemLevel?: number
    totalBreakthrough?: number
}

export default function CharacterShowcase({
    imageUrl,
    name,
    server,
    rank,
    combatPower,
    tierImage,
    job,
    race,
    level,
    itemLevel,
    totalBreakthrough
}: CharacterShowcaseProps) {
    const cardRef = useRef<HTMLDivElement>(null)
    const [rotation, setRotation] = useState({ x: 0, y: 0 })
    const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 })

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return

        const card = cardRef.current
        const rect = card.getBoundingClientRect()
        const width = rect.width
        const height = rect.height

        // Calculate mouse position relative to card center
        // 0 to 1
        const mouseX = (e.clientX - rect.left) / width
        const mouseY = (e.clientY - rect.top) / height

        // Calculate rotation (Max +/- 15 degrees)
        const rotateY = (mouseX - 0.5) * 30 // -15 to +15
        const rotateX = (0.5 - mouseY) * 30 // -15 to +15

        setRotation({ x: rotateX, y: rotateY })
        setGlarePosition({ x: mouseX * 100, y: mouseY * 100 })
    }

    const handleMouseLeave = () => {
        // Reset to center smoothly
        setRotation({ x: 0, y: 0 })
        setGlarePosition({ x: 50, y: 50 })
    }

    return (
        <div className={styles.container}>
            <div
                ref={cardRef}
                className={styles.card}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{
                    transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`
                }}
            >
                {/* Dynamic Glare Overlay */}
                <div
                    className={styles.glare}
                    style={{
                        backgroundPosition: `${glarePosition.x}% ${glarePosition.y}%`
                    }}
                />

                <div className={styles.cardInner}>
                    {/* Depth Layer 1: Background Atmosphere */}
                    <div className={styles.bgLayer} />

                    {/* Depth Layer 2: Particles */}
                    <div className={styles.particles} />

                    {/* Depth Layer 3: Character Image (Popped Out) */}
                    <div className={styles.characterLayer}>
                        {imageUrl ? (
                            <img
                                src={imageUrl}
                                alt={name}
                                className={styles.characterImage}
                            />
                        ) : (
                            <div style={{
                                width: '100%', height: '100%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '4rem', color: 'rgba(255,255,255,0.1)'
                            }}>
                                ?
                            </div>
                        )}
                    </div>

                    {/* Depth Layer 4: Info Card */}
                    <div className={styles.infoLayer}>
                        {/* 캐릭터 이름 */}
                        <h2 className={styles.name}>{name}</h2>

                        {/* Lv · 직업 · 종족 */}
                        <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '8px' }}>
                            Lv.{level || 0} · {job || '직업'} · {race || '종족'}
                        </div>

                        {/* 아이템 레벨 */}
                        <div style={{
                            fontSize: '0.7rem',
                            color: '#6B7280',
                            marginBottom: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                        }}>
                            <span>아이템 레벨</span>
                            <span style={{ color: '#E5E7EB', fontWeight: '600' }}>
                                {itemLevel?.toLocaleString() || 0}
                            </span>
                        </div>

                        {/* HITON 전투력 + 돌파총합 (2열 그리드) */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '8px',
                            width: '100%'
                        }}>
                            {/* HITON 전투력 */}
                            <div style={{
                                background: 'rgba(250, 204, 21, 0.1)',
                                border: '1px solid rgba(250, 204, 21, 0.3)',
                                borderRadius: '8px',
                                padding: '10px 8px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '0.65rem', color: '#9CA3AF', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    HITON 전투력
                                </div>
                                <div style={{
                                    fontSize: '1.3rem',
                                    fontWeight: 'bold',
                                    color: '#FACC15',
                                    textShadow: '0 0 10px rgba(250, 204, 21, 0.5)'
                                }}>
                                    {combatPower?.toLocaleString() || 0}
                                </div>
                            </div>

                            {/* 돌파 총합 */}
                            <div style={{
                                background: 'rgba(59, 130, 246, 0.1)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                borderRadius: '8px',
                                padding: '10px 8px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '0.65rem', color: '#9CA3AF', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    돌파 총합
                                </div>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}>
                                    {/* 파란 마름모 */}
                                    <div style={{
                                        width: '14px',
                                        height: '14px',
                                        transform: 'rotate(45deg)',
                                        background: 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 40%, #2563EB 60%, #1D4ED8 100%)',
                                        border: '1px solid #93C5FD',
                                        borderRadius: '2px',
                                        boxShadow: '0 0 6px rgba(59, 130, 246, 0.8)'
                                    }} />
                                    <span style={{
                                        fontSize: '1.3rem',
                                        fontWeight: 'bold',
                                        color: '#3B82F6',
                                        textShadow: '0 0 10px rgba(59, 130, 246, 0.5)'
                                    }}>
                                        {totalBreakthrough || 0}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
