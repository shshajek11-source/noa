import { useState, useEffect } from 'react'
import DSCard from '@/app/components/design-system/DSCard'
import DSButton from '@/app/components/design-system/DSButton'
import { useRouter } from 'next/navigation'

interface CompareTarget {
    id: string
    name: string
    server: string
    profileImage: string
}

export default function CompareQuickBar() {
    const [targets, setTargets] = useState<CompareTarget[]>([])
    const [isMinimized, setIsMinimized] = useState(false)
    const router = useRouter()

    useEffect(() => {
        // Load comparison targets from local storage
        const saved = localStorage.getItem('compare_targets')
        if (saved) {
            try {
                setTargets(JSON.parse(saved))
            } catch (e) {
                console.error(e)
            }
        }

        // Listen for custom event to update targets from other components
        const handleUpdate = () => {
            const updated = localStorage.getItem('compare_targets')
            if (updated) setTargets(JSON.parse(updated))
        }

        window.addEventListener('update-compare-targets', handleUpdate)
        return () => window.removeEventListener('update-compare-targets', handleUpdate)
    }, [])

    const removeTarget = (id: string) => {
        const updated = targets.filter(t => t.id !== id)
        setTargets(updated)
        localStorage.setItem('compare_targets', JSON.stringify(updated))
    }

    const handleCompare = () => {
        if (targets.length < 2) return
        const query = targets.map(t => `${t.server}_${t.name}`).join(',')
        router.push(`/compare?targets=${encodeURIComponent(query)}`)
    }

    const clearAll = () => {
        setTargets([])
        localStorage.removeItem('compare_targets')
    }

    if (targets.length === 0) return null

    return (
        <>
            <style>{`
                .compare-bar {
                    position: fixed;
                    bottom: 1rem;
                    right: 1rem;
                    z-index: 100;
                    width: 300px;
                    transition: all 0.3s ease;
                }
                @media (max-width: 768px) {
                    .compare-bar {
                        left: 1rem;
                        right: 1rem;
                        width: auto;
                        bottom: 0.5rem;
                    }
                }
                .compare-bar.minimized {
                    width: auto;
                }
                @media (max-width: 768px) {
                    .compare-bar.minimized {
                        left: auto;
                        right: 1rem;
                        width: auto;
                    }
                }
            `}</style>

            <div className={`compare-bar ${isMinimized ? 'minimized' : ''}`}>
                {isMinimized ? (
                    <button
                        onClick={() => setIsMinimized(false)}
                        style={{
                            background: 'rgba(17, 19, 24, 0.95)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid var(--brand-red-muted)',
                            borderRadius: '50%',
                            width: '48px',
                            height: '48px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                        }}
                    >
                        <span style={{ fontSize: '1.2rem' }}>⚔️</span>
                        <span style={{
                            position: 'absolute',
                            top: '-4px',
                            right: '-4px',
                            background: 'var(--brand-red-main)',
                            color: 'white',
                            fontSize: '0.7rem',
                            fontWeight: 'bold',
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {targets.length}
                        </span>
                    </button>
                ) : (
                    <DSCard style={{
                        padding: '1rem',
                        background: 'rgba(17, 19, 24, 0.95)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid var(--brand-red-muted)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <h3 style={{ fontWeight: 'bold', fontSize: '0.85rem', margin: 0 }}>
                                비교함 ({targets.length}/3)
                            </h3>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={clearAll}
                                    style={{
                                        fontSize: '0.75rem',
                                        color: 'var(--text-secondary)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    비우기
                                </button>
                                <button
                                    onClick={() => setIsMinimized(true)}
                                    style={{
                                        fontSize: '0.9rem',
                                        color: 'var(--text-secondary)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '0 4px'
                                    }}
                                    aria-label="최소화"
                                >
                                    ▼
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
                            {[0, 1, 2].map(idx => {
                                const target = targets[idx]
                                return (
                                    <div key={idx} style={{
                                        flex: 1,
                                        height: '50px',
                                        background: 'rgba(255,255,255,0.05)',
                                        borderRadius: '6px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}>
                                        {target ? (
                                            <>
                                                <img
                                                    src={target.profileImage || '/placeholder-avatar.svg'}
                                                    alt={target.name}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }}
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = '/placeholder-avatar.svg'
                                                    }}
                                                />
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: 0,
                                                    left: 0,
                                                    right: 0,
                                                    background: 'rgba(0,0,0,0.8)',
                                                    fontSize: '0.65rem',
                                                    padding: '2px 4px',
                                                    textAlign: 'center',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }}>
                                                    {target.name}
                                                </div>
                                                <button
                                                    onClick={() => removeTarget(target.id)}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '2px',
                                                        right: '2px',
                                                        background: 'rgba(0,0,0,0.6)',
                                                        color: 'white',
                                                        border: 'none',
                                                        width: '16px',
                                                        height: '16px',
                                                        borderRadius: '50%',
                                                        cursor: 'pointer',
                                                        fontSize: '0.7rem',
                                                        lineHeight: 1,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                    aria-label={`${target.name} 제거`}
                                                >
                                                    ×
                                                </button>
                                            </>
                                        ) : (
                                            <span style={{ color: 'var(--text-disabled)', fontSize: '1.2rem' }}>+</span>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        <DSButton
                            fullWidth
                            variant="primary"
                            disabled={targets.length < 2}
                            onClick={handleCompare}
                            style={{ fontSize: '0.85rem', padding: '0.6rem' }}
                        >
                            비교하기
                        </DSButton>
                    </DSCard>
                )}
            </div>
        </>
    )
}
