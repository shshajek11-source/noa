'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { Star, X, Plus } from 'lucide-react'
import { MainCharacter, MAIN_CHARACTER_KEY } from './SearchBar'
import { useAuth } from '@/context/AuthContext'
import styles from './shared/HeaderButtons.module.css'

// 모달 지연 로딩 (클릭 시에만 로드)
const MainCharacterModal = dynamic(() => import('@/components/MainCharacterModal'), { ssr: false })

export default function MainCharacterBadge() {
    const router = useRouter()
    const { user, mainCharacter: authMainCharacter, setMainCharacter: authSetMainCharacter } = useAuth()
    const [localMainCharacter, setLocalMainCharacter] = useState<MainCharacter | null>(null)
    const [isHovered, setIsHovered] = useState(false)
    const [isLoaded, setIsLoaded] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)

    // 인증 상태에 따라 적절한 캐릭터 데이터 선택
    const mainCharacter = user ? authMainCharacter : localMainCharacter

    // localStorage에서 대표 캐릭터 불러오기 (비로그인 사용자용)
    useEffect(() => {
        if (user) {
            // 로그인 사용자는 AuthContext에서 관리
            setIsLoaded(true)
            return
        }

        const loadMainCharacter = () => {
            try {
                const saved = localStorage.getItem(MAIN_CHARACTER_KEY)
                if (saved) {
                    setLocalMainCharacter(JSON.parse(saved))
                } else {
                    setLocalMainCharacter(null)
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
    }, [user])

    // 대표 캐릭터 클릭 - 상세 페이지로 이동
    const handleClick = () => {
        if (!mainCharacter) return
        const raceStr = (mainCharacter.race || '').toLowerCase()
        const raceVal = raceStr.includes('asmo') || raceStr.includes('마족') ? 'asmodian' : 'elyos'
        router.push(`/c/${encodeURIComponent(mainCharacter.server)}/${encodeURIComponent(mainCharacter.name)}?race=${raceVal}`)
    }

    // 대표 캐릭터 해제
    const handleRemove = async (e: React.MouseEvent) => {
        e.stopPropagation()
        try {
            if (user) {
                // 로그인 사용자: 데이터베이스에서 삭제
                await authSetMainCharacter(null)
            } else {
                // 비로그인 사용자: localStorage에서 삭제
                localStorage.removeItem(MAIN_CHARACTER_KEY)
                setLocalMainCharacter(null)
                window.dispatchEvent(new Event('mainCharacterChanged'))
            }
        } catch (e) {
            console.error('Failed to remove main character', e)
        }
    }

    // 대표캐릭터 추가 버튼 클릭 - 로그인 상태에 따라 처리
    const handleAddClick = () => {
        if (!user) {
            // 비로그인 사용자: 로그인 요구
            alert('대표 캐릭터를 설정하려면 로그인이 필요합니다.')
            return
        }
        setIsModalOpen(true)
    }

    // 캐릭터 선택 핸들러
    const handleCharacterSelect = async (character: MainCharacter) => {
        try {
            console.log('[MainCharacterBadge] Selecting character:', character)
            if (user) {
                // 로그인 사용자: 데이터베이스에 저장
                await authSetMainCharacter({
                    characterId: character.characterId,
                    server: character.server,
                    name: character.name,
                    className: character.className || '',
                    level: character.level || 0,
                    race: character.race,
                    item_level: character.item_level,
                    hit_score: character.hit_score,
                    imageUrl: character.imageUrl
                })
            } else {
                // 비로그인 사용자: localStorage에 저장
                localStorage.setItem(MAIN_CHARACTER_KEY, JSON.stringify(character))
                setLocalMainCharacter(character)
                window.dispatchEvent(new Event('mainCharacterChanged'))
            }
            setIsModalOpen(false)
        } catch (e: any) {
            console.error('Failed to set main character', e)
            const errorMessage = e.message || '대표 캐릭터 설정에 실패했습니다.'
            alert(errorMessage)
        }
    }

    // 로딩 전에는 아무것도 표시하지 않음
    if (!isLoaded) return null

    // 대표 캐릭터가 없을 때 - 추가 버튼 표시
    if (!mainCharacter) {
        return (
            <div style={{ position: 'relative', marginLeft: 'auto' }}>
                <button
                    onClick={handleAddClick}
                    className={styles.mainCharButton}
                >
                    <Plus size={14} />
                    <span>대표캐릭터</span>
                </button>

                <MainCharacterModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSelect={handleCharacterSelect}
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
            className={styles.mainCharBadge}
        >
            {/* 프로필 이미지 */}
            <div className={styles.avatarWrapper}>
                {mainCharacter.imageUrl ? (
                    <img
                        src={mainCharacter.imageUrl}
                        alt={mainCharacter.name}
                        className={styles.avatar}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-700 text-xs text-gray-400">
                        {mainCharacter.name.charAt(0)}
                    </div>
                )}
            </div>

            {/* 캐릭터 정보 */}
            <div className="flex flex-col">
                <div className={styles.mainCharName}>
                    <Star size={10} className="fill-current text-primary" />
                    <span>{mainCharacter.name}</span>
                </div>
                <span className={styles.mainCharInfo}>
                    {mainCharacter.server}
                    {mainCharacter.race && ` · ${mainCharacter.race.toLowerCase() === 'elyos' ? '천족' : mainCharacter.race.toLowerCase() === 'asmodian' ? '마족' : mainCharacter.race}`}
                    {mainCharacter.className && ` · ${mainCharacter.className}`}
                    {mainCharacter.item_level && mainCharacter.item_level > 0 && ` · IL ${mainCharacter.item_level}`}
                    {/* PVE/PVP 전투력 */}
                    {(mainCharacter.pve_score || mainCharacter.hit_score) && (
                        <>
                            {' · '}
                            <span style={{ color: '#4ade80', fontWeight: 600 }}>
                                E {(mainCharacter.pve_score || mainCharacter.hit_score || 0).toLocaleString()}
                            </span>
                        </>
                    )}
                    {mainCharacter.pvp_score && mainCharacter.pvp_score > 0 && (
                        <>
                            {' '}
                            <span style={{ color: '#f87171', fontWeight: 600 }}>
                                P {mainCharacter.pvp_score.toLocaleString()}
                            </span>
                        </>
                    )}
                </span>
            </div>

            {/* X 버튼 (호버 시 표시) */}
            {isHovered && (
                <button
                    onClick={handleRemove}
                    className="w-4 h-4 rounded-full bg-red-500/80 flex items-center justify-center border-none cursor-pointer ml-1 p-0 hover:bg-red-500"
                >
                    <X size={10} color="white" />
                </button>
            )}
        </div>
    )
}
