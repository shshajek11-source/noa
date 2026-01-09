'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

interface QuickNavButtonProps {
    href: string
    label: string
    icon?: string
    variant?: 'primary' | 'secondary'
}

export default function QuickNavButton({ href, label, icon, variant = 'primary' }: QuickNavButtonProps) {
    const router = useRouter()

    const isPrimary = variant === 'primary'

    return (
        <button
            onClick={() => router.push(href)}
            className={`quick-nav-btn ${isPrimary ? 'primary' : 'secondary'}`}
        >
            <span className="icon-wrapper">{icon}</span>
            <span className="label text-shadow">{label}</span>

            <style jsx>{`
                .quick-nav-btn {
                    position: relative;
                    display: flex;
                    alignItems: center;
                    gap: 0.75rem;
                    padding: 1rem 2rem;
                    border-radius: 16px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    overflow: hidden;
                    backdrop-filter: blur(10px);
                }

                .quick-nav-btn.primary {
                    /* Brand Red: #D92B4B -> 217, 43, 75 */
                    background: linear-gradient(135deg, rgba(217, 43, 75, 0.4) 0%, rgba(217, 43, 75, 0.1) 100%);
                    border: 1px solid rgba(217, 43, 75, 0.3);
                    box-shadow: 0 4px 20px rgba(217, 43, 75, 0.2);
                }

                .quick-nav-btn.secondary {
                    /* Brand Gold: #F59E0B -> 245, 158, 11 */
                    background: linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0.05) 100%);
                    border: 1px solid rgba(245, 158, 11, 0.2);
                    box-shadow: 0 4px 20px rgba(245, 158, 11, 0.15);
                }

                .quick-nav-btn:hover {
                    transform: translateY(-2px);
                }

                .quick-nav-btn.primary:hover {
                    background: linear-gradient(135deg, rgba(217, 43, 75, 0.5) 0%, rgba(217, 43, 75, 0.2) 100%);
                    border-color: rgba(217, 43, 75, 0.6);
                    box-shadow: 0 8px 30px rgba(217, 43, 75, 0.35);
                }

                .quick-nav-btn.secondary:hover {
                    background: linear-gradient(135deg, rgba(245, 158, 11, 0.3) 0%, rgba(245, 158, 11, 0.1) 100%);
                    border-color: rgba(245, 158, 11, 0.5);
                    box-shadow: 0 8px 30px rgba(245, 158, 11, 0.25);
                }

                .icon-wrapper {
                    font-size: 1.25rem;
                    filter: drop-shadow(0 0 8px rgba(255,255,255,0.4));
                }

                .label {
                    font-size: 1.05rem;
                    font-weight: 700;
                    color: white;
                    letter-spacing: -0.01em;
                }

                .quick-nav-btn.secondary .label {
                    color: #FCD34D; /* Light Gold text for better contrast */
                }

                /* Inner Shine Effect */
                .quick-nav-btn::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 50%;
                    height: 100%;
                    background: linear-gradient(
                        90deg,
                        transparent,
                        rgba(255, 255, 255, 0.2),
                        transparent
                    );
                    transition: 0.5s;
                    transform: skewX(-20deg);
                }

                .quick-nav-btn:hover::before {
                    left: 150%;
                    transition: 0.7s;
                }
            `}</style>
        </button>
    )
}
