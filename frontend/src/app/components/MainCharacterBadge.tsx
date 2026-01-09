'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Star, X, Plus } from 'lucide-react'
import { MainCharacter, MAIN_CHARACTER_KEY } from './SearchBar'
import MainCharacterModal from './MainCharacterModal'

export default function MainCharacterBadge() {
    const router = useRouter()
    const [mainCharacter, setMainCharacter] = useState<MainCharacter | null>(null)
    const [isHovered, setIsHovered] = useState(false)
    const [isLoaded, setIsLoaded] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)

    // localStorage에서 대표 캐릭터 불러오기
    useEffect(() => {
        const loadMainCharacter = () => {
            try {
                const saved = localStorage.getItem(MAIN_CHARACTER_KEY)
                if (saved) {
                    setMainCharacter(JSON.parse(saved))
                } else {
                    setMainCharacter(null)
                }
            } catch (e) {
                console.error('Failed to load main character', e)
            }
            setIsLoaded(true)
        }

        loadMainCharacter()

        // storage 이벤트 리스너 (다른 탭에서 변경 시)
        window.addEventListener('storage', loadMainCharacter)

        // custom event 리스너 (같은 탭에서 변경 시)
        window.addEventListener('mainCharacterChanged', loadMainCharacter)

        return () => {
            window.removeEventListener('storage', loadMainCharacter)
            window.removeEventListener('mainCharacterChanged', loadMainCharacter)
        }
    }, [])

    // 대표 캐릭터 클릭 - 상세 페이지로 이동
    const handleClick = () => {
        if (!mainCharacter) return
        const raceStr = (mainCharacter.race || '').toLowerCase()
        const raceVal = raceStr.includes('asmo') || raceStr.includes('마족') ? 'asmodian' : 'elyos'
        router.push(`/c/${encodeURIComponent(mainCharacter.server)}/${encodeURIComponent(mainCharacter.name)}?race=${raceVal}`)
    }

    // 대표 캐릭터 해제
    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation()
        try {
            localStorage.removeItem(MAIN_CHARACTER_KEY)
            setMainCharacter(null)
            window.dispatchEvent(new Event('mainCharacterChanged'))
        } catch (e) {
            console.error('Failed to remove main character', e)
        }
    }

    // 대표캐릭터 추가 버튼 클릭 - 모달 열기
    const handleAddClick = () => {
        setIsModalOpen(true)
    }

    // 로딩 전에는 아무것도 표시하지 않음
    if (!isLoaded) return null

    // 대표 캐릭터가 없을 때 - 추가 버튼 표시
    if (!mainCharacter) {
        return (
            <div style={{ position: 'relative', marginLeft: 'auto' }}>
                <button
                    onClick={handleAddClick}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.35rem 0.75rem',
                        background: 'transparent',
                        border: '1px dashed rgba(250, 204, 21, 0.4)',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        color: 'rgba(250, 204, 21, 0.7)'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(250, 204, 21, 0.1)'
                        e.currentTarget.style.borderColor = 'rgba(250, 204, 21, 0.6)'
                        e.currentTarget.style.color = '#FACC15'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.borderColor = 'rgba(250, 204, 21, 0.4)'
                        e.currentTarget.style.color = 'rgba(250, 204, 21, 0.7)'
                    }}
                >
                    <Plus size={14} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>
                        대표캐릭터
                    </span>
                </button>

                <MainCharacterModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                />
            </div>
        )
    }

    // 대표 캐릭터가 있을 때 - 배지 표시
    return (
        <div
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.35rem 0.6rem',
                background: isHovered ? 'rgba(250, 204, 21, 0.15)' : 'rgba(250, 204, 21, 0.1)',
                border: '1px solid rgba(250, 204, 21, 0.3)',
                borderRadius: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginLeft: 'auto'
            }}
        >
            {/* 프로필 이미지 */}
            <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                overflow: 'hidden',
                background: '#374151',
                flexShrink: 0
            }}>
                {mainCharacter.imageUrl ? (
                    <img
                        src={mainCharacter.imageUrl}
                        alt={mainCharacter.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : (
                    <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        color: '#9ca3af'
                    }}>
                        {mainCharacter.name.charAt(0)}
                    </div>
                )}
            </div>

            {/* 캐릭터 정보 */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                }}>
                    <Star size={10} fill="#FACC15" color="#FACC15" />
                    <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#FACC15'
                    }}>
                        {mainCharacter.name}
                    </span>
                </div>
                <span style={{
                    fontSize: '0.55rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.2
                }}>
                    {mainCharacter.server}
                    {mainCharacter.className && ` · ${mainCharacter.className}`}
                    {(mainCharacter.item_level || mainCharacter.hit_score) && ' · '}
                    {mainCharacter.item_level ? `IL ${mainCharacter.item_level}` : ''}
                    {mainCharacter.item_level && mainCharacter.hit_score ? ' · ' : ''}
                    {mainCharacter.hit_score ? (
                        <span style={{ color: 'var(--brand-red-main, #D92B4B)', fontWeight: 600 }}>
                            {mainCharacter.hit_score.toLocaleString()}
                        </span>
                    ) : ''}
                </span>
            </div>

            {/* X 버튼 (호버 시 표시) */}
            {isHovered && (
                <button
                    onClick={handleRemove}
                    style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: 'rgba(239, 68, 68, 0.8)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                        marginLeft: '0.25rem'
                    }}
                >
                    <X size={10} color="white" />
                </button>
            )}
        </div>
    )
}
